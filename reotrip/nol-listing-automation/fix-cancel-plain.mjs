import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import { SPEC_CANCEL_KO, FAQ_MIDSTOP_Q, FAQ_MIDSTOP_A, fillTransferFaqs } from './lib/transfer-audit-copy.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const WITH_FAQ = process.argv.includes('--faq');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function load() {
  return ONLY.map((prefix) => {
    const f = path.join(__dir, `.${prefix}-draft-id`);
    if (!fs.existsSync(f)) return null;
    return { prefix, id: fs.readFileSync(f, 'utf8').trim() };
  }).filter(Boolean);
}

async function dismiss(page) {
  await page.getByText(/^消除$/).first().click({ timeout: 400 }).catch(() => {});
}

async function plainFillCancel(page) {
  const loc = page.locator('textarea[name=specificCancelPolicy]');
  await loc.waitFor({ state: 'visible', timeout: 15000 });
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ clickCount: 3 });
  await loc.fill(SPEC_CANCEL_KO);
  await page.evaluate((txt) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    if (!ta) return;
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    desc.set.call(ta, txt);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }, SPEC_CANCEL_KO);
  await loc.fill(SPEC_CANCEL_KO);
  await sleep(400);
  return (await loc.inputValue()).includes('예약 확정 후 취소');
}

async function saveBoth(page) {
  // wait enable
  for (let i = 0; i < 12; i++) {
    const tmp = page.locator('button').filter({ hasText: /^临时保存$/ }).first();
    const st = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
    const a = await tmp.isEnabled().catch(() => false);
    const b = await st.isEnabled().catch(() => false);
    if (a || b) break;
    if (i === 2) await page.getByText('是（手动取消）').first().click().catch(() => {});
    if (i === 4) {
      await page.locator('input[name="windows.0.deadline"]').fill('2').catch(() => {});
      await page.locator('input[name="windows.0.penalty"]').fill('0').catch(() => {});
    }
    await sleep(500);
  }
  const tmp = page.locator('button').filter({ hasText: /^临时保存$/ }).first();
  if (await tmp.isEnabled().catch(() => false)) {
    await tmp.click();
    await sleep(2000);
  }
  const st = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
  if (await st.isEnabled().catch(() => false)) {
    await st.click();
    await sleep(2500);
  }
  return page.url();
}

killPeerCdpScripts('fix-plain');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);

const list = load();
console.log('plain fix', list.length);
const results = [];
for (const d of list) {
  const row = { prefix: d.prefix, id: d.id };
  console.log('\n====', d.prefix);
  try {
    if (WITH_FAQ) {
      await page.goto(`https://tour.triple.partners/product-management/registration/introduction?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(1800); await dismiss(page);
      const hl = await page.locator('#headline').inputValue().catch(() => '');
      if (!hl) { row.status = 'SKIP'; results.push(row); continue; }
      const has = await page.evaluate((q) => {
        const el = document.querySelector('input[name="faqs.0.question"]');
        return el && (el.value || '').includes(q.slice(0, 10));
      }, FAQ_MIDSTOP_Q);
      if (!has) {
        await fillTransferFaqs(page);
        if (!(await page.locator('input[name="faqs.0.question"]').count())) {
          await page.getByText(/添加问答|添加問答/).first().click({ timeout: 2000 }).catch(() => {});
          await sleep(400);
        }
        await page.locator('input[name="faqs.0.question"]').fill(FAQ_MIDSTOP_Q).catch(() => {});
        await page.locator('textarea[name="faqs.0.answer"]').fill(FAQ_MIDSTOP_A).catch(() => {});
        await saveBoth(page);
      }
      row.faq = true;
    }

    await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000); await dismiss(page);
    const cur = await page.locator('textarea[name=specificCancelPolicy]').inputValue().catch(() => '');
    if (cur.includes('예약 확정 후 취소') && cur.includes('환불 가능하며')) {
      row.status = 'PASS'; row.already = true; results.push(row); console.log('already'); continue;
    }
    const okFill = await plainFillCancel(page);
    console.log('fill', okFill);
    const url = await saveBoth(page);
    console.log('saved url', url.includes('option') ? 'option' : 'regs');
    await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);
    const after = await page.locator('textarea[name=specificCancelPolicy]').inputValue();
    row.status = after.includes('예약 확정 후 취소') && after.includes('환불 가능하며') ? 'PASS' : 'FAIL';
    console.log(row.status, after.slice(0, 40));
  } catch (e) {
    row.status = 'ERR'; row.error = String(e.message || e).slice(0, 150);
    console.log('ERR', row.error);
  }
  results.push(row);
}
console.log('\nSUMMARY');
for (const r of results) console.log(`[${r.status}] ${r.prefix}`);
console.log('PASS', results.filter((r) => r.status === 'PASS').length, '/', results.length);
process.exit(0);
