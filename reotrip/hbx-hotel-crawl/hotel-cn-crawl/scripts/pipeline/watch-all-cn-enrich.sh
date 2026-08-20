#!/usr/bin/env bash
# Watchdog: keep gentle national enrich running until all listed hotels contentStatus=ok
# Follows same pattern as watch-tier1-enrich.sh; skips already-ok hotels automatically.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
STATE="/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state"
PIDFILE="$STATE/gentle-enrich.pid"
CODES_FILE="$STATE/all-dest-codes.txt"
INTERVAL="${WATCH_INTERVAL:-180}"

log() { echo "[watch-all $(date '+%Y-%m-%d %H:%M:%S')] $*"; }

coverage() {
  # Hotel-level pending (authoritative). dest contentStatus alone is NOT enough.
  python3 - <<'PY'
from pathlib import Path
import json
codes = open("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state/all-dest-codes.txt").read().strip().split(",")
prods = Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/02-hotel-products")
ok = pend = 0
for code in codes:
    pdir = prods / code
    if not pdir.exists():
        continue
    for d in pdir.iterdir():
        if not d.is_dir() or d.name.startswith("_"):
            continue
        pj = d / "product.json"
        try:
            o = json.loads(pj.read_text())
            good = o.get("contentStatus") == "ok" and o.get("detailZh") and o.get("detailEn")
        except Exception:
            good = False
        if good:
            ok += 1
        else:
            pend += 1
total = ok + pend
print(f"hotels_ok={ok}/{total} pending={pend} pct={round(100*ok/max(1,total),1)}")
print(pend)
PY
}

start_enrich() {
  if [[ -f "$STATE/pending-dest-codes.txt" && -s "$STATE/pending-dest-codes.txt" ]]; then
    CODES=$(tr -d '\n' <"$STATE/pending-dest-codes.txt")
  else
    CODES=$(tr -d '\n' <"$CODES_FILE")
  fi
  LOG="$STATE/gentle-enrich-all-cn-$(date +%Y%m%d-%H%M%S).log"
  nohup node scripts/pipeline/phase2-enrich-content.mjs \
    --dest="$CODES" --batchSize=20 --delayMs=600 --destPauseMs=500 \
    >"$LOG" 2>&1 &
  echo $! >"$PIDFILE"
  echo "$LOG" >"$STATE/gentle-enrich-latest.logpath"
  log "started OPTIMAL batch=20 delay=600 pid=$(cat "$PIDFILE") log=$LOG"
}

alive() {
  [[ -f "$PIDFILE" ]] || return 1
  local pid
  pid=$(cat "$PIDFILE" 2>/dev/null || echo "")
  [[ -n "$pid" ]] || return 1
  ps -p "$pid" >/dev/null 2>&1
}

if ! curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9222/json/version | grep -q 200; then
  log "CDP down — launching chrome"
  bash scripts/launch-chrome-debug.sh || true
  sleep 8
fi

if ! alive; then
  log "enrich not running — start"
  start_enrich
else
  log "enrich already running pid=$(cat "$PIDFILE")"
fi

while true; do
  cov=$(coverage)
  summary=$(echo "$cov" | head -1)
  pend=$(echo "$cov" | tail -1)
  log "$summary"
  if alive; then
    log "enrich alive pid=$(cat "$PIDFILE")"
    # tail last batch lines
    LATEST=$(cat "$STATE/gentle-enrich-latest.logpath" 2>/dev/null || true)
    if [[ -n "${LATEST:-}" && -f "$LATEST" ]]; then
      tail -3 "$LATEST" | while read -r line; do log "log: $line"; done
    fi
  else
    log "enrich died — restarting"
    start_enrich
  fi
  # all dest contentStatus done
  if [[ "$pend" == "0" ]]; then
    log "ALL-CN CONTENT COMPLETE"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) all-cn enrich complete $summary" >>"$STATE/strategy-switch.log"
    break
  fi
  sleep "$INTERVAL"
done
