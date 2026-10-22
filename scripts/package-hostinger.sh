#!/usr/bin/env bash
# Build and assemble the ready-to-upload Hostinger bundle for cybersecinfo.com/grcaudit.
#   bash scripts/package-hostinger.sh
# Output: dist-hostinger/grcaudit-hostinger.zip — extract it inside public_html (creates grcaudit/).
# The static front-end calls the PHP endpoint (api/audit-incident.php) for AI mode and falls back
# to the built-in demo engine when AI is unavailable, not configured or rate-limited.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${BASE_PATH-/grcaudit}"

STATIC_EXPORT=1 BASE_PATH="$BASE" NEXT_PUBLIC_USE_API=1 NEXT_PUBLIC_API_URL="api/audit-incident.php" \
  NEXT_PUBLIC_TRACK_URL="api/track.php" NEXT_PUBLIC_INDICATORS_URL="api/indicators.php" \
  bash scripts/build-static.sh

rm -rf dist-hostinger
mkdir -p dist-hostinger/grcaudit/api/frameworks
cp -r out/. dist-hostinger/grcaudit/
cp hosting/.htaccess dist-hostinger/grcaudit/.htaccess
sed -i "s#/grcaudit/404.html#${BASE}/404.html#" dist-hostinger/grcaudit/.htaccess
cp hosting/COMO-INSTALAR.txt dist-hostinger/  # install notes stay OUT of the public web folder
cp php/audit-incident.php php/track.php php/indicators.php php/_metrics-lib.php php/grcaudit-config.sample.php \
  dist-hostinger/grcaudit/api/
cp src/data/audit-schema.json dist-hostinger/grcaudit/api/
# Curated scenario ids: only these (or "custom") are accepted by the indicators.
grep -o 'archetype: "[a-z0-9-]*"' src/data/scenarios.ts | sed 's/archetype: //' | paste -sd, - \
  | sed 's/^/[/; s/$/]/' > dist-hostinger/grcaudit/api/scenarios.json
cp src/data/frameworks/*.json dist-hostinger/grcaudit/api/frameworks/

(cd dist-hostinger && zip -r -q grcaudit-hostinger.zip grcaudit)
echo ""
echo "Bundle ready: dist-hostinger/grcaudit-hostinger.zip"
echo "Upload it to public_html on the host and extract it (creates the grcaudit/ folder)."
