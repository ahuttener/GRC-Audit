<?php
/**
 * track.php — records a demo-engine analysis (it runs in the browser, so the AI endpoint never
 * sees it) for the GRC Indicators API. Accepts structured fields only — severity, category,
 * strategy, the cited ID fields and counts — and re-verifies every ID against the official
 * catalogs on the server; unknown IDs are kept only as a count. No text is stored.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/_metrics-lib.php';

function respond(int $status, array $body = []): void
{
    http_response_code($status);
    if ($body) {
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    exit;
}

$cfg            = grc_load_config(__DIR__);
$allowedOrigins = $cfg['ALLOWED_ORIGINS'] ?? ['https://cybersecinfo.com', 'https://www.cybersecinfo.com'];
$perIpHourly    = (int) ($cfg['TRACK_PER_IP_HOURLY'] ?? 30);
$dailyLimit     = (int) ($cfg['TRACK_DAILY_LIMIT'] ?? 1000);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['error' => 'Method not allowed.']);
}
// Only the GRC Audit page itself may record events: Origin (or, failing that, the Referer's origin)
// must be present and allowed. Browsers always send one of them with the page's beacon.
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin === '' && !empty($_SERVER['HTTP_REFERER'])) {
    $ref = parse_url((string) $_SERVER['HTTP_REFERER']);
    $origin = isset($ref['scheme'], $ref['host'])
        ? $ref['scheme'] . '://' . $ref['host'] . (isset($ref['port']) ? ':' . $ref['port'] : '')
        : '';
}
if (!is_array($allowedOrigins) || !in_array($origin, $allowedOrigins, true)) {
    respond(403, ['error' => 'Origin not allowed.']);
}
$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 8000) {
    respond(413, ['error' => 'Request too large.']);
}
$body  = json_decode($raw, true);
$clean = is_array($body) ? grc_clean_event($body['result'] ?? null) : null;
if (!$clean) {
    respond(400, ['error' => 'Invalid event.']);
}

// Abuse limits: a visitor (HMAC-hashed IP, per hour) and the whole site (per day).
$rlDir  = grc_rl_dir($cfg);
$ipHash = grc_ip_hash($cfg);
if ($perIpHourly > 0 && !bump_counter("$rlDir/track-$ipHash-" . gmdate('YmdH') . '.cnt', $perIpHourly)) {
    respond(429, ['error' => 'Too many events.']);
}
if ($dailyLimit > 0 && !bump_counter("$rlDir/track-day-" . gmdate('Ymd') . '.cnt', $dailyLimit)) {
    respond(429, ['error' => 'Too many events.']);
}
grc_rl_cleanup($rlDir);

$chars = $body['input_chars'] ?? null;
grc_metrics_record($cfg, [
    'source'      => 'demo',
    'scenario'    => grc_scenario($body['scenario'] ?? null, __DIR__),
    'fallback'    => !empty($body['fallback']),
    'input_chars' => is_numeric($chars) ? max(0, min((int) $chars, 4000)) : null,
], $clean, __DIR__ . '/frameworks');

respond(204);
