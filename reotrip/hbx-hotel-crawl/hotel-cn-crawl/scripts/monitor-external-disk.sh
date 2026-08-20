#!/usr/bin/env bash
# Monitor CodexArchive (WD_BLACK SN850X) health + temperature.
# Writes JSONL + latest snapshot to external volume and local project logs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VOLUME_NAME="${VOLUME_NAME:-CodexArchive}"
MOUNT="/Volumes/${VOLUME_NAME}"
OUT_DIR="${OUT_DIR:-${MOUNT}/hbx-hotel-crawl/monitor}"
LOCAL_MIRROR="${LOCAL_MIRROR:-${ROOT}/artifacts/logs}"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
HOST="$(hostname -s 2>/dev/null || hostname)"

mkdir -p "${OUT_DIR}" 2>/dev/null || true
mkdir -p "${LOCAL_MIRROR}" 2>/dev/null || true

if [[ ! -d "${MOUNT}" ]]; then
  line="{\"ts\":\"${TS}\",\"host\":\"${HOST}\",\"ok\":false,\"error\":\"volume_not_mounted\",\"volume\":\"${VOLUME_NAME}\"}"
  echo "${line}" | tee -a "${LOCAL_MIRROR}/disk-monitor.jsonl"
  echo "${line}" > "${LOCAL_MIRROR}/disk-monitor-latest.json"
  exit 2
fi

vol_info="$(diskutil info "${MOUNT}" 2>/dev/null || true)"
bsd_name="$(echo "${vol_info}" | awk -F': *' '/Device Identifier:/{print $2; exit}')"
part_of="$(echo "${vol_info}" | awk -F': *' '/Part of Whole:/{print $2; exit}')"
smart_status="$(echo "${vol_info}" | awk -F': *' '/SMART Status:/{print $2; exit}')"
protocol="$(echo "${vol_info}" | awk -F': *' '/Protocol:/{print $2; exit}')"
device_name="$(echo "${vol_info}" | awk -F': *' '/Device \/ Media Name:|Media Name:/{print $2; exit}')"

physical_store="$(diskutil list "${part_of:-disk5}" 2>/dev/null | awk '/Physical Store/{print $NF; exit}')"
smart_target="${physical_store:-${part_of:-${bsd_name}}}"
smart_disk="$(echo "${smart_target}" | sed -E 's/s[0-9]+$//')"

temp_c=""
temp_source=""
smart_health=""
smartctl_bin=""
for cand in \
  "$HOME/.local/sbin/smartctl" \
  "$HOME/.local/bin/smartctl" \
  smartctl \
  /opt/homebrew/bin/smartctl \
  /usr/local/bin/smartctl; do
  if [[ -x "${cand}" ]]; then
    smartctl_bin="${cand}"
    break
  elif command -v "${cand}" >/dev/null 2>&1; then
    smartctl_bin="$(command -v "${cand}")"
    break
  fi
done

if [[ -n "${smartctl_bin}" ]]; then
  smart_raw="$("${smartctl_bin}" -a "/dev/${smart_disk}" 2>&1 || true)"
  temp_c="$(echo "${smart_raw}" | awk '
    /^Temperature:/ { for(i=1;i<=NF;i++) if ($i ~ /^[0-9]+$/) { print $i; exit } }
    /Temperature Sensor/ { for(i=1;i<=NF;i++) if ($i ~ /^[0-9]+$/) { print $i; exit } }
    /Temperature_Celsius/ { for(i=NF;i>=1;i--) if ($i ~ /^[0-9]+$/) { print $i; exit } }
  ')"
  smart_health="$(echo "${smart_raw}" | awk -F': *' '/self-assessment test result/{print $2; exit}')"
  if [[ -n "${temp_c}" ]]; then
    temp_source="smartctl:${smartctl_bin}"
  fi
fi

df_line="$(df -k "${MOUNT}" | tail -1)"
df_used_pct="$(echo "${df_line}" | awk '{print $(NF-1)}' | tr -d '%')"
df_avail_k="$(echo "${df_line}" | awk '{print $(NF-2)}')"

probe_file="${OUT_DIR}/.write-probe"
write_ms=""
start=$(python3 - <<'PY'
import time; print(int(time.time()*1000))
PY
)
dd if=/dev/zero of="${probe_file}" bs=1048576 count=8 conv=fsync 2>/dev/null || true
end=$(python3 - <<'PY'
import time; print(int(time.time()*1000))
PY
)
write_ms=$((end - start))
rm -f "${probe_file}" 2>/dev/null || true

