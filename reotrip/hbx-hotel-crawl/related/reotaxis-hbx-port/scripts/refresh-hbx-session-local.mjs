#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const HBX_ENV_FILE = process.env.HBX_ENV_FILE || "/Users/mark/.config/hbx/hbx.env";
const SYNC_SCRIPT =
  process.env.HBX_SYNC_LOCAL_SECRETS_SCRIPT ||
  "/Users/mark/reo-ops/_cowork/codex_artifacts/bin/hbx-sync-local-secrets.mjs";

function parseEnvValue(rawValue) {
  let value = String(rawValue || "").trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.trim();
}

function parseEnvFile(path) {
  const values = {};
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    values[match[1]] = parseEnvValue(match[2]);
  }
  return values;
}

function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(String(token).split(".")[1] || "", "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function tokenExpiresAt(token) {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === "number" ? new Date(payload.exp * 1000).toISOString() : "unknown";
}

function extractJsonObject(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(output.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sensitiveValues(env) {
  return [
    env.BEDSONLINE_USERNAME,
    env.BEDSONLINE_PASSWORD,
    env.HBX_PORTAL_DARWIN_TOKEN,
    env.HBX_BEARER_TOKEN,
  ].filter((value) => typeof value === "string" && value.length >= 8);
}

function containsSensitiveValue(output, env) {
  return sensitiveValues(env).some((value) => output.includes(value));
}

function fail(message) {
  console.error(`::error::${message}. Values were not printed.`);
  process.exit(1);
}

function main() {
  if (!existsSync(HBX_ENV_FILE)) fail(`HBX env file missing at ${HBX_ENV_FILE}`);
  if (!existsSync(SYNC_SCRIPT)) fail(`HBX sync script missing at ${SYNC_SCRIPT}`);

  const beforeEnv = parseEnvFile(HBX_ENV_FILE);
  const credentialEnv = {
    ...beforeEnv,
    BEDSONLINE_USERNAME: beforeEnv.BEDSONLINE_USERNAME || process.env.BEDSONLINE_USERNAME,
    BEDSONLINE_PASSWORD: beforeEnv.BEDSONLINE_PASSWORD || process.env.BEDSONLINE_PASSWORD,
  };
  const username = credentialEnv.BEDSONLINE_USERNAME;
  const password = credentialEnv.BEDSONLINE_PASSWORD;
  if (!username || !password) fail("HBX credentials missing from canonical env or Actions secrets");

  const child = spawnSync(process.execPath, [SYNC_SCRIPT, "--headless=true"], {
    input: JSON.stringify({ username, password }),
    encoding: "utf8",
    env: {
      ...process.env,
      HBX_ENV_FILE,
    },
    maxBuffer: 10 * 1024 * 1024,
  });

  const combinedOutput = `${child.stdout || ""}\n${child.stderr || ""}`;
  if (containsSensitiveValue(combinedOutput, credentialEnv)) {
    fail("HBX sync output contained a sensitive local value and was suppressed");
  }
  if (child.status !== 0) {
    const parsed = extractJsonObject(combinedOutput);
    const reason = parsed?.error ? String(parsed.error) : "HBX sync command failed";
    fail(reason);
  }

  const afterEnv = parseEnvFile(HBX_ENV_FILE);
  const tokenKey = afterEnv.HBX_BEARER_TOKEN ? "HBX_BEARER_TOKEN" : afterEnv.HBX_PORTAL_DARWIN_TOKEN ? "HBX_PORTAL_DARWIN_TOKEN" : null;
  if (!tokenKey) fail("HBX sync completed but no bearer token was present");

  const parsed = extractJsonObject(combinedOutput) || {};
  const activityStatus = parsed.probes?.activityContent?.status ?? "unknown";
  const transferStatus = parsed.probes?.transferFts?.status ?? "unknown";

  console.log(
    [
      "hbx unattended session sync passed:",
      `env_file=${HBX_ENV_FILE}`,
      `sync_script=${SYNC_SCRIPT}`,
      `token_key=${tokenKey}`,
      `token_expires_at=${tokenExpiresAt(afterEnv[tokenKey])}`,
      `activity_probe_status=${activityStatus}`,
      `transfer_probe_status=${transferStatus}`,
      "safety=no_password_token_authorization_ratekey_or_booking_identifier_printed",
    ].join(" "),
  );
}

main();
