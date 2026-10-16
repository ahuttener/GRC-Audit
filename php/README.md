# GRC Audit on Hostinger (PHP) — LLM mode without Node

Your Hostinger runs PHP (like BRDeals), so the LLM mode can run there with a small PHP endpoint that
calls Claude server-side. The front-end stays static; only the key lives on the server.

## 1. Build the static front-end to use the PHP endpoint

```bash
STATIC_EXPORT=1 \
BASE_PATH=/grcaudit \
NEXT_PUBLIC_USE_API=1 \
NEXT_PUBLIC_API_URL="api/audit-incident.php" \
bash scripts/build-static.sh
```

(For a subdomain root like `grcaudit.cybersecinfo.com`, use `BASE_PATH=""`.)

## 2. Upload to Hostinger (hPanel → File Manager), into the `grcaudit` folder:

```
grcaudit/
├── index.html, _next/, ...        ← contents of ./out
└── api/
    ├── audit-incident.php          ← php/audit-incident.php
    ├── config.php                  ← your key (see below) — NOT committed
    └── frameworks/                 ← copy the 6 JSON files from src/data/frameworks/
```

## 3. Add your key

Copy `config.sample.php` to `config.php` and paste your Anthropic key:

```php
return [ 'ANTHROPIC_API_KEY' => 'sk-ant-...' ];
```

The key spends your Claude **Max** plan's monthly API credits (claude.ai → Settings → Billing →
API credits → Link organization, then create a key in the Console).

## 4. Done

Open `https://cybersecinfo.com/grcaudit`. Type any incident → the PHP endpoint calls Claude, the
browser verifies the cited control IDs against the catalogs (the green "Grounded" badge), and shows
the full audit. Without a key (or if the call fails) the site still works in the built-in demo mode.

### Security notes
- `config.php` holds the key server-side; the browser never receives it.
- Requires PHP cURL (standard on Hostinger). Keep the key out of the repo.
