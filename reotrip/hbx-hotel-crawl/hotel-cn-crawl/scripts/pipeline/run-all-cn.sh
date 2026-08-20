#!/usr/bin/env bash
# Full mainland CN pipeline wave:
#   1) list all destinations (skip done)
#   2) product skeleton for new hotels
#   3) enrich bilingual detail + main image
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
STATE="/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state"
mkdir -p "$STATE"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$STATE/run-all-cn-${STAMP}.log"

exec > >(tee -a "$LOG") 2>&1

echo "=== run-all-cn start ${STAMP} ==="
echo "cwd=$ROOT"

# ensure chrome
bash scripts/launch-chrome-debug.sh || true
sleep 2

echo "=== phase1 list includeRest ==="
node scripts/pipeline/phase1-hotel-lists.mjs --includeRest=true

echo "=== phase2 product skeleton (skips existing) ==="
node scripts/pipeline/phase2-hotel-products.mjs

echo "=== phase2 enrich (skips contentStatus=ok) ==="
# no dest filter => all list folders
# phase2-enrich requires --dest; expand from list folders
DESTS=$(ls /Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/01-destination-lists | sed 's/-.*//' | sort -u | paste -sd, -)
echo "DESTS=$DESTS"
node scripts/pipeline/phase2-enrich-content.mjs --dest="$DESTS" --batchSize=20 --delayMs=500

echo "=== run-all-cn finished ==="
bash scripts/monitor-external-disk.sh | tail -1
