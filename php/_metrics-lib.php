<?php
/**
 * _metrics-lib.php — anonymous analysis log behind the GRC Indicators API (shared by
 * audit-incident.php, track.php and indicators.php; .htaccess denies direct requests).
 *
 * What is stored, per analysis: timestamp, source (llm / demo), scenario id or "custom",
 * severity, failure category, risk strategy, the cited control IDs (checked against the official
 * catalogs), counts, latency and token usage. NEVER stored: the incident text, titles, summaries,
 * findings or any other free text, and no IP addresses (rate limits use HMAC-hashed counters).
 *
 * Storage: one SQLite file OUTSIDE the web root — by default <folder of grcaudit-config.php>/
 * grcaudit-data/metrics.sqlite, or METRICS_DB in the config. Any storage error is logged and
 * swallowed: metrics must never break an analysis.
 */

declare(strict_types=1);

/** key => [label, catalog file, list key]. */
const GRC_FRAMEWORKS = [
    'iso_27001_2022' => ['ISO/IEC 27001:2022', 'iso-27001-2022.json', 'controls'],
    'nist_csf_2'     => ['NIST CSF 2.0', 'nist-csf-2.0.json', 'controls'],
    'soc_2'          => ['SOC 2 (TSC)', 'soc-2-tsc.json', 'criteria'],
    'gdpr'           => ['GDPR', 'gdpr-official.json', 'articles'],
    'ccpa_cpra'      => ['CCPA/CPRA', 'ccpa-cpra.json', 'sections'],
    'hipaa'          => ['HIPAA', 'hipaa-security-privacy.json', 'controls'],
    'aiuc_1'         => ['AIUC-1 (AI agents)', 'aiuc-1.json', 'requirements'],
];
/** Result field that holds the cited IDs of each framework (grounded_frameworks.<key>.<field>). */
const GRC_FIELDS = [
    'iso_27001_2022' => 'control_id',
    'nist_csf_2'     => 'subcategories',
    'soc_2'          => 'criteria',
    'gdpr'           => 'article',
    'ccpa_cpra'      => 'section',
    'hipaa'          => 'rule',
    'aiuc_1'         => 'requirements',
];
/** Cited IDs counted per framework and analysis (the prompt asks for 2-6 ISO controls). */
const GRC_MAX_IDS = 8;
/** History kept, in days. */
const GRC_RETENTION_DAYS = 400;
const GRC_SEVERITIES =['Low', 'Medium', 'High', 'Critical'];
const GRC_CATEGORIES = [
    'Identity & Access Management', 'Data Leakage', 'Cloud Misconfiguration', 'Third-Party Risk',
    'Endpoint Security', 'Vulnerability Management', 'Governance & Compliance',
    'Business Continuity & Resilience',
];
const GRC_STRATEGIES = ['MITIGATE', 'AVOID', 'TRANSFER', 'ACCEPT'];
/** Statutory breach-notification provisions — cited only when personal data was compromised. */
const GRC_BREACH_NOTICE = [
    'gdpr'      => ['Art. 33', 'Art. 34'],
    'ccpa_cpra' => ['1798.82', '1798.150'],
    'hipaa'     => ['164.404', '164.408'],
];

/** Atomically increment a counter file; false when the limit is already reached or storage fails. */
function bump_counter(string $file, int $limit): bool
{
    $fh = @fopen($file, 'c+');
    if ($fh === false) {
        error_log('[grcaudit] rate-limit storage not writable: ' . $file);
        return false; // fail closed: protect the credits, the page falls back to demo
    }
    $ok = false;
    if (flock($fh, LOCK_EX)) {
        $count = (int) stream_get_contents($fh);
        if ($count < $limit) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, (string) ($count + 1));
            fflush($fh);
            $ok = true;
        }
        flock($fh, LOCK_UN);
    }
    fclose($fh);
    return $ok;
}

