/**
 * Persist SPEC_CANCEL via 临时保存 (more reliable than 保存然后 when form soft-invalid).
 * Verify by reopen. Also ensure FAQ if --faq.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import { SPEC_CANCEL_KO, FAQ_MIDSTOP_Q, FAQ_MIDSTOP_A, fillTransferFaqs } from './lib/transfer-audit-copy.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const WITH_FAQ = process.argv.includes('--faq');

function load() {
  const out = [];
  for (const f of fs.readdirSync(__dir)) {
    const m = f.match(/^\.([a-z0-9]+)-draft-id$/);
    if (!m) continue;
    const prefix = m[1];
    if (ONLY.length && !ONLY.includes(prefix)) continue;
    if (['sha', 'pvg', 'hq', 'wsk', 'dwp', 'pr', 'popland', 'huangpu'].includes(prefix)) continue;
    const id = fs.readFileSync(path.join(__dir, f), 'utf8').trim();
    if (id.length > 20) out.push({ prefix, id });
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function dismiss(page) {
  await page.getByText(/^消除$/).first().click({ timeout: 400 }).catch(() => {});
}

async function tempSave(page) {
  // prefer footer 临时保存 / 臨時存儲
  const candidates = page.locator('button').filter({ hasText: /临时保存|臨時存儲|임시 저장/ });
  const n = await candidates.count();
  let clicked = false;
  for (let i = 0; i < n; i++) {
    const b = candidates.nth(i);
    const box = await b.boundingBox().catch(() => null);
    if (!box || box.width < 40) continue;
    const en = await b.isEnabled().catch(() => false);
    if (!en) continue;
    await b.scrollIntoViewIfNeeded().catch(() => {});
    await b.click();
    clicked = true;
    break;
  }
  if (!clicked) {
    // try 保存然后 as fallback
    const st = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
    if (await st.isEnabled().catch(() => false)) {
      await st.click();
      clicked = true;
    }
  }
  await sleep(2800);
  // toast text
  const body = await page.evaluate(() => (document.body.innerText || '').slice(0, 4000));
  const toast = /暂时保存|臨時|已保存|저장|更改已/.test(body);
  return { clicked, toast, url: page.url() };
}

async function fillCancelPlaywright(page) {
  const loc = page.locator('textarea[name=specificCancelPolicy]');
  await loc.waitFor({ state: 'visible', timeout: 15000 });
  await loc.scrollIntoViewIfNeeded();
  await loc.click();
  // triple select all + type
  await page.keyboard.press('Meta+A');
  await page.keyboard.press('Backspace');
  await loc.type(SPEC_CANCEL_KO, { delay: 2 });
  await loc.press('Tab');
  await sleep(200);
  // also fill() to be sure
  await loc.fill(SPEC_CANCEL_KO);
  await page.evaluate((txt) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    if (!ta) return;
    const proto = HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc.set.call(ta, txt);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    // try react onChange via tracking
    const tracker = ta._valueTracker;
    if (tracker) tracker.setValue('');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, SPEC_CANCEL_KO);
  await loc.fill(SPEC_CANCEL_KO);
  const v = await loc.inputValue();
  return { ok: v.includes('예약 확정 후 취소'), len: v.length };
}

async function readCancel(page) {
  const v = await page.locator('textarea[name=specificCancelPolicy]').inputValue().catch(() => '');
  return {
    ok: v.includes('예약 확정 후 취소') && v.includes('환불 가능하며'),
    preview: v.slice(0, 50),
    full: v,
  };
}

killPeerCdpScripts('fix-cancel-v2');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes('tour.triple.partners'));
if (!page) {
  console.error('NO PAGE');
  process.exit(2);
}
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);

const list = load();
console.log('【将要】cancel v2', list.length, WITH_FAQ ? '+faq' : '');
const results = [];

for (const d of list) {
  const row = { prefix: d.prefix, id: d.id };
  console.log(`\n======== ${d.prefix} ${d.id.slice(0, 8)} ========`);
  try {
    if (WITH_FAQ) {
      await page.goto(
        `https://tour.triple.partners/product-management/registration/introduction?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`,
        { waitUntil: 'domcontentloaded', timeout: 60000 },
      );
      await sleep(1800);
      await dismiss(page);
      const hl = await page.locator('#headline').inputValue().catch(() => '');
      if (!hl) {
        row.status = 'SKIP';
        results.push(row);
        console.log('skip no headline');
        continue;
      }
      const hasFaq = await page.evaluate((q) => {
        const el = document.querySelector('input[name="faqs.0.question"]');
        return !!(el && (el.value || '').includes(q.slice(0, 10)));
      }, FAQ_MIDSTOP_Q);
      if (!hasFaq) {
        console.log('【将要】FAQ');
        await fillTransferFaqs(page);
        if (!(await page.locator('input[name="faqs.0.question"]').count())) {
          await page.getByText(/添加问答|添加問答/).first().click({ timeout: 2000 }).catch(() => {});
          await sleep(500);
        }
        await page.locator('input[name="faqs.0.question"]').fill(FAQ_MIDSTOP_Q).catch(() => {});
        await page.locator('textarea[name="faqs.0.answer"]').fill(FAQ_MIDSTOP_A).catch(() => {});
        const sav = await tempSave(page);
        console.log('【结果】faq tempSave', sav);
        // also 保存然后 if available
        const st = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
        if (await st.isEnabled().catch(() => false)) {
          await st.click();
          await sleep(2000);
        }
        row.faq = true;
      } else {
        console.log('【结果】FAQ ok');
        row.faq = 'already';
      }
    }

    await page.goto(
      `https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(2200);
    await dismiss(page);

    let cur = await readCancel(page);
    if (cur.ok) {
      console.log('【结果】cancel already');
      row.status = 'PASS';
      row.cancel = 'already';
      results.push(row);
      continue;
    }
    console.log('【读回】before', cur.preview);

    console.log('【将要】fill cancel + 临时保存');
    const fill = await fillCancelPlaywright(page);
    console.log('【结果】fill', fill);
    const mid = await readCancel(page);
    console.log('【读回】mid', mid.ok, mid.preview);

    const sav = await tempSave(page);
    console.log('【结果】tempSave', sav);

    // if still on regs, try 保存然后 too
    if (page.url().includes('regulations')) {
      const st = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
      if (await st.isEnabled().catch(() => false)) {
        console.log('【将要】再点保存然后');
        await st.click();
        await sleep(2800);
        console.log('【结果】url', page.url());
      }
    }

    // reopen verify
    await page.goto(
      `https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(2200);
    await dismiss(page);
    const after = await readCancel(page);
    row.cancelOk = after.ok;
    row.status = after.ok ? 'PASS' : 'FAIL';
    console.log('【结果】', row.status, after.preview);
  } catch (e) {
    row.status = 'ERR';
    row.error = String(e.message || e).slice(0, 200);
    console.log('ERR', row.error);
  }
  results.push(row);
  fs.writeFileSync(path.join(__dir, 'fix-cancel-v2-results.json'), JSON.stringify(results, null, 2));
}

console.log('\n==== SUMMARY ====');
for (const r of results) console.log(`[${r.status}] ${r.prefix}`);
console.log('PASS', results.filter((r) => r.status === 'PASS').length, '/', results.length);
console.log('未点提交审核');
process.exit(0);
