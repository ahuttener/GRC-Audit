# GRC Audit on Hostinger (PHP) — AI mode without Node

The front-end is a static export; a small PHP endpoint calls Claude server-side, so the API key
never reaches the browser. Without a key — or when AI is down or rate-limited — the page falls
back to the built-in grounded demo engine automatically.

## 1. Build the bundle

```bash
bash scripts/package-hostinger.sh
```

Output: `dist-hostinger/grcaudit-hostinger.zip`, which contains:

```
grcaudit/
├── index.html, _next/, 404.html   ← static site (basePath /grcaudit)
├── .htaccess                      ← no listings, blocks .git/config files, security headers
├── COMO-INSTALAR.txt              ← install guide (PT-BR)
└── api/
    ├── audit-incident.php         ← AI endpoint
    ├── audit-schema.json          ← structured-output JSON schema
    ├── grcaudit-config.sample.php ← config template
    └── frameworks/*.json          ← the 6 official catalogs
```

## 2. Upload

hPanel → File Manager → `public_html` → upload the ZIP → Extract. The site is live at
`https://cybersecinfo.com/grcaudit/` (demo mode until step 3).

## 3. Add the key (outside the web root)

Copy `api/grcaudit-config.sample.php` to the folder **above** `public_html`
(on Hostinger usually `domains/cybersecinfo.com/`), rename it `grcaudit-config.php` and paste the
key. The endpoint searches upward from `grcaudit/api/`, so it finds the file there; outside
`public_html` it can never be downloaded and redeploys never erase it. (Fallbacks: env var
`ANTHROPIC_API_KEY`, or a legacy `api/config.php`.)

## How the endpoint calls Claude

- **Structured outputs** (`output_config.format` with `audit-schema.json`) enforce the JSON shape.
  Current models (Sonnet 5.5 and later generations) reject assistant prefill with a 400 error.
- No `temperature`/`top_p` (non-default values return 400 on current models); the answer is read
  from the first `text` block (thinking blocks may come first); `max_tokens` = 8000.
- **Prompt caching**: the static framework catalog is a `cache_control: ephemeral` system block.
- Default model `claude-haiku-5-5` (fast, low cost). Set `LLM_MODEL` to `claude-sonnet-5-5` for
  deeper reasoning (and lower `DAILY_LIMIT`).

## Credit protection (public endpoint)

- `ALLOWED_ORIGINS` — only these origins may call it from a browser (no CORS headers are sent).
- `PER_IP_HOURLY` (default 10) and `DAILY_LIMIT` (default 150) — file counters in the system temp
  dir; IPs are HMAC-hashed per day, never stored raw. Over the limit → HTTP 429 → demo fallback.
- Errors are logged with the prefix `[grcaudit]` (hPanel → PHP error log); details never reach
  the browser.

Requires PHP 7.4+ with cURL (standard on Hostinger).
