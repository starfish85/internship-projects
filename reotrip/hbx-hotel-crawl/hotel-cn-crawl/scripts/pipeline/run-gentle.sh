#!/usr/bin/env bash
# Gentle-XHR strategy: slow pure-API crawl without SPA UI thrashing.
# Usage:
#   bash scripts/pipeline/run-gentle.sh list-tier1
#   bash scripts/pipeline/run-gentle.sh enrich-all
#   bash scripts/pipeline/run-gentle.sh list-only PEK,PVG
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
DATA="/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state"
mkdir -p "$DATA" artifacts/logs
CMD="${1:-}"
shift || true

log() { echo "[gentle $(date '+%H:%M:%S')] $*"; }

case "$CMD" in
  list-tier1)
    log "re-list 北上广深 with ftsSize=2000 multi-query (force merge)"
    node scripts/pipeline/phase1-hotel-lists.mjs --only=PEK,PVG,CN1,SZX --force=true \
      2>&1 | tee "$DATA/gentle-list-tier1-$(date +%Y%m%d-%H%M%S).log"
    ;;
  list-only)
    ONLY="${1:-PEK}"
    log "re-list only=$ONLY force merge"
    node scripts/pipeline/phase1-hotel-lists.mjs --only="$ONLY" --force=true \
      2>&1 | tee "$DATA/gentle-list-$(date +%Y%m%d-%H%M%S).log"
    ;;
  enrich-all)
    CODES="$(tr '\n' ',' < "$DATA/all-dest-codes.txt" | sed 's/,$//')"
    log "enrich pending hotels gently batch=8 delay=1500"
    nohup node scripts/pipeline/phase2-enrich-content.mjs \
      --dest="$CODES" --batchSize=8 --delayMs=1500 \
      > "$DATA/gentle-enrich-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
    echo $! | tee "$DATA/gentle-enrich.pid"
    log "started pid=$(cat "$DATA/gentle-enrich.pid")"
    ;;
  enrich-tier1)
    log "enrich tier1 gently"
    nohup node scripts/pipeline/phase2-enrich-content.mjs \
      --dest=PEK,PVG,CN1,SZX --batchSize=8 --delayMs=1500 \
      > "$DATA/gentle-enrich-tier1-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
    echo $! | tee "$DATA/gentle-enrich.pid"
    log "started pid=$(cat "$DATA/gentle-enrich.pid")"
    ;;
  status)
    if [[ -f "$DATA/gentle-enrich.pid" ]]; then
      pid=$(cat "$DATA/gentle-enrich.pid")
      if ps -p "$pid" >/dev/null 2>&1; then
        log "enrich running pid=$pid"
        tail -5 "$DATA"/gentle-enrich-*.log 2>/dev/null | tail -5
      else
        log "enrich not running (last pid=$pid)"
      fi
    else
      log "no gentle-enrich.pid"
    fi
    curl -s -o /dev/null -w "cdp=%{http_code}\n" http://127.0.0.1:9222/json/version || echo "cdp=down"
    ;;
  *)
    echo "Usage: $0 {list-tier1|list-only CODE|enrich-all|enrich-tier1|status}"
    exit 1
    ;;
esac
