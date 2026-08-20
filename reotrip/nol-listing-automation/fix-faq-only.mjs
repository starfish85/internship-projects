import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import { FAQ_MIDSTOP_Q, FAQ_MIDSTOP_A, fillTransferFaqs } from './lib/transfer-audit-copy.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('fix-faq');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);

const results = [];
for (const prefix of ONLY) {
  const id = fs.readFileSync(path.join(__dir, `.${prefix}-draft-id`), 'utf8').trim();
  console.log('\n====', prefix, id.slice(0, 8));
  try {
    await page.goto(`https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);
    await page.getByText(/^消除$/).first().click({ timeout: 400 }).catch(() => {});
    const hl = await page.locator('#headline').inputValue().catch(() => '');
    if (!hl) { console.log('skip no hl'); results.push({ prefix, status: 'SKIP' }); continue; }

    // ensure FAQ row
    let hasQ = await page.locator('input[name="faqs.0.question"]').count();
    if (!hasQ) {
      await page.getByText(/添加问答|添加問答/).first().scrollIntoViewIfNeeded().catch(()=>{});
      await page.getByText(/添加问答|添加問答/).first().click({ timeout: 5000 });
      await sleep(700);
    }
    await page.locator('input[name="faqs.0.question"]').fill(FAQ_MIDSTOP_Q);
    await page.locator('textarea[name="faqs.0.answer"]').fill(FAQ_MIDSTOP_A);
    // also fillTransferFaqs
    await fillTransferFaqs(page);
    await page.locator('input[name="faqs.0.question"]').fill(FAQ_MIDSTOP_Q);
    await page.locator('textarea[name="faqs.0.answer"]').fill(FAQ_MIDSTOP_A);
    const mid = await page.locator('input[name="faqs.0.question"]').inputValue();
    console.log('mid', mid.slice(0, 30));

    // save: temp then saveThen
    for (let i = 0; i < 8; i++) {
      const st = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
      if (await st.isEnabled().catch(() => false)) break;
      await sleep(400);
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
    console.log('url', page.url());

    // verify reopen
    await page.goto(`https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);
    const after = await page.evaluate((q) => {
      const el = document.querySelector('input[name="faqs.0.question"]');
      return el ? (el.value || '') : '';
    }, FAQ_MIDSTOP_Q);
    const ok = after.includes('중간에');
    console.log(ok ? 'PASS' : 'FAIL', after.slice(0, 40));
    results.push({ prefix, status: ok ? 'PASS' : 'FAIL', after: after.slice(0, 40) });
  } catch (e) {
    console.log('ERR', e.message);
    results.push({ prefix, status: 'ERR', error: String(e.message).slice(0, 100) });
  }
}
console.log(results);
process.exit(0);
