/**
 * Excel 待调整：①黄格改价 ②时段 07:00–21:30 ③预约补全
 * usage:
 *   node run-japan-excel-fix.mjs audit [key...]
 *   node run-japan-excel-fix.mjs prices [key...]
 *   node run-japan-excel-fix.mjs times [key...]
 *   node run-japan-excel-fix.mjs resv [key...]
 *   node run-japan-excel-fix.mjs all [key...]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectNolPage } from './lib/cdp-session.mjs';
import {
  auditOptions,
  fixOptionPrice,
  fixOptionTimes,
  fixReservation,
  dismiss,
  RESV_AIRPORT,
  RESV_HUB,
  optionUrl,
} from './lib/japan-audit-fix.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const queue = JSON.parse(fs.readFileSync(path.join(__dir, 'japan-work-queue.json'), 'utf8'));
const mode = process.argv[2] || 'audit';
const only = process.argv.slice(3).filter((a) => !a.startsWith('-'));
const items = only.length ? queue.filter((q) => only.includes(q.key)) : queue;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolveId(page, item) {
  if (item.id) return item.id;
  // search product list
  await page.goto('https://tour.triple.partners/product-management?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(2500);
  const q = item.search || item.ko || item.cn;
  const search = page.locator('input[placeholder*="搜索"], input[placeholder*="搜尋"], input[type=search]').first();
  if (await search.count()) {
    await search.fill(q);
    await search.press('Enter').catch(() => {});
    await sleep(1500);
  }
  // click card
  const card = page.locator('div[class*="slot___StyledContainer4"]').filter({ hasText: new RegExp(item.ko || item.cn.slice(0, 4)) }).first();
  if (await card.count()) {
    await card.click();
    await sleep(2500);
    const m = page.url().match(/id=([0-9a-f-]{36})/i);
    if (m) {
      item.id = m[1];
      console.log('  resolved id', item.id, page.url());
      return item.id;
    }
  }
  // try any link
  const m2 = await page.evaluate((ko) => {
    const el = Array.from(document.querySelectorAll('div,a')).find((e) => (e.innerText || '').includes(ko) && (e.innerText || '').length < 200);
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, item.ko || '');
  if (m2) {
    await sleep(2500);
    const m = page.url().match(/id=([0-9a-f-]{36})/i);
    if (m) {
      item.id = m[1];
      return item.id;
    }
  }
  return null;
}

function matchPrices(opts, targets) {
  // map each option to expected price by 7/10 and 가는/오는 order
  // assume order: 7go, 10go, 7rtn, 10rtn
  const issues = [];
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i];
    const exp = targets[i] != null ? targets[i] : targets[i % targets.length];
    const got = String(o.price || '').replace(/,/g, '').trim();
    const name = o.name || '';
    // better match by name
    let expect = exp;
    const is7 = /7인승/.test(name);
    const is10 = /10인승/.test(name);
    if (is7) expect = targets[0];
    if (is10) expect = targets[1];
    const ok = got === String(expect) || got === String(expect) + '.0';
    if (!ok) issues.push({ i, name: name.slice(0, 50), got, expect });
  }
  return issues;
}

const { page } = await connectNolPage({ selfHint: 'japan-excel-fix', killPeers: true, forceViewport: true, viewport: { width: 1440, height: 900 } });
console.log(`
【本轮验收·三句】
1) 定位：文案/role/label/placeholder（§43）
2) 改价/时段/预约后 DOM 读回验收
3) 临时保存→下一个；永不提交审核
mode=${mode} items=${items.map((x) => x.key).join(',')}
`);

const results = [];

for (const item of items) {
  console.log(`\n========== ${item.key} ${item.cn} ==========`);
  const row = { key: item.key, cn: item.cn, id: item.id, mode };
  try {
    const id = await resolveId(page, item);
    if (!id) {
      row.status = 'NO_ID';
      console.log('【结果】找不到草稿 id');
      results.push(row);
      continue;
    }
    row.id = id;

    // always audit options first for prices+times
    if (mode === 'audit' || mode === 'all' || mode === 'prices' || mode === 'times') {
      console.log('【将要】审计选项 价格+时段');
      const opts = await auditOptions(page, id);
      row.audit = opts;
      for (const o of opts) {
        console.log(
          `  opt${o.i} price=${o.price || '?'} times=${o.times?.count}/${o.times?.first}-${o.times?.last} okT=${o.timesOk} | ${o.name}`,
        );
      }
      const priceIssues = matchPrices(opts, item.prices);
      row.priceIssues = priceIssues;
      console.log('  priceIssues', priceIssues);

      if ((mode === 'prices' || mode === 'all') && priceIssues.length) {
        for (const pi of priceIssues) {
          console.log(`【将要】①改价 opt${pi.i} ${pi.got}→${pi.expect}`);
          const r = await fixOptionPrice(page, id, pi.i, pi.expect);
          console.log('【结果】改价', r);
        }
        // re-audit prices
        const opts2 = await auditOptions(page, id);
        row.auditAfterPrice = opts2.map((o) => ({ i: o.i, price: o.price, name: o.name.slice(0, 40) }));
        row.priceIssuesAfter = matchPrices(opts2, item.prices);
        console.log('【结果】改价后 issues', row.priceIssuesAfter);
      }

      if (mode === 'times' || mode === 'all' || item.force_times) {
        const bad = (row.auditAfterPrice ? await auditOptions(page, id) : opts).filter((o) => !o.timesOk);
        const toFix = item.force_times ? opts.map((o) => o.i) : bad.map((o) => o.i);
        // unique
        const idxs = [...new Set(toFix)];
        for (const i of idxs) {
          try {
            console.log(`【将要】②时段 opt${i}`);
            await fixOptionTimes(page, id, i);
          } catch (e) {
            console.log('【失败】times', i, e?.step || '', e?.message || e);
            row.timesError = row.timesError || [];
            row.timesError.push({ i, step: e?.step, msg: String(e?.message || e).slice(0, 120) });
          }
        }
        const optsT = await auditOptions(page, id);
        row.timesAfter = optsT.map((o) => ({ i: o.i, ok: o.timesOk, t: o.times }));
        console.log('【结果】时段', row.timesAfter);
      }
    }

    if (mode === 'resv' || mode === 'all' || item.force_resv) {
      console.log('【将要】③预约字段', item.resv);
      const ids = item.resv === 'airport' ? RESV_AIRPORT : RESV_HUB;
      const sum = await fixReservation(page, id, ids);
      row.resv = sum;
      // reopen verify
      await dismiss(page);
      await page.goto(
        `https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`,
        { waitUntil: 'domcontentloaded', timeout: 60000 },
      );
      await sleep(2000);
      const body = await page.evaluate(() => document.body?.innerText || '');
      row.resvOk = !/您必須輸入代表|须填写「代表预约/.test(body);
      console.log('【结果】预约', row.resvOk, sum);
    }

    row.status = 'DONE';
  } catch (e) {
    row.status = 'ERR';
    row.error = String(e.message || e).slice(0, 250);
    console.log('【结果】ERR', row.error);
  }
  results.push(row);
  fs.writeFileSync(path.join(__dir, 'japan-excel-fix-results.json'), JSON.stringify(results, null, 2));
}

console.log('\n========== SUMMARY ==========');
for (const r of results) {
  console.log(
    `[${r.status}] ${r.key} id=${(r.id || '').slice(0, 8)} priceIssues=${r.priceIssues?.length ?? '-'} timesErr=${r.timesError?.length ?? 0} resvOk=${r.resvOk}`,
  );
}
console.log('未点提交审核');
process.exit(0);
