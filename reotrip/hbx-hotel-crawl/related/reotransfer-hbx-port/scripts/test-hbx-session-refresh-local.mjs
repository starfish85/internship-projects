#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(root, "scripts", "refresh-hbx-session-local.mjs");
const temp = mkdtempSync(join(tmpdir(), "rtrf-hbx-session-refresh-"));
const envFile = join(temp, "hbx.env");
const syncScript = join(temp, "fake-sync.mjs");
const leakScript = join(temp, "leaky-sync.mjs");

function jwt(expSeconds) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `${header}.${payload}.signature`;
}

const freshToken = jwt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
const password = "sentinel-hbx-password";
const username = "sentinel-hbx-user";

try {
  mkdirSync(temp, { recursive: true });
  writeFileSync(
    syncScript,
    `
      import { appendFileSync } from "node:fs";
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const creds = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (creds.username !== "${username}" || creds.password !== "${password}") process.exit(3);
      appendFileSync(process.env.HBX_ENV_FILE, "\\nHBX_PORTAL_DARWIN_TOKEN=${freshToken}\\nHBX_BEARER_TOKEN=${freshToken}\\n");
      console.log(JSON.stringify({
        ok: true,
        token: { field: "darwinToken", expiresAt: "2099-01-01T00:00:00.000Z" },
        probes: { activityContent: { ok: true, status: 200 }, transferFts: { ok: true, status: 200 } },
        safety: "No password, token, authorization header, raw rateKey, or booking identifier was printed."
      }));
    `,
    "utf8",
  );
  writeFileSync(
    leakScript,
    `
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const creds = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      console.log(creds.password);
    `,
    "utf8",
  );

  writeFileSync(
    envFile,
    `BEDSONLINE_USERNAME=${username}\nBEDSONLINE_PASSWORD=${password}\nHBX_PORTAL_DARWIN_TOKEN=old-local-token\n`,
    "utf8",
  );
  const success = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      HBX_ENV_FILE: envFile,
      HBX_SYNC_LOCAL_SECRETS_SCRIPT: syncScript,
    },
  });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /hbx unattended session sync passed/);
  assert.match(success.stdout, /token_key=HBX_BEARER_TOKEN/);
  assert.match(success.stdout, /activity_probe_status=200/);
  assert.match(success.stdout, /transfer_probe_status=200/);
  assert.doesNotMatch(`${success.stdout}\n${success.stderr}`, new RegExp(password));
  assert.doesNotMatch(`${success.stdout}\n${success.stderr}`, new RegExp(freshToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  writeFileSync(envFile, "HBX_PORTAL_DARWIN_TOKEN=old-local-token\n", "utf8");
  const envFallback = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      HBX_ENV_FILE: envFile,
      HBX_SYNC_LOCAL_SECRETS_SCRIPT: syncScript,
      BEDSONLINE_USERNAME: username,
      BEDSONLINE_PASSWORD: password,
    },
  });
  assert.equal(envFallback.status, 0, envFallback.stderr);
  assert.match(envFallback.stdout, /hbx unattended session sync passed/);
  assert.doesNotMatch(`${envFallback.stdout}\n${envFallback.stderr}`, new RegExp(username));
  assert.doesNotMatch(`${envFallback.stdout}\n${envFallback.stderr}`, new RegExp(password));

  writeFileSync(
    envFile,
    `BEDSONLINE_USERNAME=${username}\nBEDSONLINE_PASSWORD=${password}\nHBX_PORTAL_DARWIN_TOKEN=old-local-token\n`,
    "utf8",
  );
  const leak = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      HBX_ENV_FILE: envFile,
      HBX_SYNC_LOCAL_SECRETS_SCRIPT: leakScript,
    },
  });
  assert.equal(leak.status, 1);
  assert.match(leak.stderr, /sensitive local value/);
  assert.doesNotMatch(`${leak.stdout}\n${leak.stderr}`, new RegExp(password));

  console.log("hbx session refresh local tests passed");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
