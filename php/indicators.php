<?php
/**
 * indicators.php — GRC Indicators API (read-only, aggregated KPIs / KRIs of every analysis).
 *
 *   GET indicators.php?days=30                     JSON (days: 7, 30, 90, 365 or "all"; default 30)
 *   GET indicators.php?days=90&format=csv&table=summary|daily|controls|scenarios
 *
 * Public responses carry aggregates only (no incident text, no IPs) and may be read cross-origin
 * by dashboards (Power BI, Grafana, Excel, scripts). With the METRICS_TOKEN from the config —
 * header "Authorization: Bearer <token>" or "X-API-Key: <token>" — the response also includes
 * the operational block (token usage, prompt-cache hit ratio, per-model counts).
 */

declare(strict_types=1);

require_once __DIR__ . '/_metrics-lib.php';

header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function ratio(float $part, float $whole, int $digits = 4): ?float
{
    return $whole > 0 ? round($part / $whole, $digits) : null;
}

/** Ranked [{key, count, share}] from a key => count map. */
function ranked(array $counts, int $total, ?int $limit = null): array
{
    arsort($counts);
    $out = [];
    foreach ($counts as $k => $n) {
        $out[] = ['key' => (string) $k, 'count' => (int) $n, 'share' => ratio($n, $total)];
    }
    return $limit ? array_slice($out, 0, $limit) : $out;
}

/** Fixed-order distribution (every key present, even at 0). */
function distribution(array $keys, array $counts, int $total): array
{
    $out = [];
    foreach ($keys as $k) {
        $n = (int) ($counts[$k] ?? 0);
        $out[] = ['key' => $k, 'count' => $n, 'share' => ratio($n, $total)];
    }
    return $out;
}

function family(string $framework, string $id): ?string
{
    if ($framework === 'iso_27001_2022' && preg_match('/^A\.([5-8])\./', $id, $m)) {
        return ['5' => 'A.5 Organizational', '6' => 'A.6 People', '7' => 'A.7 Physical', '8' => 'A.8 Technological'][$m[1]];
    }
    if ($framework === 'nist_csf_2' && preg_match('/^(GV|ID|PR|DE|RS|RC)\b/', $id, $m)) {
        return [
            'GV' => 'GV Govern', 'ID' => 'ID Identify', 'PR' => 'PR Protect',
            'DE' => 'DE Detect', 'RS' => 'RS Respond', 'RC' => 'RC Recover',
        ][$m[1]];
    }
    if ($framework === 'soc_2' && preg_match('/^(CC\d|PI|A|C|P)\d*\./', $id, $m)) {
        return $m[1] . ' ' . [
            'CC1' => 'Control environment', 'CC2' => 'Communication & information', 'CC3' => 'Risk assessment',
            'CC4' => 'Monitoring activities', 'CC5' => 'Control activities', 'CC6' => 'Logical & physical access',
            'CC7' => 'System operations', 'CC8' => 'Change management', 'CC9' => 'Risk mitigation',
            'A' => 'Availability', 'C' => 'Confidentiality', 'PI' => 'Processing integrity', 'P' => 'Privacy',
        ][$m[1]];
    }
    return null;
}

/**
 * Key Risk Indicators with risk-appetite tolerances: green within appetite, amber within
 * tolerance, red beyond it. "higher" = higher is better.
 */
const KRI_DEFINITIONS = [
    'KRI-01' => ['Grounding rate', 'Share of analyses whose every cited control ID exists in the official catalogs', 'ratio', 'higher', 0.95, 0.85],
    'KRI-02' => ['Unverified citation rate', 'Cited control IDs not found in any catalog (hallucination risk)', 'ratio', 'lower', 0.02, 0.05],
    'KRI-03' => ['AI availability', 'AI analyses completed out of AI attempts (rest fell back to the demo engine)', 'ratio', 'higher', 0.95, 0.80],
    'KRI-04' => ['AI latency p95', '95th-percentile time to a grounded AI answer', 'ms', 'lower', 30000, 60000],
    'KRI-05' => ['Capacity pressure', 'AI attempts refused by the credit-protection rate limits', 'ratio', 'lower', 0.05, 0.15],
    'KRI-06' => ['High / Critical exposure', 'Share of analysed incidents rated High or Critical', 'ratio', 'lower', 0.40, 0.60],
    'KRI-07' => ['Breach-notification triggers', 'Share of incidents that trigger a statutory notification (GDPR 33/34, CCPA, HIPAA)', 'ratio', 'lower', 0.25, 0.40],
    'KRI-08' => ['Control-catalog coverage', 'Distinct official controls exercised at least once across the 8 frameworks', 'ratio', 'higher', 0.30, 0.15],
];