alerts=()
if [[ -n "${temp_c}" ]]; then
  if (( temp_c >= 70 )); then alerts+=("temp_critical"); fi
  if (( temp_c >= 60 && temp_c < 70 )); then alerts+=("temp_warn"); fi
fi
if [[ -n "${df_used_pct}" && "${df_used_pct}" -ge 90 ]]; then alerts+=("space_critical"); fi
if [[ -n "${df_used_pct}" && "${df_used_pct}" -ge 80 && "${df_used_pct}" -lt 90 ]]; then alerts+=("space_warn"); fi
if [[ "${smart_status}" != "Verified" && -n "${smart_status}" ]]; then alerts+=("smart_not_verified"); fi
if [[ -n "${smart_health}" && "${smart_health}" != "PASSED" ]]; then alerts+=("smart_health_${smart_health}"); fi

alert_json="$(printf '%s\n' "${alerts[@]:-}" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')"

record="$(
  TEMP_C="${temp_c}" DF_USED="${df_used_pct}" DF_AVAIL="${df_avail_k}" WRITE_MS="${write_ms}" \
  SMARTCTL_BIN="${smartctl_bin}" SMART_HEALTH="${smart_health}" ALERT_JSON="${alert_json}" \
  TS="${TS}" HOST="${HOST}" VOLUME_NAME="${VOLUME_NAME}" MOUNT="${MOUNT}" \
  BSD_NAME="${bsd_name}" PART_OF="${part_of}" PHYSICAL_STORE="${physical_store}" \
  SMART_DISK="${smart_disk}" DEVICE_NAME="${device_name}" PROTOCOL="${protocol}" \
  SMART_STATUS="${smart_status}" TEMP_SOURCE="${temp_source}" \
  python3 - <<'PY'
import json, os
def num(k):
    v = os.environ.get(k, "")
    if v == "" or v is None: return None
    try: return int(v)
    except ValueError:
        try: return float(v)
        except ValueError: return v
print(json.dumps({
  "ts": os.environ["TS"],
  "host": os.environ["HOST"],
  "ok": True,
  "volume": os.environ["VOLUME_NAME"],
  "mount": os.environ["MOUNT"],
  "bsd_name": os.environ.get("BSD_NAME") or None,
  "part_of": os.environ.get("PART_OF") or None,
  "physical_store": os.environ.get("PHYSICAL_STORE") or None,
  "smart_disk": os.environ.get("SMART_DISK") or None,
  "device_name": os.environ.get("DEVICE_NAME") or None,
  "protocol": os.environ.get("PROTOCOL") or None,
  "smart_status": os.environ.get("SMART_STATUS") or None,
  "smart_health": os.environ.get("SMART_HEALTH") or None,
  "temp_c": num("TEMP_C"),
  "temp_source": os.environ.get("TEMP_SOURCE") or None,
  "df_used_pct": num("DF_USED"),
  "df_avail_kb": num("DF_AVAIL"),
  "write_probe_ms_8mb": num("WRITE_MS"),
  "alerts": json.loads(os.environ.get("ALERT_JSON") or "[]"),
  "smartctl_present": bool(os.environ.get("SMARTCTL_BIN")),
}, ensure_ascii=False))
PY
)"

echo "${record}" | tee -a "${OUT_DIR}/disk-monitor.jsonl" >/dev/null
echo "${record}" > "${OUT_DIR}/disk-monitor-latest.json"
echo "${record}" | tee -a "${LOCAL_MIRROR}/disk-monitor.jsonl" >/dev/null
echo "${record}" > "${LOCAL_MIRROR}/disk-monitor-latest.json"

{
  echo "=== Disk monitor ${TS} ==="
  echo "Volume: ${VOLUME_NAME} @ ${MOUNT}"
  echo "Device: ${device_name:-?} (${protocol:-?}) SMART=${smart_status:-?}"
  echo "IDs: vol=${bsd_name} whole=${part_of} physical=${physical_store} smart_target=${smart_disk}"
  echo "Temp: ${temp_c:-n/a} C (source=${temp_source:-none})"
  echo "Space used: ${df_used_pct:-?}%  avail_kb=${df_avail_k:-?}"
  echo "Write probe 8MB: ${write_ms:-?} ms"
  echo "Alerts: ${alert_json}"
  echo "smartctl: ${smartctl_bin:-NOT_INSTALLED}"
} | tee "${OUT_DIR}/disk-monitor-latest.txt" > "${LOCAL_MIRROR}/disk-monitor-latest.txt"

echo "${record}"
