#!/usr/bin/env bash
# Launch a dedicated Google Chrome instance with remote debugging for Playwright CDP.
# Safe to run alongside a normal Chrome window (uses a separate user-data-dir).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${CHROME_DEBUG_PORT:-9222}"
PROFILE="${CHROME_USER_DATA_DIR:-${ROOT}/browser-profile/chrome-debug}"
CHROME_BIN="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
URL="${START_URL:-https://app-bedsonline.gta-travel.cn/main?mkt=CN}"

if [[ ! -x "${CHROME_BIN}" ]]; then
  echo "Chrome not found at: ${CHROME_BIN}"
  exit 1
fi

# If CDP already up, do not relaunch
if curl -sf "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then
  echo "CDP already listening on port ${PORT}"
  curl -s "http://127.0.0.1:${PORT}/json/version"
  exit 0
fi

mkdir -p "${PROFILE}"
echo "Launching Chrome debug profile:"
echo "  port=${PORT}"
echo "  user-data-dir=${PROFILE}"
echo "  url=${URL}"

# Note: separate profile → first time may need manual login / Chrome saved password import.
# For reusing your main Chrome session, quit main Chrome and set:
#   CHROME_USER_DATA_DIR="$HOME/Library/Application Support/Google/Chrome"
# then re-run this script (only one Chrome may lock that dir).

open -na "Google Chrome" --args \
  --remote-debugging-port="${PORT}" \
  --user-data-dir="${PROFILE}" \
  --no-first-run \
  --no-default-browser-check \
  "${URL}"

# Wait for CDP
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then
    echo "CDP ready:"
    curl -s "http://127.0.0.1:${PORT}/json/version"
    exit 0
  fi
  sleep 0.5
done

echo "Warning: Chrome started but CDP not responding on ${PORT} yet."
exit 0
