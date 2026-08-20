#!/usr/bin/env node
/**
 * §43/§51/§54 compliance scan
 * - FAIL: page.mouse.click / mouse.click coordinates in LIVE_ALLOWLIST scripts
 * - WARN: mouse.click in other mjs (legacy)
 * - WARN: process.exit(0) without nearby verify/PASS (heuristic)
 *
 * Exit 2 if any LIVE_ALLOWLIST still has mouse.click
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LIVE = new Set([
  'list-beijing-daxing.mjs',
  'list-beijing-capital.mjs',
  'pkx-fill-attrs.mjs',
  'pkx-fix-times.mjs',
  'pkx-fix-holidays.mjs',
  'pek-fix-times.mjs',
  'pek-fix-holidays.mjs',
  'pek-create-one.mjs',
  'fix-popmart-holidays.mjs',
  'fix-tussauds-holidays.mjs',
  'fix-jinmao-holidays.mjs',
  'fix-popmart-attrs-el.mjs',
  'finish-popmart-regs-el.mjs',
  'create-popmart-options-el.mjs',
]);

const files = fs
  .readdirSync(root)
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('.'));

let fail = 0;
const legacy = [];
const liveMouse = [];
const exit0 = [];

for (const f of files) {
  const p = path.join(root, f);
  const t = fs.readFileSync(p, 'utf8');
  // real calls only (ignore comments like "no page.mouse.click")
  const hasMouse = /^\s*(?:await\s+)?page\.mouse\.click\s*\(/m.test(t);
  if (hasMouse) {
    if (LIVE.has(f)) {
      liveMouse.push(f);
      fail++;
    } else {
      legacy.push(f);
    }
  }
  // exit(0) without obvious verify markers in last 40 lines
  if (/process\.exit\s*\(\s*0\s*\)/.test(t)) {
    const tail = t.slice(-2500);
    const hasGate =
      /PASS|验收|ok\s*===?\s*true|allOk|verify|compact|日\\n价|assert|normPrice/.test(tail) ||
      /if\s*\(\s*!.*\)\s*process\.exit\s*\(\s*[12]/.test(t);
    if (!hasGate) exit0.push(f);
  }
}

console.log('=== §54 lint-skill-compliance ===');
if (liveMouse.length) {
  console.log('FAIL live paths still use mouse.click:');
  liveMouse.forEach((f) => console.log('  -', f));
} else {
  console.log('OK: LIVE_ALLOWLIST has no mouse.click');
}
if (legacy.length) {
  console.log('WARN legacy (live-禁用 until rewritten) mouse.click:');
  legacy.forEach((f) => console.log('  -', f));
}
if (exit0.length) {
  console.log('WARN process.exit(0) without clear verify gate (review):');
  exit0.forEach((f) => console.log('  -', f));
}
console.log(fail ? `RESULT FAIL (${fail})` : 'RESULT PASS');
process.exit(fail ? 2 : 0);
