/**
 * Pipeline checkpoint / progress log.
 */
import fs from "node:fs/promises";
import path from "node:path";

export function defaultCheckpoint() {
  return {
    version: 1,
    updatedAt: null,
    phase: "idle", // idle | list | product | calendar | paused | done
    currentDestinationCode: null,
    currentHotelCode: null,
    destinations: {}, // code -> { listStatus, productDone, calendarDone, hotelCount, error }
    lastError: null,
    lastPauseReason: null,
    stats: {
      destinationsListed: 0,
      hotelsListed: 0,
      productsDone: 0,
      calendarsDone: 0,
      imagesSaved: 0,
    },
  };
}

export async function loadCheckpoint(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return { ...defaultCheckpoint(), ...JSON.parse(raw) };
  } catch {
    return defaultCheckpoint();
  }
}

export async function saveCheckpoint(filePath, cp) {
  cp.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(cp, null, 2)}\n`);
  await fs.rename(tmp, filePath);
  return cp;
}

export async function appendProgress(logPath, entry) {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  await fs.appendFile(logPath, `${line}\n`);
}

export function markPause(cp, reason, extra = {}) {
  cp.phase = "paused";
  cp.lastPauseReason = reason;
  cp.lastError = extra.error || null;
  Object.assign(cp, extra.fields || {});
  return cp;
}