/** Same lookup as the AI endpoint: grcaudit-config.php searched upward, then env vars. */
function grc_load_config(string $from): array
{
    $cfg = [];
    $dir = $from;
    for ($i = 0; $i < 6; $i++) { // api/ → grcaudit/ → public_html/ → <domain>/ → ...
        $candidate = $dir . DIRECTORY_SEPARATOR . 'grcaudit-config.php';
        if (@is_file($candidate)) {
            $loaded = include $candidate;
            if (is_array($loaded)) {
                $cfg = $loaded;
                $cfg['__CONFIG_DIR'] = $dir;
                break;
            }
        }
        $parent = dirname($dir);
        if ($parent === $dir) {
            break;
        }
        $dir = $parent;
    }
    if (!$cfg && @is_file($from . '/config.php')) {
        $loaded = include $from . '/config.php';
        if (is_array($loaded)) {
            $cfg = $loaded;
        }
    }
    $envKey = getenv('ANTHROPIC_API_KEY');
    if (is_string($envKey) && $envKey !== '') {
        $cfg['ANTHROPIC_API_KEY'] = $envKey;
    }
    $envModel = getenv('LLM_MODEL');
    if (is_string($envModel) && $envModel !== '') {
        $cfg['LLM_MODEL'] = $envModel;
    }
    return $cfg;
}

/** Folder for the metrics database and API cache (outside the web root when a config was found). */
function grc_data_dir(array $cfg): string
{
    if (!empty($cfg['METRICS_DB'])) {
        return dirname((string) $cfg['METRICS_DB']);
    }
    $base = isset($cfg['__CONFIG_DIR']) ? (string) $cfg['__CONFIG_DIR'] : sys_get_temp_dir();
    // Never inside the web root (e.g. a config left in public_html): the database must not be downloadable.
    $root = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
    $real = realpath($base);
    if ($root && $real && strncmp($real . DIRECTORY_SEPARATOR, $root . DIRECTORY_SEPARATOR, strlen($root) + 1) === 0) {
        $base = sys_get_temp_dir();
    }
    return rtrim($base, '/\\') . DIRECTORY_SEPARATOR . 'grcaudit-data';
}

