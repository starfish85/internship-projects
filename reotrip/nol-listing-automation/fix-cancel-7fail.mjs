/**
 * Fix SPEC_CANCEL for the 7 batch-scan FAILs using plain fill + Tab + 临时保存 + reopen verify.
 * Avoid keyboard.type (can grey footer). Prefer fill + React setter + tempSave.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, regsUrl } from './lib/japan-audit-fix.mjs';
import { SPEC_CANCEL_KO } from './lib/transfer-audit-copy.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dir = dirname(fileURLToPath(import.meta.url));

const JOBS = [
  { id: 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c', label: '大阪站' },
  { id: '0de15895-41de-48f8-8653-5c47a947c301', label: '东京港' },
  { id: 'f14da9cb-2c98-42c3-b238-86aeef6d9bcb', label: 'tsn' },
  { id: 'b6e560d4-d4d3-4726-b08c-f5623499895a', label: 'HND' },
  { id: '60557c54-6c11-4b0e-9e04-df85c0d3e78b', label: 'NRT' },
  { id: '7c220325-8783-4f58-a1dc-5fbfc4137a5e', label: 'KIX' },
  { id: '88b3861b-e907-487b-bacb-5abcfc1a7988', label: 'ITM' },
];

function isOk(v) {
  return (
    (v || '').includes('예약 확정 후 취소') &&
    (v || '').includes('협력사 확인') &&
    (v || '').includes('영업일 2일')
  );
}

async function readCancel(page) {
  const v = await page.locator('textarea[name=specificCancelPolicy]').inputValue().catch(() => '');
  return { ok: isOk(v), exact: v.trim() === SPEC_CANCEL_KO, len: v.length, preview: v.slice(0, 55) };
}

async function fillCancel(page) {
  const loc = page.locator('textarea[name=specificCancelPolicy]');
  await loc.waitFor({ state: 'visible', timeout: 15000 });
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ timeout: 5000 });
  await sleep(200);
  // plain fill only — no keyboard.type
  await loc.fill('');
  await loc.fill(SPEC_CANCEL_KO);
  await loc.press('Tab');
  await sleep(200);
  await page.evaluate((txt) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    if (!ta) return;
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    desc.set.call(ta, txt);
    const tracker = ta._valueTracker;
    if (tracker) tracker.setValue('');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    ta.blur?.();
  }, SPEC_CANCEL_KO);
  await loc.fill(SPEC_CANCEL_KO);
  await loc.press('Tab');
  await sleep(300);
  return readCancel(page);
}

async function tempSave(page) {
  // click narrow-ish 临时保存 if enabled
  const r = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const box = b.getBoundingClientRect();
        return {
          el: b,
          t: (b.innerText || '').trim(),
          d: b.disabled,
          w: box.width,
          y: box.y,
        };
      })
      .filter((x) => /临时保存|臨時存儲/.test(x.t) && !x.d && x.w > 40)
      .sort((a, b) => a.w - b.w || b.y - a.y);
    if (!btns[0]) {
      // list all footer-ish
      const all = Array.from(document.querySelectorAll('button'))
        .map((b) => ({
          t: (b.innerText || '').trim(),
          d: b.disabled,
          w: Math.round(b.getBoundingClientRect().width),
        }))
        .filter((x) => x.t && x.t.length < 20);
      return { ok: false, dump: all.slice(0, 25) };
    }
    btns[0].el.click();
    return { ok: true, t: btns[0].t, w: btns[0].w };
  });
  await sleep(2800);
  return r;
}

async function trySaveThen(page) {
  const st = page.getByRole('button', { name: /^保存然后$|^保存然後$/ });
  if ((await st.count()) && !(await st.first().isDisabled().catch(() => true))) {
    await st.first().click();
    await sleep(2800);
    return true;
  }
  return false;
}

const { page } = await connectNolPage({
  selfHint: 'fix-cancel-7',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const results = [];
for (const j of JOBS) {
  console.log(`\n======== ${j.label} ${j.id.slice(0, 8)} ========`);
  try {
    await dismiss(page);
    await page.goto(regsUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2500);
    await dismiss(page);

    const body = await page.evaluate(() => (document.body.innerText || '').slice(0, 80));
    if (/找不到页面|아이코/.test(body)) {
      console.log('【结果】DEAD');
      results.push({ ...j, status: 'DEAD' });
      continue;
    }

    let cur = await readCancel(page);
    console.log('【读回】before', cur);
    if (cur.ok) {
      console.log('【结果】PASS already');
      results.push({ ...j, status: 'PASS', cancel: 'already' });
      continue;
    }

    console.log('【将要】fill SPEC_CANCEL');
    let mid = await fillCancel(page);
    console.log('【读回】mid', mid);
    if (!mid.ok) {
      // retry once
      mid = await fillCancel(page);
      console.log('【读回】mid2', mid);
    }

    console.log('【将要】临时保存');
    const sav = await tempSave(page);
    console.log('【读回】tempSave', sav);
    const st = await trySaveThen(page);
    console.log('【读回】saveThen', st);

    // reopen
    await page.goto(regsUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2500);
    await dismiss(page);
    const after = await readCancel(page);
    console.log('【读回】after', after);
    const status = after.ok ? 'PASS' : 'FAIL';
    console.log(`【结果】${status} ${j.label}`);
    results.push({ ...j, status, before: cur.preview, after: after.preview, exact: after.exact });
  } catch (e) {
    console.log('ERR', e.message?.slice(0, 150));
    results.push({ ...j, status: 'ERR', err: String(e.message).slice(0, 150) });
  }
}

writeFileSync(join(__dir, 'fix-cancel-7-results.json'), JSON.stringify(results, null, 2));
console.log('\nSUMMARY', JSON.stringify(results, null, 2));
console.log('未点提交审核');
process.exit(results.some((r) => r.status === 'FAIL' || r.status === 'ERR') ? 2 : 0);
