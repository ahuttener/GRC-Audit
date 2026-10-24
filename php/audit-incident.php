<?php
/**
 * audit-incident.php — server-side LLM endpoint for GRC Audit on a PHP host (e.g. Hostinger).
 * The Anthropic API key stays on the server; the browser never sees it.
 *
 * Config / key lookup (first match wins for the key):
 *   1. Environment variable ANTHROPIC_API_KEY (if the host supports it)
 *   2. grcaudit-config.php OUTSIDE the web root, searched upward from this folder
 *      (recommended: the folder that contains public_html — it can't be served and
 *      survives redeploys of the site folder)
 *   3. config.php next to this script (legacy fallback)
 *
 * Current Claude models reject assistant-message prefill (400), so the JSON shape is enforced
 * with structured outputs (output_config.format = json_schema, from audit-schema.json).
 * The large, static framework catalog is a cached system block (prompt caching), so repeat
 * requests inside the cache window bill those tokens at the cache-read rate.
 *
 * Abuse protection (the key spends YOUR credits): Origin allow-list, per-IP hourly limit and a
 * global daily cap, kept as tiny counter files with HMAC-hashed IPs (no raw IPs stored — GDPR data
 * minimisation). When a limit is hit the API answers 429 and the page falls back to the demo engine.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// Config lookup, rate-limit counters and the anonymous metrics log (Indicators API).
require_once __DIR__ . '/_metrics-lib.php';

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** respond() for a request that reached the AI path but did not finish: counted for the indicators. */
function fail(array $cfg, string $outcome, int $status, array $body): void
{
    grc_metrics_count($cfg, 'llm_' . $outcome);
    respond($status, $body);
}

$started        = microtime(true);
$cfg            = grc_load_config(__DIR__);
$apiKey         = (string) ($cfg['ANTHROPIC_API_KEY'] ?? '');
if ($apiKey !== '' && strncmp($apiKey, 'sk-', 3) !== 0) {
    $apiKey = ''; // a placeholder is still in the config (e.g. COLE_A_CHAVE_AQUI) → treat as not configured
}
$model          = (string) ($cfg['LLM_MODEL'] ?? 'claude-haiku-5-5');
$dailyLimit     = (int) ($cfg['DAILY_LIMIT'] ?? 150);
$perIpHourly    = (int) ($cfg['PER_IP_HOURLY'] ?? 10);
$allowedOrigins = $cfg['ALLOWED_ORIGINS'] ?? ['https://cybersecinfo.com', 'https://www.cybersecinfo.com'];

// ---------- Request checks ----------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['error' => 'Method not allowed.']);
}

$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && is_array($allowedOrigins) && $allowedOrigins && !in_array($origin, $allowedOrigins, true)) {
    respond(403, ['error' => 'Origin not allowed.']);
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 20000) {
    respond(413, ['error' => 'Request too large.']);
}
$body     = json_decode($raw, true);
$incident = (is_array($body) && isset($body['incident']) && is_string($body['incident'])) ? trim($body['incident']) : '';
$len      = function_exists('mb_strlen') ? mb_strlen($incident, 'UTF-8') : strlen($incident);
if ($len < 15) {
    fail($cfg, 'input_error', 400, ['error' => 'Please describe the incident in a little more detail (at least 15 characters).']);
}
if ($len > 4000) {
    fail($cfg, 'input_error', 400, ['error' => 'Incident text is too long (max 4000 characters).']);
}
if ($apiKey === '') {
    fail($cfg, 'not_configured', 503, ['error' => 'AI mode is not configured on this server.', 'fallback' => 'demo']);
}

// ---------- Rate limiting ----------
$rlDir  = grc_rl_dir($cfg);
$day    = gmdate('Ymd');
$hour   = gmdate('YmdH');
$ipHash = grc_ip_hash($cfg);

