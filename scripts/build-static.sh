#!/usr/bin/env bash
# Build a fully static site (grounded demo engine, runs client-side) for shared
# hosting such as Hostinger. Output goes to ./out and is served under the
# /grcaudit path by default. Override with: BASE_PATH=/something bash scripts/build-static.sh
# For a subdomain root (e.g. grcaudit.cybersecinfo.com) use: BASE_PATH="" bash scripts/build-static.sh
set -e
cd "$(dirname "$0")/.."

# A static export cannot include a POST API route, so move it aside for the build.
moved=0
if [ -d src/app/api ]; then mv src/app/api ./.api-bak && moved=1; fi
cleanup() { if [ "$moved" = "1" ] && [ -d ./.api-bak ]; then mv ./.api-bak src/app/api; fi; }
trap cleanup EXIT

STATIC_EXPORT=1 BASE_PATH="${BASE_PATH-/grcaudit}" npx next build

echo ""
echo "Static site generated in ./out  (basePath: ${BASE_PATH-/grcaudit})"
echo "Upload the CONTENTS of ./out into the /grcaudit folder on your host."
