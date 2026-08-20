/**
 * External disk temperature / health gate before heavy writes.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, resolveFromRoot } from "./paths.mjs";

export async function loadPipelineConfig() {
  const raw = await fs.readFile(resolveFromRoot("config/pipeline.json"), "utf8");
  return JSON.parse(raw);
}

export function readDiskMonitor(config) {
  const script = resolveFromRoot("scripts/monitor-external-disk.sh");
  const env = {
    ...process.env,
    VOLUME_NAME: config.disk?.volumeName || "CodexArchive",
    OUT_DIR: path.join(
      config.dataRoot || "/Volumes/CodexArchive/hbx-hotel-crawl",
      "monitor",
    ),
    LOCAL_MIRROR: resolveFromRoot("artifacts/logs"),
  };
  const r = spawnSync("bash", [script], { encoding: "utf8", env, timeout: 60000 });
  const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop();
  if (!line) {
    return { ok: false, error: "monitor_no_output", stderr: r.stderr };
  }
  try {
    return JSON.parse(line);
  } catch {
    return { ok: false, error: "monitor_parse_failed", raw: line };
  }
}

/**
 * @returns {{ allow: boolean, pauseMs: number, reason?: string, monitor: object }}
 */
export function evaluateDiskGate(monitor, config) {
  const d = config.disk || {};
  const temp = monitor?.temp_c;
  if (monitor?.ok === false) {
    return { allow: false, pauseMs: 0, reason: monitor.error || "disk_not_ok", monitor };
  }
  if (typeof temp === "number") {
    if (temp >= (d.tempCriticalC ?? 68)) {
      return {
        allow: false,
        pauseMs: (d.pauseSecondsOnHot ?? 300) * 1000,
        reason: `temp_critical_${temp}C`,
        monitor,
      };
    }
    if (temp >= (d.tempPauseC ?? 62)) {
      return {
        allow: false,
        pauseMs: (d.pauseSecondsOnHot ?? 300) * 1000,
        reason: `temp_pause_${temp}C`,
        monitor,
      };
    }
    if (temp >= (d.tempWarnC ?? 55)) {
      return {
        allow: true,
        pauseMs: (d.pauseSecondsOnWarn ?? 120) * 1000,
        reason: `temp_warn_${temp}C`,
        monitor,
      };
    }
  }
  if (Array.isArray(monitor?.alerts) && monitor.alerts.includes("space_critical")) {
    return { allow: false, pauseMs: 0, reason: "space_critical", monitor };
  }
  return { allow: true, pauseMs: 0, monitor };
}

export async function guardDisk(config, { forceCheck = false, writeCounter = { n: 0 } } = {}) {
  const every = config.disk?.checkEveryNWrites ?? 20;
  writeCounter.n = (writeCounter.n || 0) + 1;
  if (!forceCheck && writeCounter.n % every !== 0 && writeCounter.n !== 1) {
    return { skipped: true, allow: true, pauseMs: 0 };
  }
  const monitor = readDiskMonitor(config);
  const gate = evaluateDiskGate(monitor, config);
  if (gate.pauseMs > 0) {
    console.warn(
      `[disk-guard] ${gate.reason || "pause"} temp=${monitor.temp_c}C — sleep ${gate.pauseMs / 1000}s`,
    );
    await new Promise((r) => setTimeout(r, gate.pauseMs));
    // re-check after pause
    const m2 = readDiskMonitor(config);
    const g2 = evaluateDiskGate(m2, config);
    return { ...g2, rechecked: true };
  }
  return gate;
}

export { PROJECT_ROOT };