if ($perIpHourly > 0 && !bump_counter("$rlDir/ip-$ipHash-$hour.cnt", $perIpHourly)) {
    fail($cfg, 'rate_limited_ip', 429, ['error' => 'Hourly AI limit reached for your connection — showing the demo engine instead.', 'fallback' => 'demo']);
}
if ($dailyLimit > 0 && !bump_counter("$rlDir/day-$day.cnt", $dailyLimit)) {
    fail($cfg, 'rate_limited_daily', 429, ['error' => 'Daily AI limit reached — showing the demo engine instead.', 'fallback' => 'demo']);
}
if (mt_rand(1, 50) === 1) { // occasional cleanup of old counters
    foreach ((array) glob($rlDir . '/*.cnt') as $f) {
        if (is_string($f) && @filemtime($f) < time() - 2 * 86400) {
            @unlink($f);
        }
    }
}

// ---------- Grounded catalog context (static → cacheable) ----------
$catalogs = [
    'nist-csf-2.0.json'           => 'controls',
    'iso-27001-2022.json'         => 'controls',
    'soc-2-tsc.json'              => 'criteria',
    'gdpr-official.json'          => 'articles',
    'ccpa-cpra.json'              => 'sections',
    'hipaa-security-privacy.json' => 'controls',
    'aiuc-1.json'                 => 'requirements',
    'dora.json'                   => 'articles',
];
$context = '';
foreach ($catalogs as $file => $key) {
    $path = __DIR__ . '/frameworks/' . $file;
    if (!is_file($path)) {
        continue;
    }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        continue;
    }
    $lines = [];
    foreach (($data[$key] ?? []) as $it) {
        $id = $it['id'] ?? ($it['control_id'] ?? '');
        $t  = $it['name'] ?? ($it['title'] ?? '');
        if ($id !== '') {
            $lines[] = "  {$id} — {$t}";
        }
    }
    $context .= ($data['framework'] ?? $file) . ":\n" . implode("\n", $lines) . "\n\n";
}
if ($context === '') {
    error_log('[grcaudit] framework catalogs missing in ' . __DIR__ . '/frameworks');
    fail($cfg, 'catalog_missing', 500, ['error' => 'Framework catalogs are missing on the server.', 'fallback' => 'demo']);
}

$instructions = <<<'PROMPT'
You are an elite, certified GRC Lead Auditor. You evaluate a submitted security incident or audit
finding STRICTLY GROUNDED against the official framework catalogs provided below under
"OFFICIAL FRAMEWORK CONTEXT".

DO NOT HALLUCINATE OR GUESS CONTROL IDS.
- Only cite control codes and statutory articles that appear in the CONTEXT.
- Use current codes: ISO/IEC 27001:2022 Annex A (not the 2013 A.5–A.18 scheme), NIST CSF 2.0
  (PR.AA..., not 1.1 PR.AC...), precise 45 CFR citations for HIPAA, exact EU GDPR article numbers.
- If a framework genuinely does not apply (e.g. HIPAA with no ePHI), set its id field to "N/A"
  and explain why in its finding/risk field. Never invent an ID to fill a slot.
- AIUC-1 (the AI agent standard) applies ONLY when an AI system, chatbot, LLM or AI agent is part of
  the incident. Otherwise set aiuc_1.requirements to "N/A" and say no AI system is involved.
- DORA (EU Digital Operational Resilience Act, Regulation (EU) 2022/2554) applies ONLY to EU financial
  entities listed in its Art. 2 (credit institutions/banks, payment and e-money institutions, investment
  firms, insurers and reinsurers, crypto-asset service providers, fund managers, trading venues, etc.)
  and to ICT third-party service providers serving them. Otherwise set dora.article to "N/A" and say
  the organisation is not an EU financial entity. When it applies, cite the duties the incident shows:
  ICT risk governance Art. 5 / Art. 6, protection and prevention Art. 9, detection Art. 10, response
  and recovery Art. 11, backups and restoration Art. 12, incident management and classification
  Art. 17 / Art. 18, reporting a major ICT-related incident to the competent authority (initial,
  intermediate and final report) Art. 19, ICT third-party risk Art. 28 / Art. 30 (Art. 29 for
  concentration risk), resilience testing Art. 24 / Art. 25 (Art. 26 for TLPT). DORA incident reporting
  covers ICT disruptions even with no personal data involved, unlike GDPR Art. 33.
