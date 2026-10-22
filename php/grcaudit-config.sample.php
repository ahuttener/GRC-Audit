<?php
/**
 * GRC Audit — server configuration (holds your Anthropic API key).
 *
 * 1. Copy this file and name the copy:  grcaudit-config.php
 * 2. Put it OUTSIDE the public website folder — recommended: the folder that CONTAINS
 *    public_html (on Hostinger: domains/cybersecinfo.com/). The endpoint searches upward
 *    from grcaudit/api/ and finds it there. Outside public_html it can never be downloaded,
 *    and redeploying the site folder never erases it.
 * 3. Paste your key below. Never commit this file or paste the key in a chat.
 *
 * The key spends the monthly API credits included in your Claude plan
 * (claude.ai → Settings → Billing → API credits → link a Console organization,
 * then create the key in the Console).
 */
return [
    'ANTHROPIC_API_KEY' => 'sk-ant-xxxxxxxx-REPLACE-ME',

    // Model. Haiku 5.5 is fast and ~20x cheaper; Sonnet 5.5 reasons more deeply.
    // 'LLM_MODEL' => 'claude-sonnet-5-5',
    'LLM_MODEL' => 'claude-haiku-5-5',

    // Credit protection (the endpoint is public). When a limit is hit the page
    // automatically shows the free demo engine instead.
    'DAILY_LIMIT'   => 150, // AI analyses per day for the whole site (lower it if you use Sonnet)
    'PER_IP_HOURLY' => 10,  // AI analyses per visitor per hour

    // Only pages on these origins may call the endpoint from a browser.
    'ALLOWED_ORIGINS' => ['https://cybersecinfo.com', 'https://www.cybersecinfo.com'],

    // Indicators API (api/indicators.php). The anonymous metrics database lives next to this file,
    // in grcaudit-data/metrics.sqlite (outside public_html); override with METRICS_DB.
    // 'METRICS_DB' => '/home/USER/domains/cybersecinfo.com/grcaudit-data/metrics.sqlite',
    // Optional token (24+ characters) that unlocks token usage / cache stats in the API:
    // 'METRICS_TOKEN' => 'a-long-random-string-of-at-least-24-chars',
    'TRACK_PER_IP_HOURLY' => 30,   // demo analyses recorded per visitor per hour
    'TRACK_DAILY_LIMIT'   => 1000, // demo analyses recorded per day for the whole site
];
