<?php
// php php/tests/metrics-lib.test.php — unit tests for the anonymous metrics log (no framework needed).
declare(strict_types=1);

require __DIR__ . '/../_metrics-lib.php';

$catalogDir = __DIR__ . '/../../src/data/frameworks';
$fails = 0;
$runs  = 0;
function check(string $name, bool $ok): void
{
    global $fails, $runs;
    $runs++;
    if (!$ok) {
        $fails++;
        echo "FAIL  $name\n";
    }
}

// ---- matching rules mirror src/lib/grounding.ts ----
check('exact', grc_id_matches('art. 32', 'art. 32'));
check('finer sub-reference', grc_id_matches('art. 5(1)(f)', 'art. 5'));
check('parent in hierarchy', grc_id_matches('pr.aa', 'pr.aa-01'));
check('inside a range', grc_id_matches('art. 17', 'art. 15-22'));
check('no digit continuation art. 3/32', !grc_id_matches('art. 3', 'art. 32'));
check('no digit continuation a.5.1/a.5.18', !grc_id_matches('a.5.1', 'a.5.18'));
check('no 1798.81 vs 1798.81.5', !grc_id_matches('1798.81', '1798.81.5'));
check('outside a range', !grc_id_matches('art. 23', 'art. 15-22'));

check('split &', grc_split_ids('A.8.1 & A.6.5') === ['A.8.1', 'A.6.5']);
check('split comma and "and"', grc_split_ids('CC6.2, CC6.3 and CC7.2') === ['CC6.2', 'CC6.3', 'CC7.2']);
check('N/A is empty', grc_split_ids('N/A') === []);
check('not applicable is empty', grc_split_ids('Not applicable — no ePHI') === []);

$entries = grc_catalogs($catalogDir)['gdpr']['entries'];
check('resolve finer to catalog id', grc_resolve_id('Art. 5(1)(f)', $entries) === 'Art. 5');
check('resolve range member to range id', grc_resolve_id('Art. 17', $entries) === 'Art. 15-22');
check('hallucinated id is null', grc_resolve_id('Art. 999', $entries) === null);
check('7 catalogs loaded', count(array_filter(grc_catalogs($catalogDir), fn($c) => count($c['entries']) > 0)) === 7);

// ---- extraction keeps only structured, verified facts ----
$result = [
    'incident_title' => 'Personal free text that must never be stored',
    'severity_level' => 'Critical',
    'failure_category' => 'Data Leakage',
    'recommended_strategy' => ['strategy' => 'MITIGATE', 'rationale' => 'free text'],
    'audit_evidence_required' => ['a', 'b', 'c'],
    'grounded_frameworks' => [
        'iso_27001_2022' => ['control_id' => 'A.8.12 & A.5.14 & A.9.99'],
        'soc_2' => ['criteria' => 'CC6.7'],
        'gdpr' => ['article' => 'Art. 32 & Art. 33'],
        'ccpa_cpra' => ['section' => 'N/A'],
        'hipaa' => ['rule' => 'N/A'],
        'nist_csf_2' => ['subcategories' => 'PR.DS-01, DE.CM-01'],
    ],
];
$x = grc_extract($result, $catalogDir);
check('cited counts every id', $x['cited'] === 8);
check('one hallucinated id', $x['unverified'] === 1 && $x['verified'] === 7);
check('breach notice from Art. 33', $x['breach_notice'] === 1);
check('aiuc missing → not applicable', $x['applicable']['aiuc_1'] === 0 && $x['ai_involved'] === 0);
check('ccpa N/A → not applicable', $x['applicable']['ccpa_cpra'] === 0);
check('evidence items counted', $x['evidence_items'] === 3);
check('unverified kept only as a placeholder', in_array(['iso_27001_2022', '(unverified)', 0], $x['citations'], true));
check('no free text in citations', strpos(json_encode($x), 'free text') === false);

$noBreach = $result;
$noBreach['grounded_frameworks']['gdpr']['article'] = 'Art. 32';
check('no breach notice without Art. 33/34', grc_extract($noBreach, $catalogDir)['breach_notice'] === 0);
$bad = $result;
$bad['severity_level'] = '<script>';
check('unknown severity dropped', grc_extract($bad, $catalogDir)['severity'] === null);

// ---- browser events are reduced to known fields ----
$ev = grc_clean_event(['severity_level' => 'High', 'failure_category' => 'Data Leakage', 'evidence_items' => 4,
    'incident_title' => 'free text', 'grounded_frameworks' => ['soc_2' => ['criteria' => 'CC6.1', 'name' => 'free text']]]);
check('clean event keeps known fields', $ev !== null && $ev['audit_evidence_required'] === 4
    && $ev['grounded_frameworks']['soc_2'] === ['criteria' => 'CC6.1']);
check('clean event drops free text', strpos(json_encode($ev), 'free text') === false);
check('clean event rejects unknown category', grc_clean_event(['severity_level' => 'High', 'failure_category' => 'x']) === null);

// ---- scenario ids ----
check('custom for free text', grc_scenario(null, $catalogDir) === 'custom');
check('custom for junk', grc_scenario('<b>x</b>', $catalogDir) === 'custom');

// ---- storage round trip ----
$tmp = sys_get_temp_dir() . '/grcaudit-test-' . bin2hex(random_bytes(4));
$cfg = ['METRICS_DB' => "$tmp/metrics.sqlite"];
check('record', grc_metrics_record($cfg, ['source' => 'llm', 'scenario' => 'data-leak', 'latency_ms' => 1200,
    'usage' => ['input_tokens' => 10, 'output_tokens' => 20]], $result, $catalogDir));
grc_metrics_count($cfg, 'llm_rate_limited_ip');
grc_metrics_count($cfg, 'llm_rate_limited_ip');
$db = grc_metrics_db($cfg);
check('one analysis row', (int) $db->query('SELECT COUNT(*) FROM analyses')->fetchColumn() === 1);
check('citations aggregated per day', (int) $db->query('SELECT SUM(n) FROM citations_daily')->fetchColumn() === 8);
check('applicability aggregated per day', (int) $db->query('SELECT SUM(n) FROM applicability_daily')->fetchColumn() === 7);
grc_metrics_record($cfg, ['source' => 'demo', 'scenario' => 'custom'], $result, $catalogDir);
check('second analysis adds to the same daily rows', (int) $db->query('SELECT COUNT(*) FROM citations_daily')->fetchColumn() === 8
    && (int) $db->query('SELECT SUM(n) FROM citations_daily')->fetchColumn() === 16);
check('prune marker set once per day', (int) $db->query("SELECT COUNT(*) FROM daily_counters WHERE k = '_pruned'")->fetchColumn() === 1);

$flood = $result;
$flood['grounded_frameworks']['iso_27001_2022']['control_id'] = implode(' & ', array_fill(0, 40, 'A.9.99'));
check('at most GRC_MAX_IDS ids per framework', grc_extract($flood, $catalogDir)['unverified'] === GRC_MAX_IDS);
check('counter upsert', (int) $db->query("SELECT n FROM daily_counters WHERE k = 'llm_rate_limited_ip'")->fetchColumn() === 2);
$dump = json_encode($db->query('SELECT * FROM analyses')->fetchAll(PDO::FETCH_ASSOC))
    . json_encode($db->query('SELECT * FROM citations_daily')->fetchAll(PDO::FETCH_ASSOC));
check('database holds no free text', strpos($dump, 'free text') === false && strpos($dump, 'Personal') === false);

echo $fails === 0 ? "OK  $runs checks passed\n" : "$fails of $runs checks FAILED\n";
exit($fails === 0 ? 0 : 1);