- Cite EVERY directly relevant control in each framework, not just the most obvious one. For ISO/IEC
  27001:2022 this is usually 2-6 Annex A controls joined with " & " (e.g. "A.8.1 & A.6.5 & A.5.14"):
  check the People (A.6), Physical (A.7) and Technological (A.8) themes as well as Organizational
  (A.5) - e.g. personal devices -> A.8.1, a leaver who kept access -> A.6.5 / A.5.18, unapproved
  channels -> A.5.14 / A.5.10. Do not pad with loosely related controls.
- Before answering, list each distinct failure in the incident (people, process, technology, physical,
  supplier) and make sure every one is covered by at least one cited ISO control and, where one exists,
  one SOC 2 criterion. If your audit evidence or remediation addresses a weakness, its control must be
  cited too — e.g. an unvetted contractor -> A.5.19 / CC9.2, physical entry -> A.7.2 / CC6.4.
  Common pairs: MFA or strong authentication -> A.8.5 / PR.AA-03; slow or missed detection ->
  A.8.16 / DE.CM; credentials never rotated or access never reviewed -> A.5.18; network
  separation -> A.8.22. Only cite them when the incident actually shows that weakness.
- Breach-notification provisions (GDPR Art. 33 / Art. 34, CCPA/CPRA 1798.82 / 1798.150, HIPAA
  164.404 / 164.408) apply ONLY when personal data was actually accessed, disclosed, altered or lost.
  If the incident is fraud or a control failure with no personal data compromised (e.g. a deepfake
  payment scam), do not cite them: cite only the security duty (e.g. Art. 32) if personal-data
  processing is genuinely at stake, otherwise set the field to "N/A" and say why.
- Use the failure_category "Business Continuity & Resilience" for outages, failed or untested backups, disaster recovery
  and availability failures where no attacker is the root cause.
- For HIPAA, check all three safeguard types - Administrative (164.308), Physical (164.310) and
  Technical (164.312) - when ePHI is involved; workstations, facilities and devices are Physical.
- Apply each law only within its scope. CCPA/CPRA does not apply to medical information governed by
  the CMIA or to PHI held by HIPAA covered entities or business associates (1798.146): set it to "N/A"
  or cite 1798.146 to explain the exemption. GDPR applies only with an EU/EEA establishment or EU/EEA
  data subjects; HIPAA only to covered entities and business associates.
- When software, code, builds, CI/CD pipelines, releases or third-party dependencies are involved,
  also cite the process controls, not only the point controls: ISO A.8.25 (secure development life
  cycle) plus whichever of A.8.28 (secure coding), A.8.29 (security testing), A.8.32 (change
  management), A.8.8 (technical vulnerabilities), A.8.9 (configuration management) and A.8.31
  (separation of environments) apply; NIST PR.PS-06; SOC 2 CC8.1.
  Apply this only to the security of the software itself: model bias, fairness or accuracy of an AI
  decision is not a secure-development failure - cover it with AIUC-1 testing and harm controls,
  ISO A.5.31 / A.5.34 and the relevant law instead.
- AIUC-1 agent-action requirements (B006, C005) apply only to AI agents that take actions on their
  own (tool calls, transactions, sending messages, changing systems). For a model that scores,
  classifies or recommends, use the testing, harm, human-review, disclosure and vendor requirements
  (e.g. C002, C003, C007, C010, E016, E006). Automated decisions about people (hiring, credit,
  insurance) under GDPR need Art. 22 and, for high-risk processing, Art. 35.
- Choose the primary ISO 31000 / NIST risk-treatment strategy (MITIGATE, AVOID, TRANSFER, ACCEPT)
  with a one-line rationale; most live incidents are MITIGATE.
- Write every free-text field in the same language as the incident description. Keep control IDs,
  article numbers and official control names exactly as in the CONTEXT.