/** Rate-limit folder (the same one the AI endpoint uses). */
function grc_rl_dir(array $cfg): string
{
    $dir = rtrim((string) ($cfg['RATE_LIMIT_DIR'] ?? (sys_get_temp_dir() . '/grcaudit-ratelimit')), '/');
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

/** Daily HMAC of the client IP — lets counters tell visitors apart without storing any IP. */
function grc_ip_hash(array $cfg): string
{
    $secret = (string) ($cfg['ANTHROPIC_API_KEY'] ?? '');
    if ($secret === '') {
        $secret = (string) ($cfg['METRICS_SALT'] ?? __DIR__);
    }
    return substr(hash_hmac('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . gmdate('Ymd'), $secret), 0, 24);
}

/** Open (and on first use create) the metrics database; null when storage is unavailable. */
function grc_metrics_db(array $cfg): ?PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    try {
        $path = !empty($cfg['METRICS_DB'])
            ? (string) $cfg['METRICS_DB']
            : grc_data_dir($cfg) . DIRECTORY_SEPARATOR . 'metrics.sqlite';
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        $db = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        $db->exec('PRAGMA busy_timeout = 5000');
        $db->exec('CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY,
            ts INTEGER NOT NULL,
            day TEXT NOT NULL,
            source TEXT NOT NULL,
            scenario TEXT NOT NULL,
            fallback INTEGER NOT NULL DEFAULT 0,
            input_chars INTEGER,
            latency_ms INTEGER,
            model TEXT,
            severity TEXT,
            category TEXT,
            strategy TEXT,
            cited INTEGER NOT NULL DEFAULT 0,
            verified INTEGER NOT NULL DEFAULT 0,
            unverified INTEGER NOT NULL DEFAULT 0,
            grounded INTEGER NOT NULL DEFAULT 1,
            ai_involved INTEGER NOT NULL DEFAULT 0,
            breach_notice INTEGER NOT NULL DEFAULT 0,
            evidence_items INTEGER,
            in_tokens INTEGER,
            out_tokens INTEGER,
            cache_read INTEGER,
            cache_write INTEGER
        )');
        $db->exec('CREATE INDEX IF NOT EXISTS analyses_day ON analyses(day)');
        // Citations and framework applicability are aggregated per day: their size is bounded by the
        // catalogs (≈550 controls), not by the number of analyses, so a flood of events cannot bloat them.
        $db->exec('CREATE TABLE IF NOT EXISTS citations_daily (
            day TEXT NOT NULL,
            framework TEXT NOT NULL,
            control_id TEXT NOT NULL,
            n INTEGER NOT NULL,
            PRIMARY KEY (day, framework, control_id)
        )');
        $db->exec('CREATE TABLE IF NOT EXISTS applicability_daily (
            day TEXT NOT NULL,
            framework TEXT NOT NULL,
            yes INTEGER NOT NULL,
            n INTEGER NOT NULL,
            PRIMARY KEY (day, framework)
        )');
        // Outcomes that are not a finished analysis (rate limits, AI errors, bad input): one counter
        // per day, so a flood of rejected requests can never grow the database.
        $db->exec('CREATE TABLE IF NOT EXISTS daily_counters (
            day TEXT NOT NULL,
            k TEXT NOT NULL,
            n INTEGER NOT NULL,
            PRIMARY KEY (day, k)
        )');
        $pdo = $db;
        return $pdo;
    } catch (Throwable $e) {
        error_log('[grcaudit] metrics storage unavailable: ' . $e->getMessage());
        return null;
    }
}

/** Count one non-analysis outcome (e.g. "llm_rate_limited_ip") for today. */
function grc_metrics_count(array $cfg, string $key): void
{
    $db = grc_metrics_db($cfg);
    if (!$db) {
        return;
    }
    try {
        $st = $db->prepare('INSERT INTO daily_counters (day, k, n) VALUES (?, ?, 1)
            ON CONFLICT(day, k) DO UPDATE SET n = n + 1');
        $st->execute([gmdate('Y-m-d'), substr($key, 0, 60)]);
    } catch (Throwable $e) {
        error_log('[grcaudit] metrics counter failed: ' . $e->getMessage());
    }
}

/** Official catalogs as key => [label, entries => [[id, name], ...]]. */
function grc_catalogs(string $dir): array
{
    static $cache = [];
    if (isset($cache[$dir])) {
        return $cache[$dir];
    }
    $out = [];
    foreach (GRC_FRAMEWORKS as $key => [$label, $file, $list]) {
        $entries = [];
        $data = @is_file("$dir/$file") ? json_decode((string) file_get_contents("$dir/$file"), true) : null;
        foreach ((is_array($data) ? ($data[$list] ?? []) : []) as $it) {
            $id = (string) ($it['id'] ?? ($it['control_id'] ?? ''));
            if ($id !== '') {
                $entries[] = [$id, (string) ($it['name'] ?? ($it['title'] ?? ''))];
            }
        }
        $out[$key] = ['label' => $label, 'entries' => $entries];
    }
    return $cache[$dir] = $out;
}

function grc_norm(string $s): string
{
    $s = function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
    return trim((string) preg_replace('/\s+/u', ' ', $s));
}

/** Same matching rules as src/lib/grounding.ts (idMatches) — keep the two in step. */
function grc_id_matches(string $c, string $v): bool
{
    if ($c === $v) {
        return true;
    }
    if (strncmp($c, $v, strlen($v)) === 0 && preg_match('/^[\s(]/', substr($c, strlen($v)))) {
        return true; // finer sub-reference: "art. 5(1)(f)" → "art. 5"
    }
    if (strncmp($v, $c, strlen($c)) === 0 && preg_match('/^[(-]/', substr($v, strlen($c)))) {
        return true; // parent in a hierarchy: "pr.aa" → "pr.aa-01"
    }
    if (preg_match('/^(.*?)(\d+)\s*[-–]\s*(\d+)$/u', $v, $r) && strncmp($c, $r[1], strlen($r[1])) === 0) {
        if (preg_match('/^(\d+)(?=$|[\s(])/', substr($c, strlen($r[1])), $m)) {
            $n = (int) $m[1];
            return $n >= (int) $r[2] && $n <= (int) $r[3]; // inside a catalog range: "art. 17" → "art. 15-22"
        }
    }
    return false;
}

/** Split a cited-IDs field ("A.8.1 & A.6.5", "CC6.2, CC6.3"); "N/A" / "not applicable" → []. */
function grc_split_ids(string $raw): array
{
    $r = trim($raw);
    $l = grc_norm($r);
    if ($r === '' || $l === 'n/a' || strpos($l, 'not applicable') !== false) {
        return [];
    }
    $parts = preg_split('/[,;&]| and /i', $r) ?: [];
    $ids = [];
    foreach ($parts as $p) {
        $p = trim($p);
        $n = grc_norm($p);
        if ($p !== '' && $n !== 'n/a' && strpos($n, 'not applicable') === false) {
            $ids[] = $p;
        }
    }
    return $ids;
}

/**
 * The catalog ID a citation resolves to: the official ID for an exact match, a finer sub-reference
 * or an article inside a catalog range; the citation itself when it names a parent (e.g. "PR.AA").
 * null when it is not in the catalog (an unverified / hallucinated ID).
 */
function grc_resolve_id(string $cited, array $entries): ?string
{
    $c = grc_norm($cited);
    foreach ($entries as [$id]) {
        $v = grc_norm($id);
        if (grc_id_matches($c, $v)) {
            $isParent = $c !== $v && strncmp($v, $c, strlen($c)) === 0 && preg_match('/^[(-]/', substr($v, strlen($c)));
            return $isParent ? strtoupper(trim($cited)) : $id;
        }
    }
    return null;
}

/**
 * Structured facts of one result: per-framework applicability and resolved citations, counts and
 * flags. Only catalog-verified IDs are kept as text, so nothing free-form ever reaches the database.
 */
function grc_extract(array $result, string $catalogDir): array
{
    $catalogs = grc_catalogs($catalogDir);
    $gf = is_array($result['grounded_frameworks'] ?? null) ? $result['grounded_frameworks'] : [];
    $citations = [];
    $applicable = [];
    $cited = $verified = 0;
    $breach = false;
    foreach (GRC_FIELDS as $key => $field) {
        $raw = is_array($gf[$key] ?? null) ? (string) ($gf[$key][$field] ?? '') : '';
        $ids = grc_split_ids(substr($raw, 0, 600));
        $applicable[$key] = $ids ? 1 : 0;
        $seen = [];
        foreach (array_slice($ids, 0, GRC_MAX_IDS) as $id) {
            $cited++;
            $resolved = grc_resolve_id($id, $catalogs[$key]['entries'] ?? []);
            if ($resolved === null) {
                $citations[] = [$key, '(unverified)', 0];
                continue;
            }
            $verified++;
            if (isset($seen[$resolved])) {
                continue; // "Art. 15" and "Art. 17" both resolve to "Art. 15-22": count it once
            }
            $seen[$resolved] = true;
            $citations[] = [$key, $resolved, 1];
            foreach (GRC_BREACH_NOTICE[$key] ?? [] as $notice) {
                $r = grc_norm($resolved);
                $n = grc_norm($notice);
                if ($r === $n || strncmp($r, $n . '(', strlen($n) + 1) === 0) {
                    $breach = true;
                }
            }
        }
    }
    $sev = (string) ($result['severity_level'] ?? '');
    $cat = (string) ($result['failure_category'] ?? '');
    $str = (string) ($result['recommended_strategy']['strategy'] ?? '');
    $ev  = $result['audit_evidence_required'] ?? null;
    return [
        'severity'       => in_array($sev, GRC_SEVERITIES, true) ? $sev : null,
        'category'       => in_array($cat, GRC_CATEGORIES, true) ? $cat : null,
        'strategy'       => in_array($str, GRC_STRATEGIES, true) ? $str : null,
        'evidence_items' => is_array($ev) ? count($ev) : (is_int($ev) ? max(0, min($ev, 100)) : null),
        'cited'          => $cited,
        'verified'       => $verified,
        'unverified'     => $cited - $verified,
        'ai_involved'    => $applicable['aiuc_1'],
        'breach_notice'  => $breach ? 1 : 0,
        'applicable'     => $applicable,
        'citations'      => $citations,
    ];
}

/**
 * A browser-built event (src/lib/telemetry.ts) reduced to the fields the indicators use; anything
 * else is ignored. null when severity or category is not one of the known values.
 */
function grc_clean_event($result): ?array
{
    if (!is_array($result)) {
        return null;
    }
    $clean = [
        'severity_level'          => $result['severity_level'] ?? null,
        'failure_category'        => $result['failure_category'] ?? null,
        'recommended_strategy'    => ['strategy' => $result['recommended_strategy']['strategy'] ?? null],
        'audit_evidence_required' => is_numeric($result['evidence_items'] ?? null) ? (int) $result['evidence_items'] : null,
        'grounded_frameworks'     => [],
    ];
    foreach (GRC_FIELDS as $key => $field) {
        $v = $result['grounded_frameworks'][$key][$field] ?? null;
        $clean['grounded_frameworks'][$key] = [$field => is_string($v) ? $v : ''];
    }
    if (!in_array($clean['severity_level'], GRC_SEVERITIES, true)
        || !in_array($clean['failure_category'], GRC_CATEGORIES, true)) {
        return null;
    }
    return $clean;
}

/** Scenario id of a curated example, or "custom" for free text (unknown ids never reach the stats). */
function grc_scenario($raw, string $dir): string
{
    if (!is_string($raw) || !preg_match('/^[a-z0-9-]{1,40}$/', $raw)) {
        return 'custom';
    }
    $list = @is_file("$dir/scenarios.json") ? json_decode((string) file_get_contents("$dir/scenarios.json"), true) : null;
    if (is_array($list)) {
        return in_array($raw, $list, true) ? $raw : 'custom';
    }
    return $raw;
}

/** Drop history older than GRC_RETENTION_DAYS — once per day, on the first write of the day. */
function grc_metrics_prune(PDO $db): void
{
    $today = gmdate('Y-m-d');
    $mark = $db->prepare("INSERT OR IGNORE INTO daily_counters (day, k, n) VALUES (?, '_pruned', 1)");
    $mark->execute([$today]);
    if ($mark->rowCount() === 0) {
        return; // already pruned today
    }
    $cut = gmdate('Y-m-d', time() - GRC_RETENTION_DAYS * 86400);
    foreach (['analyses', 'citations_daily', 'applicability_daily', 'daily_counters'] as $t) {
        $db->prepare("DELETE FROM $t WHERE day < ?")->execute([$cut]);
    }
}

/** Old rate-limit counter files (*.cnt) are deleted after two days. */
function grc_rl_cleanup(string $rlDir): void
{
    if (mt_rand(1, 50) !== 1) {
        return;
    }
    foreach ((array) glob($rlDir . '/*.cnt') as $f) {
        if (is_string($f) && @filemtime($f) < time() - 2 * 86400) {
            @unlink($f);
        }
    }
}

/** Store one finished analysis. $meta: source, scenario, fallback, input_chars, latency_ms, model, usage. */
function grc_metrics_record(array $cfg, array $meta, array $result, string $catalogDir): bool
{
    $db = grc_metrics_db($cfg);
    if (!$db) {
        return false;
    }
    try {
        $x = grc_extract($result, $catalogDir);
        $u = is_array($meta['usage'] ?? null) ? $meta['usage'] : [];
        $int = static fn($v) => is_numeric($v) ? (int) $v : null;
        $db->beginTransaction();
        $st = $db->prepare('INSERT INTO analyses (ts, day, source, scenario, fallback, input_chars, latency_ms,
            model, severity, category, strategy, cited, verified, unverified, grounded, ai_involved,
            breach_notice, evidence_items, in_tokens, out_tokens, cache_read, cache_write)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $st->execute([
            time(), gmdate('Y-m-d'),
            ($meta['source'] ?? '') === 'llm' ? 'llm' : 'demo',
            (string) ($meta['scenario'] ?? 'custom'),
            empty($meta['fallback']) ? 0 : 1,
            $int($meta['input_chars'] ?? null),
            $int($meta['latency_ms'] ?? null),
            isset($meta['model']) ? substr((string) $meta['model'], 0, 60) : null,
            $x['severity'], $x['category'], $x['strategy'],
            $x['cited'], $x['verified'], $x['unverified'], $x['unverified'] === 0 ? 1 : 0,
            $x['ai_involved'], $x['breach_notice'], $x['evidence_items'],
            $int($u['input_tokens'] ?? null), $int($u['output_tokens'] ?? null),
            $int($u['cache_read_input_tokens'] ?? null), $int($u['cache_creation_input_tokens'] ?? null),
        ]);
        $day = gmdate('Y-m-d');
        $ci = $db->prepare('INSERT INTO citations_daily (day, framework, control_id, n) VALUES (?, ?, ?, 1)
            ON CONFLICT(day, framework, control_id) DO UPDATE SET n = n + 1');
        foreach ($x['citations'] as [$fw, $cid]) {
            $ci->execute([$day, $fw, $cid]);
        }
        $ap = $db->prepare('INSERT INTO applicability_daily (day, framework, yes, n) VALUES (?, ?, ?, 1)
            ON CONFLICT(day, framework) DO UPDATE SET yes = yes + excluded.yes, n = n + 1');
        foreach ($x['applicable'] as $fw => $flag) {
            $ap->execute([$day, $fw, $flag]);
        }
        $db->commit();
        grc_metrics_prune($db);
        return true;
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('[grcaudit] metrics write failed: ' . $e->getMessage());
        return false;
    }
}
