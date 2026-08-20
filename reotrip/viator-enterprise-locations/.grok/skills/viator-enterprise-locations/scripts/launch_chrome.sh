#!/usr/bin/env bash
# Start a dedicated Chrome with remote debugging. Does not touch the user's
# daily Chrome profile. Log into Viator in the window that opens.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
if [[ ! -d "$PROJECT_ROOT/data" ]]; then
  echo "Cannot find project root from $SCRIPT_DIR" >&2
  exit 1
fi

PROFILE_DIR="${VIATOR_CHROME_PROFILE:-$PROJECT_ROOT/browser-profile}"
PORT="${VIATOR_CDP_PORT:-9222}"
CHROME="${VIATOR_CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found at: $CHROME" >&2
  echo "Set VIATOR_CHROME_BIN to your Chrome executable." >&2
  exit 1
fi

if curl -sf "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then
  echo "Chrome CDP already listening on port ${PORT}."
  curl -s "http://127.0.0.1:${PORT}/json/version"
  echo "Project: $PROJECT_ROOT"
  echo "Profile: $PROFILE_DIR"
  exit 0
fi

mkdir -p "$PROFILE_DIR"

echo "Launching Chrome"
echo "  project: $PROJECT_ROOT"
echo "  profile: $PROFILE_DIR"
echo "  debug:   127.0.0.1:${PORT}"
echo "Log into https://supplier.viator.com/products/ in this window, then tell Grok 已登录."

exec "$CHROME" \
  --user-data-dir="$PROFILE_DIR" \
  --remote-debugging-port="$PORT" \
  --remote-debugging-address=127.0.0.1 \
  --no-first-run \
  --no-default-browser-check \
  --disable-features=Translate \
  "https://supplier.viator.com/products/" \
  "https://www.tripadvisor.co.uk/"
