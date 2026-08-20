#!/usr/bin/env bash
# Master supervisor: keep national hotel crawl advancing forever until
# hotel-level detail pending=0 AND calendar crawl has been started/kept alive.
#
# Usage:
#   nohup bash scripts/pipeline/run-forever.sh >> .../00-state/run-forever.log 2>&1 &
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
STATE="/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state"
LOG="$STATE/run-forever.log"
POLL="${POLL_SEC:-120}"
mkdir -p "$STATE"

log() { echo "[forever $(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

ensure_cdp() {
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9222/json/version 2>/dev/null | grep -q 200; then
    return 0
  fi
  log "CDP down — launching chrome"
  bash scripts/launch-chrome-debug.sh || true
  sleep 12
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9222/json/version 2>/dev/null | grep -q 200
}

alive_pidfile() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  local pid
  pid=$(cat "$f" 2>/dev/null || echo "")
  [[ -n "$pid" ]] || return 1
  ps -p "$pid" >/dev/null 2>&1
}

refresh_pending_dests() {
  python3 - <<'PY'
from pathlib import Path
import json
state = Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state")
codes = (state / "all-dest-codes.txt").read_text().strip().split(",")
prods = Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/02-hotel-products")
lists = Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/01-destination-lists")
ok = pend = 0
pending = []
for code in codes:
    folder = next((d for d in lists.iterdir() if d.name.startswith(code + "-") or d.name == code), None)
    hotels = []
    if folder and (folder / "hotel-list.jsonl").exists():
        hotels = [json.loads(l)["hotelCode"] for l in open(folder / "hotel-list.jsonl") if l.strip()]
    pdir = prods / code
    dpend = 0
    for hc in hotels:
        pj = pdir / str(hc) / "product.json"
        good = False
        if pj.exists():
            try:
                o = json.loads(pj.read_text())
                # detail done: has bilingual payloads; accept complete|partial|ok|ok_no_intro
                st = o.get("contentStatus")
                good = bool(o.get("detailZh") and o.get("detailEn")) and st in (
                    "complete", "partial", "ok", "ok_no_intro"
                )
            except Exception:
                good = False
        if good:
            ok += 1
        else:
            pend += 1
            dpend += 1
    if dpend:
        pending.append(code)
(state / "pending-dest-codes.txt").write_text(",".join(pending))
print(f"{ok} {pend} {ok+pend} {len(pending)}")
PY
}

start_enrich() {
  ensure_cdp || { log "cannot start enrich: CDP failed"; return 1; }
  refresh_pending_dests >/dev/null
  local codes
  if [[ -s "$STATE/pending-dest-codes.txt" ]]; then
    codes=$(tr -d '\n' <"$STATE/pending-dest-codes.txt")
  else
    codes=$(tr -d '\n' <"$STATE/all-dest-codes.txt")
  fi
  [[ -n "$codes" ]] || { log "no dest codes"; return 1; }
  local rlog="$STATE/gentle-enrich-forever-$(date +%Y%m%d-%H%M%S).log"
  # optimal: detail batch20 + delay 600ms (API cap ~20 codes/req)
  nohup node scripts/pipeline/phase2-enrich-content.mjs \
    --dest="$codes" --batchSize=20 --delayMs=600 --destPauseMs=500 \
    >"$rlog" 2>&1 &
  echo $! >"$STATE/gentle-enrich.pid"
  echo "$rlog" >"$STATE/gentle-enrich-latest.logpath"
  log "started enrich OPTIMAL batch=20 delay=600 pid=$(cat "$STATE/gentle-enrich.pid") log=$rlog"
}