Field guidance: incident_title = concise headline; incident_summary = 1-2 sentence executive
briefing; iso_27001_2022.control_id like "A.8.1 & A.6.5"; iso_27001_2022.category = People / Organizational / Physical / Technological;
soc_2.criteria like "CC6.2, CC6.3"; gdpr.article like "Art. 32 & Art. 33"; ccpa_cpra.section like
"1798.150"; hipaa.rule like "164.308(a)(3)(ii)(C)"; nist_csf_2.subcategories like
"PR.AA-01, PR.AA-05"; aiuc_1.requirements like "B006, D003"; dora.article like "Art. 17 & Art. 19";
audit_evidence_required = concrete artefacts an auditor would request;
remediation_plan = immediate containment, then data-leak forensics + statutory notification
triggers only if a personal data breach occurred (e.g. GDPR 72h), then the permanent architectural/process fix.
PROMPT;

$payload = [
    'model'      => $model,
    'max_tokens' => 8000,
    'system'     => [
        ['type' => 'text', 'text' => $instructions],
        [
            'type'          => 'text',
            'text'          => "OFFICIAL FRAMEWORK CONTEXT (cite ONLY control IDs that appear in this list):\n" . $context,
            'cache_control' => ['type' => 'ephemeral'],
        ],
    ],
    'messages'   => [[
        'role'    => 'user',
        'content' => "INCIDENT TO AUDIT:\n\"\"\"" . $incident . "\"\"\"\n\nProduce the grounded JSON object now.",
    ]],
];
$schemaPath = __DIR__ . '/audit-schema.json';
if (is_file($schemaPath)) {
    $schema = json_decode((string) file_get_contents($schemaPath), true);
    if (is_array($schema)) {
        $payload['output_config'] = ['format' => ['type' => 'json_schema', 'schema' => $schema]];
    }
}

$json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
if ($json === false) {
    respond(400, ['error' => 'Could not encode the request.']);
}

@set_time_limit(120);
$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $json,
    CURLOPT_HTTPHEADER     => [
        'content-type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT        => 90,
]);
$resp    = curl_exec($ch);
$code    = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($resp === false || $code >= 400) {
    error_log('[grcaudit] Anthropic call failed: HTTP ' . $code . ' ' . $curlErr . ' ' . substr((string) $resp, 0, 500));
    fail($cfg, 'ai_error', 502, ['error' => 'AI analysis is temporarily unavailable.', 'fallback' => 'demo']);
}

$data = json_decode((string) $resp, true);
$stop = is_array($data) ? (string) ($data['stop_reason'] ?? '') : '';
if ($stop === 'refusal' || $stop === 'max_tokens') {
    error_log('[grcaudit] Anthropic stop_reason=' . $stop);
    fail($cfg, 'ai_incomplete', 502, ['error' => 'AI analysis did not complete.', 'fallback' => 'demo']);
}

$text = '';
foreach ((is_array($data) ? ($data['content'] ?? []) : []) as $block) {
    if (($block['type'] ?? '') === 'text') { // thinking blocks may come first
        $text = (string) ($block['text'] ?? '');
        break;
    }
}
$result = json_decode($text, true);
if (!is_array($result)) {
    $s = strpos($text, '{');
    $e = strrpos($text, '}');
    if ($s !== false && $e !== false && $e > $s) {
        $result = json_decode(substr($text, $s, $e - $s + 1), true);
    }
}
if (!is_array($result) || !isset($result['grounded_frameworks'])) {
    error_log('[grcaudit] invalid model output: ' . substr($text, 0, 300));
    fail($cfg, 'invalid_output', 502, ['error' => 'AI returned an invalid result.', 'fallback' => 'demo']);
}

// Anonymous indicators: structured fields and catalog-verified IDs only — never the incident text.
grc_metrics_record($cfg, [
    'source'      => 'llm',
    'scenario'    => grc_scenario(is_array($body) ? ($body['archetype'] ?? null) : null, __DIR__),
    'input_chars' => $len,
    'latency_ms'  => (int) round((microtime(true) - $started) * 1000),
    'model'       => (string) ($data['model'] ?? $model),
    'usage'       => $data['usage'] ?? null,
], $result, __DIR__ . '/frameworks');

// The browser verifies every cited control ID against the catalogs (green "Grounded" badge).
respond(200, ['source' => 'llm', 'model' => (string) ($data['model'] ?? $model), 'result' => $result]);
