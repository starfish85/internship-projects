import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "..");

export async function loadConfig() {
  const raw = await fs.readFile(path.join(PROJECT_ROOT, "config/defaults.json"), "utf8");
  return JSON.parse(raw);
}

export function resolveFromRoot(...parts) {
  return path.join(PROJECT_ROOT, ...parts);
}

export async function ensureDirs(dirs) {
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/** Write to local path and mirror to external when available. */
export async function writeLocalAndExternal(localPath, externalPath, content) {
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, content);
  if (externalPath) {
    try {
      await fs.mkdir(path.dirname(externalPath), { recursive: true });
      await fs.writeFile(externalPath, content);
    } catch (err) {
      console.warn(`[storage] external write failed: ${externalPath} (${err.message})`);
    }
  }
  return { localPath, externalPath };
}

export function stamp(prefix = "run") {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
