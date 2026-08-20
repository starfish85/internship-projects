#!/usr/bin/env bash
# Watchdog: keep gentle tier1 enrich running until PEK/PVG/CN1/SZX pending=0
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
STATE="/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state"
PIDFILE="$STATE/gentle-enrich.pid"
LOGDIR="$STATE"
INTERVAL="${WATCH_INTERVAL:-120}"

log() { echo "[watch $(date '+%Y-%m-%d %H:%M:%S')] $*"; }

coverage() {
  python3 - <<'PY'
from pathlib import Path
import json
lists=Path('/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/01-destination-lists')
prods=Path('/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/02-hotel-products')
total=ok=0
parts=[]
for code in ['PEK','PVG','CN1','SZX']:
    d=next(lists.glob(f'{code}-*'))
    hotels=[json.loads(l)['hotelCode'] for l in open(d/'hotel-list.jsonl') if l.strip()]
    n=0
    for hc in hotels:
        p=prods/code/str(hc)/'product.json'
        if not p.exists():
            continue
        try:
            o=json.loads(p.read_text())
            if o.get('contentStatus')=='ok' and o.get('detailZh') and o.get('detailEn'):
                n+=1
        except Exception:
            pass
    total+=len(hotels); ok+=n
    parts.append(f'{code}:{n}/{len(hotels)}')
pend=total-ok
print('|'.join(parts)+f'|ALL:{ok}/{total}|pending={pend}')
print(pend)
PY
}

start_enrich() {
  LOG="$LOGDIR/gentle-enrich-tier1-$(date +%Y%m%d-%H%M%S).log"
  nohup node scripts/pipeline/phase2-enrich-content.mjs \
    --dest=PEK,PVG,CN1,SZX --batchSize=8 --delayMs=1500 \
    >"$LOG" 2>&1 &
  echo $! >"$PIDFILE"
  echo "$LOG" >"$LOGDIR/gentle-enrich-latest.logpath"
  log "started pid=$(cat "$PIDFILE") log=$LOG"
}

alive() {
  [[ -f "$PIDFILE" ]] || return 1
  local pid
  pid=$(cat "$PIDFILE" 2>/dev/null || echo "")
  [[ -n "$pid" ]] || return 1
  ps -p "$pid" >/dev/null 2>&1
}

# ensure chrome
if ! curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9222/json/version | grep -q 200; then
  log "CDP down — launching chrome"
  bash scripts/launch-chrome-debug.sh || true
  sleep 8
fi

if ! alive; then
  log "enrich not running — start"
  start_enrich
fi

while true; do
  cov=$(coverage)
  summary=$(echo "$cov" | head -1)
  pend=$(echo "$cov" | tail -1)
  log "$summary"
  if [[ "$pend" == "0" ]]; then
    log "TIER1 COMPLETE"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) tier1 enrich complete $summary" >>"$STATE/strategy-switch.log"
    exit 0
  fi
  if ! alive; then
    log "enrich died — restarting"
    # quick token check / warm page
    node --input-type=module -e '
import { chromium } from "playwright";
import { loadConfig } from "./lib/paths.mjs";
import { ensureSession } from "./lib/api-client.mjs";
const cfg=await loadConfig();
const b=await chromium.connectOverCDP("http://127.0.0.1:"+cfg.chrome.remoteDebuggingPort,{timeout:8000}).catch(()=>null);
if(!b){console.error("no cdp"); process.exit(2)}
const ctx=b.contexts()[0];
const page=ctx.pages().find(p=>/gta-travel|bedsonline/.test(p.url()))||await ctx.newPage();
const s=await ensureSession(page,cfg.site);
console.log("session",s.ok,s.via,s.token?.length||0);
process.exit(s.ok?0:3);
' || {
      log "session restore failed — wait and retry"
      sleep 60
      continue
    }
    start_enrich
  fi
  sleep "$INTERVAL"
done
