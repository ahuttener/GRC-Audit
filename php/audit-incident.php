<?php
/**
 * audit-incident.php — server-side LLM endpoint for GRC Audit, for a PHP host (e.g. Hostinger).
 *
 * Why PHP: the Anthropic API key must stay on the server (never in the browser). This mirrors
 * how a PHP site like BRDeals already calls an API server-side — no Node runtime needed.
 *
 * Front-end: build the static site with
 *     NEXT_PUBLIC_USE_API=1  NEXT_PUBLIC_API_URL="api/audit-incident.php"
 * and the browser POSTs { incident } here; this script calls Claude and returns the JSON.
 *
 * Setup: copy config.sample.php to config.php and put your key there (config.php is git-ignored).
 * Upload this file and the frameworks/ catalogs (the 6 JSON files) next to it.
 */

header('Content-Type: application/json; charset=utf-8');

// ---- API key: from environment or config.php (never committed) ----
$apiKey = getenv('ANTHROPIC_API_KEY') ?: '';
$model  = getenv('LLM_MODEL') ?: 'claude-sonnet-5-5';
if ($apiKey === '' && is_file(__DIR__ . '/config.php')) {
    $cfg = include __DIR__ . '/config.php';
    if (is_array($cfg)) {
        $apiKey = $cfg['ANTHROPIC_API_KEY'] ?? $apiKey;
        $model  = $cfg['LLM_MODEL'] ?? $model;
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$incident = (is_array($body) && isset($body['incident']) && is_string($body['incident']))
    ? trim($body['incident']) : '';

if (strlen($incident) < 15) { http_response_code(400); echo json_encode(['error' => 'Please describe the incident in a little more detail.']); exit; }
if (strlen($incident) > 4000) { http_response_code(400); echo json_encode(['error' => 'Incident text is too long (max 4000 characters).']); exit; }
if ($apiKey === '') { http_response_code(500); echo json_encode(['error' => 'Server API key not configured (see config.php).']); exit; }

// ---- Build the grounded catalog context from the official datasets ----
$catalogs = [
    'nist-csf-2.0.json'          => 'controls',
    'iso-27001-2022.json'        => 'controls',
    'soc-2-tsc.json'             => 'criteria',
    'gdpr-official.json'         => 'articles',
    'ccpa-cpra.json'             => 'sections',
    'hipaa-security-privacy.json' => 'controls',
];
$context = '';
foreach ($catalogs as $file => $key) {
    $path = __DIR__ . '/frameworks/' . $file;
    if (!is_file($path)) continue;
    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data)) continue;
    $name  = $data['framework'] ?? $file;
    $items = $data[$key] ?? [];
    $lines = [];
    foreach ($items as $it) {
        $id = $it['id'] ?? ($it['control_id'] ?? '');
        $t  = $it['name'] ?? ($it['title'] ?? '');
        if ($id !== '') $lines[] = "  {$id} — {$t}";
    }
    $context .= $name . ":\n" . implode("\n", $lines) . "\n\n";
}

$system = <<<'PROMPT'
You are an elite, certified GRC Lead Auditor. You evaluate a submitted security incident or audit
finding STRICTLY GROUNDED against the official framework catalogs provided under "OFFICIAL FRAMEWORK
CONTEXT". DO NOT HALLUCINATE OR GUESS CONTROL IDS. Only cite valid control codes that appear in the
provided CONTEXT. Use current codes (ISO/IEC 27001:2022, NIST CSF 2.0 PR.AA..., precise 45 CFR for
HIPAA, exact GDPR articles). If a framework does not apply (e.g. HIPAA with no ePHI), set its id to
"N/A" and explain briefly; never invent an ID.

Return ONLY a single valid JSON object with EXACTLY this shape:
{
  "incident_title": string,
  "incident_summary": string,
  "severity_level": "Low" | "Medium" | "High" | "Critical",
  "failure_category": "Identity & Access Management" | "Data Leakage" | "Cloud Misconfiguration" | "Third-Party Risk" | "Endpoint Security",
  "recommended_strategy": { "strategy": "MITIGATE" | "AVOID" | "TRANSFER" | "ACCEPT", "rationale": string },
  "grounded_frameworks": {
    "iso_27001_2022": { "control_id": string, "control_name": string, "category": string, "audit_finding": string },
    "soc_2": { "criteria": string, "name": string, "audit_finding": string },
    "gdpr": { "article": string, "name": string, "regulatory_risk": string },
    "ccpa_cpra": { "section": string, "name": string, "regulatory_risk": string },
    "hipaa": { "rule": string, "name": string, "regulatory_risk": string },
    "nist_csf_2": { "subcategories": string, "function_name": string }
  },
  "audit_evidence_required": [ string ],
  "remediation_plan": { "step_1_containment": string, "step_2_leak_and_legal": string, "step_3_permanent_fix": string }
}
PROMPT;

$user = "OFFICIAL FRAMEWORK CONTEXT (cite ONLY control IDs that appear in this list):\n"
      . $context . "\nINCIDENT TO AUDIT:\n\"\"\"" . $incident . "\"\"\"\n\nProduce the grounded JSON object now.";

$payload = json_encode([
    'model'      => $model,
    'max_tokens' => 3000,
    'system'     => $system,
    'messages'   => [
        ['role' => 'user', 'content' => $user],
        ['role' => 'assistant', 'content' => '{'], // prefill -> pure JSON
    ],
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'content-type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_TIMEOUT => 60,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($resp === false || $code >= 400) {
    http_response_code(502);
    echo json_encode(['error' => 'LLM request failed.', 'status' => $code]);
    exit;
}

$data = json_decode($resp, true);
$text = '{' . ($data['content'][0]['text'] ?? '');
$start = strpos($text, '{');
$end   = strrpos($text, '}');
if ($start === false || $end === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Model did not return JSON.']);
    exit;
}
$result = json_decode(substr($text, $start, $end - $start + 1), true);
if (!is_array($result)) {
    http_response_code(502);
    echo json_encode(['error' => 'Model returned invalid JSON.']);
    exit;
}

// The browser verifies the cited IDs against the catalogs client-side.
echo json_encode(['source' => 'llm', 'model' => $model, 'result' => $result]);