function kri_scorecard(array $values): array
{
    $out = [];
    foreach (KRI_DEFINITIONS as $id => [$name, $desc, $unit, $dir, $appetite, $tolerance]) {
        $v = $values[$id] ?? null;
        if ($v === null) {
            $status = 'no_data';
        } elseif ($dir === 'higher') {
            $status = $v >= $appetite ? 'green' : ($v >= $tolerance ? 'amber' : 'red');
        } else {
            $status = $v <= $appetite ? 'green' : ($v <= $tolerance ? 'amber' : 'red');
        }
        $out[] = ['id' => $id, 'name' => $name, 'description' => $desc, 'value' => $v, 'unit' => $unit,
            'better' => $dir, 'appetite' => $appetite, 'tolerance' => $tolerance, 'status' => $status];
    }
    return $out;
}

/** Every indicator for the window starting at $from (unix time; 0 = all history). */
function compute(PDO $db, int $from, string $catalogDir, bool $private): array
{
    $catalogs = grc_catalogs($catalogDir);
    $names = [];
    foreach ($catalogs as $key => $c) {
        foreach ($c['entries'] as [$id, $name]) {
            $names[$key][$id] = $name;
        }
    }

    // Everything is aggregated in SQL: memory use does not grow with the number of analyses.
    $fromDay = gmdate('Y-m-d', $from);
    $q = static function (string $sql, array $args = []) use ($db, $fromDay): array {
        $st = $db->prepare($sql);
        $st->execute(array_merge([$fromDay], $args));
        return $st->fetchAll(PDO::FETCH_ASSOC);
    };
    $pairs = static fn(array $rows): array => array_column($rows, 'n', 'k');

    $agg = $q("SELECT COUNT(*) AS total, SUM(source = 'llm') AS llm,
        SUM(severity IN ('High', 'Critical')) AS high, SUM(cited) AS cited, SUM(verified) AS verified,
        SUM(unverified) AS unverified, SUM(grounded) AS grounded, SUM(ai_involved) AS ai,
        SUM(breach_notice) AS breach, SUM(fallback) AS fallback,
        SUM(evidence_items) AS evidence, COUNT(evidence_items) AS evidence_n,
        SUM(input_chars) AS chars, COUNT(input_chars) AS chars_n,
        SUM(CASE WHEN source = 'llm' THEN in_tokens END) AS tin, SUM(CASE WHEN source = 'llm' THEN out_tokens END) AS tout,
        SUM(CASE WHEN source = 'llm' THEN cache_read END) AS cr, SUM(CASE WHEN source = 'llm' THEN cache_write END) AS cw,
        MIN(day) AS first_day
        FROM analyses WHERE day >= ?")[0];
    $sum = array_map(static fn($v) => is_numeric($v) ? (int) $v : ($v ?? 0), $agg); // SUM() of no rows is NULL
    $total = $sum['total'];

    $by = [];
    foreach (['severity', 'category', 'strategy', 'scenario', 'model'] as $f) { // fixed column names
        $by[$f] = $pairs($q("SELECT $f AS k, COUNT(*) AS n FROM analyses
            WHERE day >= ? AND $f IS NOT NULL AND $f <> '' GROUP BY $f"));
    }
    $sevByCat = [];
    foreach ($q("SELECT category, severity, COUNT(*) AS n FROM analyses
        WHERE day >= ? AND category IS NOT NULL AND severity IS NOT NULL GROUP BY category, severity") as $r) {
        $sevByCat[$r['category']][$r['severity']] = (int) $r['n'];
    }
    $daily = [];
    foreach ($q("SELECT day, COUNT(*) AS total, SUM(source = 'llm') AS ai, SUM(source <> 'llm') AS demo,
        SUM(severity IN ('High', 'Critical')) AS high_critical FROM analyses WHERE day >= ? GROUP BY day") as $r) {
        $daily[$r['day']] = ['total' => (int) $r['total'], 'ai' => (int) $r['ai'], 'demo' => (int) $r['demo'],
            'high_critical' => (int) $r['high_critical']];
    }

    // Latency percentiles of AI analyses, read with OFFSET (no full list in memory).
    $latencyN = (int) $q("SELECT COUNT(*) AS n FROM analyses WHERE day >= ? AND source = 'llm' AND latency_ms IS NOT NULL")[0]['n'];
    $pct = static function (float $p) use ($q, $latencyN): ?int {
        if ($latencyN === 0) {
            return null;
        }
        $k = min($latencyN - 1, (int) floor($p * ($latencyN - 1) + 0.5));
        $r = $q("SELECT latency_ms FROM analyses WHERE day >= ? AND source = 'llm' AND latency_ms IS NOT NULL
            ORDER BY latency_ms LIMIT 1 OFFSET $k");
        return $r ? (int) $r[0]['latency_ms'] : null;
    };
    $latencyAvg = $q("SELECT AVG(latency_ms) AS a FROM analyses WHERE day >= ? AND source = 'llm'")[0]['a'];

    $citations = $q('SELECT framework, control_id, SUM(n) AS n FROM citations_daily WHERE day >= ? GROUP BY framework, control_id');
    $applicability = [];
    foreach ($q('SELECT framework, SUM(yes) AS yes, SUM(n) AS n FROM applicability_daily WHERE day >= ? GROUP BY framework') as $r) {
        $applicability[$r['framework']] = [(int) $r['yes'], (int) $r['n']];
    }
    $counters = array_map('intval', $pairs($q('SELECT k, SUM(n) AS n FROM daily_counters WHERE day >= ? GROUP BY k')));
    $limitedByDay = array_map('intval', array_column($q("SELECT day, SUM(n) AS n FROM daily_counters
        WHERE day >= ? AND k LIKE 'llm_rate_limited%' GROUP BY day"), 'n', 'day'));

    // Daily series with every day of the window present (0 when idle).
    $series = [];
    $firstDay = $from > 0 ? $fromDay : ($sum['first_day'] ?: gmdate('Y-m-d'));
    for ($t = strtotime($firstDay . ' 00:00:00 UTC'), $end = time(); $t <= $end; $t += 86400) {
        $d = gmdate('Y-m-d', $t);
        $series[] = ['day' => $d] + ($daily[$d] ?? ['total' => 0, 'ai' => 0, 'demo' => 0, 'high_critical' => 0])
            + ['ai_rate_limited' => $limitedByDay[$d] ?? 0];
    }
    $activeDays = count($daily);

    // ---- per-framework indicators ----
    $frameworks = [];
    $families = ['iso_themes' => [], 'nist_functions' => [], 'soc2_series' => []];
    $famKey = ['iso_27001_2022' => 'iso_themes', 'nist_csf_2' => 'nist_functions', 'soc_2' => 'soc2_series'];
    $controlRows = [];
    foreach (GRC_FRAMEWORKS as $key => [$label]) {
        $verifiedCounts = [];
        $unverified = 0;
        foreach ($citations as $c) {
            if ($c['framework'] !== $key) {
                continue;
            }
            if ($c['control_id'] !== '(unverified)') {
                $verifiedCounts[$c['control_id']] = (int) $c['n'];
                $fam = family($key, $c['control_id']);
                if ($fam && isset($famKey[$key])) {
                    $families[$famKey[$key]][$fam] = ($families[$famKey[$key]][$fam] ?? 0) + (int) $c['n'];
                }
            } else {
                $unverified += (int) $c['n'];
            }
        }
        [$yes, $n] = $applicability[$key] ?? [0, 0];
        $catalogSize = count($catalogs[$key]['entries']);
        $distinct = 0;
        foreach (array_keys($verifiedCounts) as $id) {
            if (isset($names[$key][$id])) {
                $distinct++; // parents such as "PR.AA" are not catalog entries: not counted as coverage
            }
        }
        $citationsTotal = array_sum($verifiedCounts);
        $top = [];
        foreach (ranked($verifiedCounts, max(1, $yes), 10) as $t) {
            $top[] = ['id' => $t['key'], 'name' => $names[$key][$t['key']] ?? '', 'count' => $t['count'],
                'share_of_applicable' => $t['share']];
        }
        foreach ($verifiedCounts as $id => $cnt) {
            $controlRows[] = [$key, $id, $names[$key][$id] ?? '', $cnt];
        }
        $frameworks[] = [
            'key'                     => $key,
            'label'                   => $label,
            'catalog_size'            => $catalogSize,
            'applicable_analyses'     => $yes,
            'applicability_rate'      => ratio($yes, $n),
            'citations'               => $citationsTotal,
            'unverified_citations'    => $unverified,
            'avg_citations_when_applicable' => $yes ? round($citationsTotal / $yes, 2) : null,
            'distinct_controls_cited' => $distinct,
            'catalog_coverage'        => ratio($distinct, $catalogSize),
            'never_cited'             => max(0, $catalogSize - $distinct),
            'top_controls'            => $top,
        ];
    }
    $catalogTotal = array_sum(array_column($frameworks, 'catalog_size'));
    $distinctTotal = array_sum(array_column($frameworks, 'distinct_controls_cited'));

    $llmFailures = 0;
    $failures = [];
    foreach ($counters as $k => $n) {
        if (strncmp($k, 'llm_', 4) === 0) {
            $failures[substr($k, 4)] = $n;
            if ($k !== 'llm_input_error') {
                $llmFailures += $n;
            }
        }
    }
    $aiAttempts = $sum['llm'] + $llmFailures;
    $scenarioRuns = $total - (int) ($by['scenario']['custom'] ?? 0);

    $out = [
        'kpis' => [
            'analyses'                 => $total,
            'ai_analyses'              => $sum['llm'],
            'demo_analyses'            => $total - $sum['llm'],
            'ai_share'                 => ratio($sum['llm'], $total),
            'custom_incident_share'    => ratio((int) ($by['scenario']['custom'] ?? 0), $total),
            'high_critical_rate'       => ratio($sum['high'], $total),
            'grounded_rate'            => ratio($sum['grounded'], $total),
            'unverified_citation_rate' => ratio($sum['unverified'], $sum['cited']),
            'avg_controls_per_analysis' => $total ? round($sum['verified'] / $total, 2) : null,
            'catalog_coverage'         => ratio($distinctTotal, $catalogTotal),
            'breach_notification_rate' => ratio($sum['breach'], $total),
            'ai_system_involvement_rate' => ratio($sum['ai'], $total),
            'avg_evidence_items'       => $sum['evidence_n'] ? round($sum['evidence'] / $sum['evidence_n'], 2) : null,
            'active_days'              => $activeDays,
            'avg_analyses_per_active_day' => $activeDays ? round($total / $activeDays, 2) : null,
        ],
        'daily' => $series,
        'risk' => [
            'severity'              => distribution(GRC_SEVERITIES, $by['severity'], $total),
            'failure_category'      => ranked($by['category'], $total),
            'risk_strategy'         => distribution(GRC_STRATEGIES, $by['strategy'], $total),
            'severity_by_category'  => $sevByCat,
        ],
        'frameworks' => $frameworks,
        'control_families' => [
            'iso_themes'     => ranked($families['iso_themes'], max(1, array_sum($families['iso_themes']))),
            'nist_functions' => ranked($families['nist_functions'], max(1, array_sum($families['nist_functions']))),
            'soc2_series'    => ranked($families['soc2_series'], max(1, array_sum($families['soc2_series']))),
        ],
        'scenarios' => [
            'scenario_runs'      => $scenarioRuns,
            'custom_incidents'   => (int) ($by['scenario']['custom'] ?? 0),
            'distinct_scenarios' => count($by['scenario']) - (isset($by['scenario']['custom']) ? 1 : 0),
            'top'                => ranked(array_diff_key($by['scenario'], ['custom' => 0]), max(1, $scenarioRuns), 25),
        ],
        'operations' => [
            'ai_attempts'          => $aiAttempts,
            'ai_success_rate'      => ratio($sum['llm'], $aiAttempts),
            'demo_fallbacks'       => $sum['fallback'],
            'ai_not_completed'     => $failures,
            'latency_ms'           => [
                'p50' => $pct(0.5),
                'p95' => $pct(0.95),
                'avg' => $latencyAvg === null ? null : (int) round((float) $latencyAvg),
            ],
            'avg_input_chars'      => $sum['chars_n'] ? (int) round($sum['chars'] / $sum['chars_n']) : null,
        ],
    ];
    $limited = (int) ($failures['rate_limited_ip'] ?? 0) + (int) ($failures['rate_limited_daily'] ?? 0);
    $out['kri'] = kri_scorecard([
        'KRI-01' => $out['kpis']['grounded_rate'],
        'KRI-02' => $out['kpis']['unverified_citation_rate'],
        'KRI-03' => $out['operations']['ai_success_rate'],
        'KRI-04' => $out['operations']['latency_ms']['p95'],
        'KRI-05' => ratio($limited, $aiAttempts),
        'KRI-06' => $out['kpis']['high_critical_rate'],
        'KRI-07' => $out['kpis']['breach_notification_rate'],
        'KRI-08' => $out['kpis']['catalog_coverage'],
    ]);
    if ($private) {
        $inputSide = $sum['tin'] + $sum['cr'] + $sum['cw'];
        $out['operations']['usage'] = [
            'input_tokens'       => $sum['tin'],
            'output_tokens'      => $sum['tout'],
            'cache_read_tokens'  => $sum['cr'],
            'cache_write_tokens' => $sum['cw'],
            'cache_hit_ratio'    => ratio($sum['cr'], $inputSide),
            'avg_output_tokens'  => $sum['llm'] ? (int) round($sum['tout'] / $sum['llm']) : null,
            'by_model'           => ranked($by['model'], max(1, $sum['llm'])),
        ];
    }
    $out['_controls'] = $controlRows; // CSV "controls" table only
    return $out;
}

/** Scalar leaves as dotted paths (CSV summary table). */
function flatten(array $a, string $prefix = ''): array
{
    $out = [];
    foreach ($a as $k => $v) {
        $path = $prefix === '' ? (string) $k : "$prefix.$k";
        if (is_array($v)) {
            $isList = array_keys($v) === range(0, count($v) - 1);
            if ($isList && isset($v[0]['key'])) {
                foreach ($v as $item) { // ranked lists: one row per key
                    $out[] = ["$path.{$item['key']}", $item['count']];
                }
            } elseif (!$isList) {
                $out = array_merge($out, flatten($v, $path));
            }
        } else {
            $out[] = [$path, $v];
        }
    }
    return $out;
}

function send_csv(string $name, array $header, array $rows): void
{
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: inline; filename="' . $name . '.csv"');
    $fh = fopen('php://output', 'w');
    fputcsv($fh, $header, ',', '"', '');
    foreach ($rows as $r) {
        fputcsv($fh, array_map(static fn($v) => is_bool($v) ? (int) $v : $v, $r), ',', '"', '');
    }
    fclose($fh);
    exit;
}

// ---------- Request ----------
if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) {
    respond(405, ['error' => 'Method not allowed.']);
}
$cfg = grc_load_config(__DIR__);

$token = (string) ($cfg['METRICS_TOKEN'] ?? '');
$given = (string) ($_SERVER['HTTP_X_API_KEY'] ?? '');
$auth  = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
if ($given === '' && stripos($auth, 'Bearer ') === 0) {
    $given = trim(substr($auth, 7));
}
if ($given !== '' && (strlen($token) < 24 || !hash_equals($token, $given))) {
    respond(401, ['error' => 'Invalid API token.']);
}
$private = $given !== '';

$daysParam = (string) ($_GET['days'] ?? '30');
$allowedDays = ['7' => 7, '30' => 30, '90' => 90, '365' => 365, 'all' => 0];
if (!isset($allowedDays[$daysParam])) {
    respond(400, ['error' => 'days must be one of 7, 30, 90, 365, all.']);
}
$format = (string) ($_GET['format'] ?? 'json');
$table  = (string) ($_GET['table'] ?? 'summary');
if (!in_array($format, ['json', 'csv'], true) || !in_array($table, ['summary', 'daily', 'controls', 'scenarios'], true)) {
    respond(400, ['error' => 'format must be json or csv; table must be summary, daily, controls or scenarios.']);
}

if (!$private) {
    // Aggregates only: safe to read from any dashboard origin.
    header('Access-Control-Allow-Origin: *');
    $rlDir = grc_rl_dir($cfg);
    if (!bump_counter("$rlDir/ind-" . grc_ip_hash($cfg) . '-' . gmdate('YmdH') . '.cnt', (int) ($cfg['INDICATORS_PER_IP_HOURLY'] ?? 600))) {
        respond(429, ['error' => 'Too many requests — try again later.']);
    }
}

$dataset = (string) ($_GET['dataset'] ?? 'live');
if (!in_array($dataset, ['live', 'examples'], true)) {
    respond(400, ['error' => 'dataset must be live or examples.']);
}
$days = $allowedDays[$daysParam];
$from = $days ? strtotime(gmdate('Y-m-d') . ' 00:00:00 UTC') - ($days - 1) * 86400 : 0;
if ($dataset === 'examples') {
    [$days, $from, $daysParam, $private] = [0, 0, 'all', false];
}

// 60-second cache per window: the dashboard and API clients never hammer the database.
$cacheFile = grc_data_dir($cfg) . DIRECTORY_SEPARATOR . "indicators-$dataset-$daysParam-" . ($private ? 'p' : 'o') . '.json';
$data = null;
if (@is_dir(dirname($cacheFile)) && @is_file($cacheFile) && time() - (int) @filemtime($cacheFile) < 60) {
    $data = json_decode((string) @file_get_contents($cacheFile), true);
}
if (!is_array($data)) {
    try {
        if ($dataset === 'examples') {
            // Baseline: the curated example library (published by the build as indicators/examples.json),
            // replayed into a throw-away in-memory database so it goes through exactly the same maths.
            $file = (string) ($cfg['EXAMPLES_FILE'] ?? (dirname(__DIR__) . '/indicators/examples.json'));
            $events = @is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
            $db = is_array($events) ? grc_metrics_db(['METRICS_DB' => ':memory:']) : null;
            if (!$db) {
                respond(503, ['error' => 'The example library is not available.']);
            }
            foreach ($events as $ev) {
                $clean = is_array($ev) ? grc_clean_event($ev['result'] ?? null) : null;
                if ($clean) {
                    grc_metrics_record([], [
                        'source'      => 'demo',
                        'scenario'    => grc_scenario($ev['scenario'] ?? null, __DIR__),
                        'input_chars' => $ev['input_chars'] ?? null,
                    ], $clean, __DIR__ . '/frameworks');
                }
            }
        } else {
            $db = grc_metrics_db($cfg);
            if (!$db) {
                respond(503, ['error' => 'Indicators are temporarily unavailable.']);
            }
        }
        $data = compute($db, $from, __DIR__ . '/frameworks', $private);
    } catch (Throwable $e) {
        error_log('[grcaudit] indicators failed: ' . $e->getMessage());
        respond(503, ['error' => 'Indicators are temporarily unavailable.']);
    }
    if ($dataset === 'examples') {
        $data['daily'] = []; // replayed in one go: a time series would be meaningless
    }
    $data = [
        'api'          => 'GRC Audit Indicators',
        'version'      => 1,
        'dataset'      => $dataset,
        'generated_at' => gmdate('c'),
        'window'       => ['days' => $days ?: 'all', 'from' => $from ? gmdate('Y-m-d', $from) : null, 'to' => gmdate('Y-m-d')],
        'privacy'      => 'Aggregated, anonymous metrics: no incident text, titles or IP addresses are stored.',
    ] + $data;
    @file_put_contents($cacheFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

// The token response must never sit in a shared cache (LiteSpeed, Cloudflare) where others could read it.
header($private ? 'Cache-Control: private, no-store' : 'Cache-Control: public, max-age=60');
header('Vary: Authorization, X-API-Key');
$controls = $data['_controls'] ?? [];
unset($data['_controls']);

if ($format === 'csv') {
    if ($table === 'daily') {
        send_csv('grc-indicators-daily', ['day', 'total', 'ai', 'demo', 'high_critical', 'ai_rate_limited'],
            array_map(static fn($d) => [$d['day'], $d['total'], $d['ai'], $d['demo'], $d['high_critical'], $d['ai_rate_limited']], $data['daily']));
    }
    if ($table === 'controls') {
        usort($controls, static fn($a, $b) => [$a[0], -$a[3]] <=> [$b[0], -$b[3]]);
        send_csv('grc-indicators-controls', ['framework', 'control_id', 'name', 'citations'], $controls);
    }
    if ($table === 'scenarios') {
        send_csv('grc-indicators-scenarios', ['scenario', 'runs', 'share'],
            array_map(static fn($s) => [$s['key'], $s['count'], $s['share']], $data['scenarios']['top']));
    }
    $summary = $data;
    unset($summary['daily'], $summary['frameworks'], $summary['risk']['severity_by_category']);
    $rows = flatten($summary);
    foreach ($data['frameworks'] as $f) {
        foreach (['catalog_size', 'applicability_rate', 'citations', 'avg_citations_when_applicable',
            'distinct_controls_cited', 'catalog_coverage', 'never_cited'] as $m) {
            $rows[] = ["frameworks.{$f['key']}.$m", $f[$m]];
        }
    }
    foreach ($data['kri'] as $k) {
        $rows[] = ["kri.{$k['id']}.value", $k['value']];
        $rows[] = ["kri.{$k['id']}.status", $k['status']];
    }
    send_csv('grc-indicators-summary', ['metric', 'value'], $rows);
}

respond(200, $data);