start_calendar() {
  ensure_cdp || { log "cannot start calendar: CDP failed"; return 1; }
  # ensure probe hit file exists
  local hit
  hit=$(python3 - <<'PY'
import json
from pathlib import Path
p=Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state/probes/calendar-probe-latest.json")
try:
  d=json.loads(p.read_text())
  print("yes" if d.get("probe",{}).get("ok") and d.get("probe",{}).get("hit") else "no")
except Exception:
  print("no")
PY
)
  if [[ "$hit" != "yes" ]]; then
    log "calendar probe miss — running probe-calendar"
    node scripts/pipeline/probe-calendar.mjs --dest=PEK >>"$LOG" 2>&1 || true
  fi
  local codes
  codes=$(tr -d '\n' <"$STATE/all-dest-codes.txt")
  local clog="$STATE/calendar-crawl-forever-$(date +%Y%m%d-%H%M%S).log"
  # fullRoom: every date × every room × board (3.0/hotels), hotelBatch for speed
  nohup node scripts/pipeline/phase3-calendar-prices.mjs \
    --dest="$codes" --limit=999999 --mode=fullRoom --daysAhead=90 --dayStep=1 --hotelBatch=8 --delayMs=1000 \
    >"$clog" 2>&1 &
  echo $! >"$STATE/calendar-crawl.pid"
  echo "$clog" >"$STATE/calendar-crawl-latest.logpath"
  log "started calendar FULL-ROOM days=90 hotelBatch=8 delay=1000 pid=$(cat "$STATE/calendar-crawl.pid") log=$clog"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) forever calendar started" >>"$STATE/strategy-switch.log"
}

# Content quality upgrade: LOCATION intros + complete/partial gate (not min detail)
content_upgrade_pending() {
  python3 - <<'PY'
from pathlib import Path
import json
root = Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/02-hotel-products")
need = 0
for dest in root.iterdir():
    if not dest.is_dir() or dest.name.startswith("_"):
        continue
    for h in dest.iterdir():
        # only hotel directories — skip files like _hotel-index.jsonl (was false +403)
        if not h.is_dir() or h.name.startswith("_"):
            continue
        pj = h / "product.json"
        if not pj.exists():
            need += 1
            continue
        try:
            o = json.loads(pj.read_text())
        except Exception:
            need += 1
            continue
        # LOCATION already evaluated under complete|partial|failed
        st = o.get("contentStatus")
        if o.get("detailLevel") == "LOCATION" and st in ("complete", "partial", "failed"):
            continue
        need += 1
print(need)
PY
}

start_content_upgrade() {
  ensure_cdp || { log "cannot start content upgrade: CDP failed"; return 1; }
  local codes
  codes=$(tr -d '\n' <"$STATE/all-dest-codes.txt")
  local ulog="$STATE/upgrade-desc-national-$(date +%Y%m%d-%H%M%S).log"
  nohup node scripts/pipeline/phase2-enrich-content.mjs \
    --dest="$codes" --limit=999999 --upgradeDesc=true --batchSize=20 --delayMs=600 --destPauseMs=400 --skipImages=false \
    >"$ulog" 2>&1 &
  echo $! >"$STATE/upgrade-desc.pid"
  echo "$ulog" >"$STATE/upgrade-desc-latest.logpath"
  log "started content UPGRADE LOCATION+qualityGate pid=$(cat "$STATE/upgrade-desc.pid") log=$ulog"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) content upgradeDesc started" >>"$STATE/strategy-switch.log"
}

# Zone list image backfill (resumable) — for mapping EN+images
zone_image_pending() {
  python3 - <<'PY'
from pathlib import Path
import json
done=set()
p=Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state/content-quality/zone-image-dests-done.json")
try:
  done=set(json.loads(p.read_text()))
except Exception:
  pass
codes=Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state/all-dest-codes.txt").read_text().strip().split(",")
print(max(0, len([c for c in codes if c]) - len(done)))
PY
}

start_zone_image_backfill() {
  ensure_cdp || { log "cannot start zone image backfill: CDP failed"; return 1; }
  local zlog="$STATE/zone-image-backfill-$(date +%Y%m%d-%H%M%S).log"
  nohup node scripts/pipeline/phase2b-zone-image-backfill.mjs --delayMs=400 \
    >"$zlog" 2>&1 &
  echo $! >"$STATE/zone-image-backfill.pid"
  echo "$zlog" >"$STATE/zone-image-backfill-latest.logpath"
  log "started ZONE image backfill pid=$(cat "$STATE/zone-image-backfill.pid") log=$zlog"
}

