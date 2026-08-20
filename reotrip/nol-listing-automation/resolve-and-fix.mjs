/**
 * Resolve missing draft ids from product list + run resv / times / price audit.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectNolPage } from './lib/cdp-session.mjs';
import {
  auditOptions,
  fixReservation,
  fixOptionTimes,
  dismiss,
  RESV_AIRPORT,
  RESV_HUB,
} from './lib/japan-audit-fix.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const queue = JSON.parse(fs.readFileSync(path.join(__dir, 'japan-work-queue.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { page } = await connectNolPage({
  selfHint: 'resolve-fix',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

async function findDraft(searchText, preferRegex) {
  await page.goto('https://tour.triple.partners/product-management?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(2500);
  // try search box
  const inputs = page.locator('input[type=text], input[type=search]');
  const n = await inputs.count();
  for (let i = 0; i < Math.min(n, 3); i++) {
    const ph = await inputs.nth(i).getAttribute('placeholder').catch(() => '');
    if (/搜索|搜尋|search|查找/i.test(ph || '') || i === 0) {
      await inputs.nth(i).fill(searchText);
      await inputs.nth(i).press('Enter').catch(() => {});
      await sleep(1800);
      break;
    }
  }
  // list cards
  const hit = await page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, 'i');
    const cards = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer4"], div[class*="Product"], a'));
    const c = cards.find((e) => re.test(e.innerText || '') && (e.innerText || '').length < 500);
    if (!c) {
      // broader
      const all = Array.from(document.querySelectorAll('div')).filter((e) => {
        const t = (e.innerText || '').trim();
        return re.test(t) && t.length > 10 && t.length < 300 && e.getBoundingClientRect().height > 40;
      });
      all.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
      if (all[0]) {
        all[0].click();
        return { ok: true, text: (all[0].innerText || '').slice(0, 80) };
      }
      return { ok: false, sample: document.body.innerText.slice(0, 200) };
    }
    c.click();
    return { ok: true, text: (c.innerText || '').slice(0, 80) };
  }, preferRegex);
  console.log('  find', searchText, hit);
  await sleep(2500);
  const m = page.url().match(/id=([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

const results = [];

// 1) Resolve missing ids
for (const item of queue.filter((q) => !q.id)) {
  console.log('\n【将要】解析草稿', item.cn);
  let id = null;
  if (item.key === 'tkp') id = await findDraft('도쿄항', '도쿄 시내 호텔.*도쿄항|东京港');
  if (item.key === 'ykp') id = await findDraft('요코하마', '도쿄 시내.*요코하마항|东京市区.*横滨');
  if (item.key === 'osk') id = await findDraft('오사카역', '오사카 시내 호텔.*오사카역(?!/)|大阪市区酒店-大阪站');
  item.id = id || '';
  console.log('【结果】id', item.id);
  results.push({ key: item.key, id: item.id, step: 'resolve' });
}
fs.writeFileSync(path.join(__dir, 'japan-work-queue.json'), JSON.stringify(queue, null, 2));

// 2) Airport resv check+fix for hnd nrt kix itm
for (const key of ['hnd', 'nrt', 'kix', 'itm']) {
  const item = queue.find((q) => q.key === key);
  console.log(`\n========== RESV ${key} ==========`);
  try {
    const sum = await fixReservation(page, item.id, RESV_AIRPORT);
    await dismiss(page);
    await page.goto(
      `https://tour.triple.partners/product-management/registration/regulations?id=${item.id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(2000);
    const body = await page.evaluate(() => document.body?.innerText || '');
    const resvOk = !/您必須輸入代表|须填写「代表预约/.test(body);
    const hasFlight = /航班|항공|flight|Flight/i.test(body);
    console.log('【结果】resvOk', resvOk, 'hasFlightHint', hasFlight, sum);
    results.push({ key, step: 'resv', resvOk, hasFlight, sum });
  } catch (e) {
    console.log('ERR resv', e.message);
    results.push({ key, step: 'resv', err: String(e.message).slice(0, 150) });
  }
}

// 3) Tokyo station times re-verify
{
  const item = queue.find((q) => q.key === 'tks');
  console.log('\n========== TIMES recheck tks ==========');
  const opts = await auditOptions(page, item.id);
  for (const o of opts) console.log(`  opt${o.i} price=${o.price} timesOk=${o.timesOk}`, o.times);
  results.push({ key: 'tks', step: 'times_recheck', opts: opts.map((o) => ({ i: o.i, price: o.price, timesOk: o.timesOk, t: o.times })) });
}

// 4) Tokyo port resv if resolved
{
  const item = queue.find((q) => q.key === 'tkp');
  if (item.id) {
    console.log('\n========== RESV tkp 东京港 ==========');
    const sum = await fixReservation(page, item.id, RESV_HUB);
    const opts = await auditOptions(page, item.id);
    results.push({
      key: 'tkp',
      step: 'resv+audit',
      sum,
      opts: opts.map((o) => ({ i: o.i, price: o.price, timesOk: o.timesOk, name: o.name.slice(0, 40) })),
    });
  } else console.log('tkp no id skip');
}

// 5) Yokohama + Osaka station if resolved
for (const key of ['ykp', 'osk']) {
  const item = queue.find((q) => q.key === key);
  if (!item.id) {
    console.log(key, 'no id');
    continue;
  }
  console.log(`\n========== AUDIT ${key} ==========`);
  const opts = await auditOptions(page, item.id);
  for (const o of opts) console.log(`  opt${o.i} p=${o.price} tOk=${o.timesOk}`, o.name.slice(0, 50));
  const priceIssues = [];
  for (const o of opts) {
    const expect = /10인승/.test(o.name) ? item.prices[1] : item.prices[0];
    if (String(o.price) !== String(expect)) priceIssues.push({ i: o.i, got: o.price, expect, name: o.name.slice(0, 40) });
  }
  console.log('priceIssues', priceIssues);
  // times fix if needed
  for (const o of opts.filter((x) => !x.timesOk)) {
    try {
      await fixOptionTimes(page, item.id, o.i);
    } catch (e) {
      console.log('times fail', o.i, e.message);
    }
  }
  // resv hub
  try {
    await fixReservation(page, item.id, RESV_HUB);
  } catch (e) {
    console.log('resv fail', e.message);
  }
  results.push({ key, step: 'audit', priceIssues, opts: opts.map((o) => ({ i: o.i, price: o.price, timesOk: o.timesOk })) });
}

fs.writeFileSync(path.join(__dir, 'japan-resolve-results.json'), JSON.stringify(results, null, 2));
console.log('\nSUMMARY', JSON.stringify(results, null, 2).slice(0, 3000));
console.log('未点提交审核');
process.exit(0);
