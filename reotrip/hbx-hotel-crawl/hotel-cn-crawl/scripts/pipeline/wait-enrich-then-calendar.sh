#!/usr/bin/env bash
# Wait until national product enrich is complete, then research calendar price APIs
# and (if probe HIT) start limited calendar crawl.
#
# Usage:
#   nohup bash scripts/pipeline/wait-enrich-then-calendar.sh &
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
STATE="/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state"
PROBE_DIR="$STATE/probes"
LOG="$STATE/wait-then-calendar.log"
POLL_SEC="${POLL_SEC:-180}"
mkdir -p "$STATE" "$PROBE_DIR"

log() { echo "[wait-cal $(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

count_pending() {
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
print(f"{ok} {pend} {ok+pend}")
PY
}

enrich_alive() {
  local pid
  pid=$(cat "$STATE/gentle-enrich.pid" 2>/dev/null || echo "")
  [[ -n "$pid" ]] && ps -p "$pid" >/dev/null 2>&1
}

ensure_cdp() {
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9222/json/version | grep -q 200; then
    return 0
  fi
  log "CDP down — launching chrome"
  bash scripts/launch-chrome-debug.sh || true
  sleep 10
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9222/json/version | grep -q 200
}

log "started: wait for national enrich, then calendar probe/crawl"
log "poll every ${POLL_SEC}s"

while true; do
  read -r OK PEND TOTAL <<<"$(count_pending)"
  log "progress ok=$OK pending=$PEND total=$TOTAL pct=$(python3 -c "print(round(100*$OK/max(1,$TOTAL),1))")%"
  if [[ "${PEND:-1}" == "0" && "${TOTAL:-0}" -gt 1000 ]]; then
    log "NATIONAL ENRICH COMPLETE ok=$OK (hotel-level)"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) national enrich complete hotel-level ok=$OK pending=0" >>"$STATE/strategy-switch.log"
    break
  fi
  if ! enrich_alive; then
    log "enrich not running while pending=$PEND — restarting enrich"
    ensure_cdp || true
    # ensure watch/enrich are running again
    if ! curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9222/json/version | grep -q 200; then
      bash scripts/launch-chrome-debug.sh || true
      sleep 10
    fi
    if ! enrich_alive; then
      CODES=$(tr -d '\n' <"$STATE/all-dest-codes.txt")
      RLOG="$STATE/gentle-enrich-all-cn-$(date +%Y%m%d-%H%M%S).log"
      nohup node scripts/pipeline/phase2-enrich-content.mjs \
        --dest="$CODES" --batchSize=20 --delayMs=600 --destPauseMs=500 \
        >"$RLOG" 2>&1 &
      echo $! >"$STATE/gentle-enrich.pid"
      echo "$RLOG" >"$STATE/gentle-enrich-latest.logpath"
      log "restarted enrich pid=$(cat "$STATE/gentle-enrich.pid") log=$RLOG"
    fi
  fi
  sleep "$POLL_SEC"
done

# --- Phase: calendar crawl (probe already HIT 2026-07-29) ---
log "=== calendar crawl phase ==="
if ! ensure_cdp; then
  log "FATAL: CDP unavailable after enrich complete"
  exit 2
fi

node scripts/probe-session.mjs --waitUserMs=90000 >>"$LOG" 2>&1 || {
  log "WARN: probe-session failed — continue anyway if token exists"
}

HIT_FLAG=$(python3 - <<'PY'
import json
from pathlib import Path
p = Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state/probes/calendar-probe-latest.json")
try:
    d = json.loads(p.read_text())
    print("yes" if d.get("probe", {}).get("ok") and d.get("probe", {}).get("hit") else "no")
except Exception:
    print("no")
PY
)
log "calendar probe hit=$HIT_FLAG"

if [[ "$HIT_FLAG" != "yes" ]]; then
  log "probe miss — re-run probe-calendar"
  node scripts/pipeline/probe-calendar.mjs --dest=PEK >>"$LOG" 2>&1 || true
  HIT_FLAG=$(python3 - <<'PY'
import json
from pathlib import Path
p = Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state/probes/calendar-probe-latest.json")
try:
    d = json.loads(p.read_text())
    print("yes" if d.get("probe", {}).get("ok") and d.get("probe", {}).get("hit") else "no")
except Exception:
    print("no")
PY
  )
fi

if [[ "$HIT_FLAG" == "yes" ]]; then
  CODES=$(tr -d '\n' <"$STATE/all-dest-codes.txt")
  # 14 days, every day, gentle delay; skip already-filled calendars
  CLOG="$STATE/calendar-crawl-all-cn-$(date +%Y%m%d-%H%M%S).log"
  nohup node scripts/pipeline/phase3-calendar-prices.mjs \
    --dest="$CODES" --limit=999999 --mode=fullRoom --daysAhead=90 --hotelBatch=8 --delayMs=1000 \
    >"$CLOG" 2>&1 &
  echo $! >"$STATE/calendar-crawl.pid"
  log "calendar FULL-ROOM days=90 hotelBatch=8 pid=$(cat "$STATE/calendar-crawl.pid") log=$CLOG"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) calendar national crawl started fullRoom days=90" >>"$STATE/strategy-switch.log"
else
  log "NO HIT — cannot start calendar crawl"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) calendar probe still miss after enrich" >>"$STATE/strategy-switch.log"
fi

log "wait-enrich-then-calendar finished setup"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) wait-then-calendar pipeline finished hit=$HIT_FLAG" >>"$STATE/strategy-switch.log"