calendar_progress() {
  python3 - <<'PY'
from pathlib import Path
import json
codes=open("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/00-state/all-dest-codes.txt").read().strip().split(",")
prods=Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/02-hotel-products")
lists=Path("/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/01-destination-lists")
ok=pend=cal_ok=cal_pend=0
for code in codes:
    folder=next((d for d in lists.iterdir() if d.name.startswith(code+"-") or d.name==code), None)
    hotels=[]
    if folder and (folder/"hotel-list.jsonl").exists():
        hotels=[json.loads(l)["hotelCode"] for l in open(folder/"hotel-list.jsonl") if l.strip()]
    pdir=prods/code
    for hc in hotels:
        pj=pdir/str(hc)/"product.json"
        good=False
        if pj.exists():
            try:
                o=json.loads(pj.read_text())
                st=o.get("contentStatus")
                good=bool(o.get("detailZh") and o.get("detailEn")) and st in (
                    "complete","partial","ok","ok_no_intro"
                )
            except Exception:
                good=False
        if good: ok+=1
        else: pend+=1
        # only fullRoom (date×room×board) counts as done — not min-price calendar
        filled=False
        meta=pdir/str(hc)/"calendar-meta.json"
        cj=pdir/str(hc)/"calendar.json"
        try:
            if meta.exists():
                m=json.loads(meta.read_text())
                if m.get("mode")=="fullRoom" and m.get("status")=="ok" and int(m.get("daysDone") or 0)>=90:
                    filled=True
            if not filled and cj.exists():
                c=json.loads(cj.read_text())
                if c.get("mode")=="fullRoom" and c.get("status")=="ok" and int(c.get("daysDone") or 0)>=90:
                    filled=True
        except Exception:
            filled=False
        if filled: cal_ok+=1
        else: cal_pend+=1
print(f"{ok} {pend} {cal_ok} {cal_pend}")
PY
}

log "master supervisor started poll=${POLL}s"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) run-forever started" >>"$STATE/strategy-switch.log"

while true; do
  ensure_cdp || log "WARN CDP still down"

  read -r DOK DPEND TOTAL <<<"$(refresh_pending_dests)"
  read -r _ _ CALOK CALPEND <<<"$(calendar_progress)"
  CUPEND=$(content_upgrade_pending 2>/dev/null || echo "1")
  ZIPEND=$(zone_image_pending 2>/dev/null || echo "1")
  log "detail ok=$DOK pending=$DPEND | content-upgrade pending≈$CUPEND | zone-image dests left≈$ZIPEND | calendar filled=$CALOK pending=$CALPEND"

  # Phase A: detail enrich until hotel pending=0 (missing product payloads)
  if [[ "${DPEND:-1}" != "0" ]]; then
    if ! alive_pidfile "$STATE/gentle-enrich.pid"; then
      log "enrich dead with pending=$DPEND — restart"
      start_enrich || true
    else
      log "enrich alive pid=$(cat "$STATE/gentle-enrich.pid")"
    fi
  else
    log "DETAIL COMPLETE ok=$DOK"
    # Phase A2: content quality upgrade (LOCATION intro + complete/partial) until done
    if [[ "${CUPEND:-1}" != "0" ]]; then
      if ! alive_pidfile "$STATE/upgrade-desc.pid"; then
        log "content upgrade dead with pending≈$CUPEND — start/restart"
        start_content_upgrade || true
      else
        log "content upgrade alive pid=$(cat "$STATE/upgrade-desc.pid")"
      fi
    else
      log "CONTENT UPGRADE COMPLETE (all LOCATION evaluated)"
    fi
    # Phase A3: zone image backfill for mapping (EN content + photos)
    if [[ "${ZIPEND:-1}" != "0" ]]; then
      if ! alive_pidfile "$STATE/zone-image-backfill.pid"; then
        log "zone image backfill dead with dests left≈$ZIPEND — start/restart"
        start_zone_image_backfill || true
      else
        log "zone image backfill alive pid=$(cat "$STATE/zone-image-backfill.pid")"
      fi
    else
      log "ZONE IMAGE BACKFILL COMPLETE"
    fi
    # Phase B: calendar (parallel)
    if [[ "${CALPEND:-1}" != "0" ]]; then
      if ! alive_pidfile "$STATE/calendar-crawl.pid"; then
        log "calendar dead/not started with cal_pending=$CALPEND — start/restart"
        start_calendar || true
      else
        log "calendar alive pid=$(cat "$STATE/calendar-crawl.pid")"
      fi
    else
      log "CALENDAR COMPLETE for listed hotels"
    fi
    if [[ "${CUPEND:-1}" == "0" && "${ZIPEND:-1}" == "0" && "${CALPEND:-1}" == "0" ]]; then
      log "ALL DONE detail+content+images+calendar"
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) forever ALL DONE detail+content+images+calendar" >>"$STATE/strategy-switch.log"
      # keep looping slowly in case new work appears
      sleep 600
      continue
    fi
  fi

  sleep "$POLL"
done
