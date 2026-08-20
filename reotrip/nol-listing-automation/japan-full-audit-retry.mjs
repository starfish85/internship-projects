/**
 * Re-audit only ERR/crash rows + missing ids from japan-full-audit-results.json
 * Reconnect CDP per product to avoid cascade crash. READ ONLY.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { dismiss, optionUrl, regsUrl } from './lib/japan-audit-fix.mjs';
import { SPEC_CANCEL_KO, FAQ_MIDSTOP_Q } from './lib/transfer-audit-copy.mjs';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RESULTS = join(__dir, 'japan-full-audit-results.json');
const PROGRESS = join(__dir, 'japan-full-audit-progress.json');

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

function parsePrices(body) {
  const re = /(?:^|\n)(\d{1,2})\n([\d,]+)(?=\n|$)/g;
  const prices = [];
  let m;
  while ((m = re.exec(body)) && prices.length < 80) prices.push(m[2].replace(/,/g, ''));
  return [...new Set(prices)];
}

function parseTimes(body) {
  const idxA = body.indexOf('时间段');
  const idxB = body.indexOf('時間段');
  const idx = idxA >= 0 ? idxA : idxB;
  const slice = idx >= 0 ? body.slice(idx, idx + 500) : '';
  const times = slice.match(/\d{2}:\d{2}/g) || [];
  return {
    count: times.length,
    first: times[0] || '',
    last: times[times.length - 1] || '',
    ok: times.length >= 28 && times[0] === '07:00' && times[times.length - 1] === '21:30',
  };
}

async function connectPage() {
  killPeerCdpScripts('jp-retry');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const pages = browser.contexts().flatMap((c) => c.pages());
  let page =
    pages.find((p) => p.url().includes('triple.partners')) ||
    pages.find((p) => /triple\.partners/i.test(p.url())) ||
    pages[0];
  if (!page) throw new Error('no page');
  await page.bringToFront().catch(() => {});
  page.setDefaultTimeout(25000);
  page.setDefaultNavigationTimeout(50000);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
  } catch {}
  return { browser, page };
}

async function auditOne(page, row) {
  const id = row.id;
  const name = row.name;
  const e7 = row.e7;
  const e10 = row.e10;
  const out = { ...row, checks: {}, opts: [], status: 'UNCHECKED', summary: '' };

  if (!id) {
    out.status = 'FAIL';
    out.summary = '无草稿id/未定位';
    return out;
  }

  try {
    await dismiss(page);
    await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(1600);
    await dismiss(page);
    if (await page.evaluate(() => /找不到页面|아이코/.test(document.body?.innerText || ''))) {
      out.status = 'FAIL';
      out.summary = '草稿页404';
      return out;
    }

    const optN = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
    out.checks.optCount = optN;
    out.checks.optCountOk = optN >= 2 && optN <= 4;

    let priceOkAll = true;
    let timesOkAll = true;
    let koreanPt = true;
    for (let i = 0; i < Math.min(optN, 4); i++) {
      await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
      await sleep(1200);
      await dismiss(page);
      await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(i).click({ timeout: 10000 });
      await sleep(1600);
      for (let w = 0; w < 20; w++) {
        if (await page.locator('#name').inputValue().catch(() => '')) break;
        await sleep(100);
      }
      const oname = await page.locator('#name').inputValue().catch(() => '');
      const body = await page.evaluate(() => document.body.innerText || '');
      const prices = parsePrices(body);
      const times = parseTimes(body);
      const exp = /10인승/.test(oname) ? e10 : e7;
      const pOk = exp == null ? true : prices.some((p) => String(p) === String(exp));
      if (!pOk) priceOkAll = false;
      if (!times.ok) timesOkAll = false;
      // only flag English short codes in price-type area, not whole page "return"
      if (/\b(5|7|10)seat\b|seat go|seat rtn/i.test(body)) koreanPt = false;
      out.opts.push({
        i,
        name: oname.slice(0, 45),
        prices: prices.slice(0, 3),
        exp,
        priceOk: pOk,
        timesOk: times.ok,
        t: `${times.count}/${times.first}-${times.last}`,
      });
      await page.keyboard.press('Escape').catch(() => {});
      await page.getByText(/^消除$/).first().click({ timeout: 200 }).catch(() => {});
    }
    out.checks.priceOk = priceOkAll;
    out.checks.timesOk = timesOkAll;
    out.checks.koreanPriceType = koreanPt;

    await page.goto(introUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(1400);
    await dismiss(page);
    const faq = await page.evaluate((q) => {
      let midQ = false;
      let midA = false;
      for (let i = 0; i < 12; i++) {
        const qi = document.querySelector(`input[name="faqs.${i}.question"],textarea[name="faqs.${i}.question"]`);
        const ai = document.querySelector(`textarea[name="faqs.${i}.answer"]`);
        if (qi && (qi.value || '').includes(q.slice(0, 10))) midQ = true;
        if (ai && /중간 경유지|지점 간 전용/.test(ai.value || '')) midA = true;
      }
      return midQ && midA;
    }, FAQ_MIDSTOP_Q);
    out.checks.faq = faq;

    const copy = await page.evaluate(() => {
      const usage = document.querySelector('textarea[name=usage],#usage')?.value || '';
      const desc = document.querySelector('textarea[name=description],#description')?.value || '';
      const all = usage + '\n' + desc;
      return { hasFlight: /항공편|터미널|공항 픽업/.test(all), hasShinOsaka: /신오사카/.test(all) };
    });
    out.checks.copy = copy;
    const isAttraction =
      /哈利波特|晴空塔|迪士尼|环球|吉卜力|高山|铃鹿|乐高|长野|二世谷|留寿都/.test(name) &&
      !/机场|HND|NRT|KIX|ITM|CTS|NGO/.test(name);
    out.checks.copyOk = isAttraction ? !copy.hasFlight : true;
    if (/大阪站/.test(name) && copy.hasShinOsaka) out.checks.copyOk = false;

    await page.goto(regsUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(1400);
    await dismiss(page);
    const regs = await page.evaluate((exact) => {
      const ta = document.querySelector('textarea[name=specificCancelPolicy]');
      const v = (ta?.value || '').trim();
      const body = document.body.innerText || '';
      const resvEmpty = /您必須輸入代表|须填写「代表|请选择代表|必須輸入代表/.test(body);
      const resvSlice = (body.match(/代表预约信息[\s\S]{0,160}/) || [''])[0].replace(/\s+/g, ' ').slice(0, 90);
      return {
        cancelOk: v.includes('예약 확정 후 취소') && v.includes('협력사 확인'),
        cancelExact: v === exact,
        cancelPreview: v.slice(0, 36),
        resvOk: !resvEmpty && resvSlice.length > 15,
        resvSlice,
      };
    }, SPEC_CANCEL_KO);
    Object.assign(out.checks, regs);

    const fails = [];
    if (!out.checks.optCountOk) fails.push(`opts=${out.checks.optCount}`);
    if (!out.checks.priceOk) fails.push('price');
    if (!out.checks.timesOk) fails.push('times');
    if (!out.checks.koreanPriceType) fails.push('ptEN');
    if (!out.checks.faq) fails.push('faq');
    if (!out.checks.cancelOk) fails.push('cancel');
    if (!out.checks.resvOk) fails.push('resv');
    if (out.checks.copyOk === false) fails.push('copy');
    out.status = fails.length ? 'FAIL' : 'PASS';
    out.summary = fails.length
      ? `FAIL:${fails.join(',')}|faq=${out.checks.faq}|cancel=${out.checks.cancelOk}|P=${out.checks.priceOk}|T=${out.checks.timesOk}|opts=${out.checks.optCount}|resv=${out.checks.resvOk}`
      : `PASS|opts=${out.checks.optCount}|P✓T✓|faq✓|cancel✓|resv✓`;
  } catch (e) {
    out.status = 'FAIL';
    out.summary = `ERR:${String(e.message || e).slice(0, 100)}`;
    out.err = String(e.message || e).slice(0, 150);
  }
  return out;
}

// load previous
const data = JSON.parse(readFileSync(RESULTS, 'utf8'));
const products = JSON.parse(readFileSync(join(__dir, 'japan-excel-product-list.json'), 'utf8'));
const byN = new Map((data.results || []).map((r) => [r.n, r]));

// collect missing CTS ids first
const NEED_COLLECT = [
  { n: 35, name: '新千岁机场(CTS)-洞爷湖', needle: '도야코' },
  { n: 36, name: '新千岁机场(CTS)-二世谷/留寿都', needle: '니세코' }, // may also 루스쓰 CTS
  { n: 37, name: '新千岁机场(CTS)-札幌酒店', needle: '삿포로 시내 호텔', extra: '신치토세' },
  { n: 51, name: '新千岁机场(CTS)-小樽', needle: '오타루' },
  { n: 52, name: '新千岁机场(CTS)-支笏湖', needle: '시코쓰코' },
  { n: 53, name: '新千岁机场(CTS)-星野度假村', needle: '호시노' },
  { n: 54, name: '新千岁机场(CTS)-羊蹄山', needle: '요테이' },
];

let { page } = await connectPage();
const LIST = 'https://tour.triple.partners/product-management/registration?lang=zh-tw';

console.log('【将要】采集 7 个缺 id 的 CTS 产品');
for (const t of NEED_COLLECT) {
  try {
    await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(2000);
    await dismiss(page);
    let found = null;
    for (let i = 0; i < 45; i++) {
      const loc = page.locator('div[class*="slot___StyledContainer4"]').filter({ hasText: t.needle });
      const c = await loc.count();
      for (let j = 0; j < c; j++) {
        const text = await loc.nth(j).innerText().catch(() => '');
        if (t.extra && !text.includes(t.extra) && !text.includes('CTS') && !text.includes('신치토세')) continue;
        if (/신치토세|CTS/.test(text) || t.n === 36) {
          await loc.nth(j).scrollIntoViewIfNeeded();
          await loc.nth(j).click({ timeout: 8000 });
          await sleep(2500);
          const m = page.url().match(/id=([0-9a-f-]{36})/i);
          if (m) {
            found = m[1];
            break;
          }
        }
      }
      if (found) break;
      await page.evaluate(() => window.scrollBy(0, 900));
      await sleep(200);
    }
    console.log(`  #${t.n} ${t.name} → ${found ? found.slice(0, 8) : '未找到'}`);
    if (found && byN.has(t.n)) {
      byN.get(t.n).id = found;
    }
  } catch (e) {
    console.log('  collect err', t.n, e.message?.slice(0, 60));
    // reconnect
    try {
      ({ page } = await connectPage());
    } catch {}
  }
}

// rows needing re-audit: ERR crash or was only 无id (now maybe has id) or all non-PASS that aren't solid
const todo = [...byN.values()].filter(
  (r) =>
    r.status !== 'PASS' &&
    (String(r.summary || '').includes('crashed') ||
      String(r.summary || '').includes('ERR') ||
      String(r.summary || '').includes('无草稿') ||
      r.summary === 'FAIL:ptEN|faq=true|cancel=true|P=true|T=true|opts=4|resv=true'),
);
console.log('【将要】重检', todo.length, '条（崩溃/缺id/ptEN）');

for (const r of todo) {
  console.log(`\n======== 重检 #${r.n} ${r.name} ========`);
  try {
    // reconnect every few to reduce crash cascade
    if (r.n % 5 === 0) {
      try {
        ({ page } = await connectPage());
      } catch {}
    }
    const updated = await auditOne(page, r);
    console.log(`【结果】${updated.status} ${updated.summary}`);
    byN.set(r.n, updated);
  } catch (e) {
    console.log('【结果】FAIL ERR reconnect', e.message?.slice(0, 80));
    try {
      ({ page } = await connectPage());
    } catch {}
    // try once more
    try {
      const updated = await auditOne(page, r);
      console.log(`【结果】retry ${updated.status} ${updated.summary}`);
      byN.set(r.n, updated);
    } catch (e2) {
      byN.set(r.n, { ...r, status: 'FAIL', summary: `ERR:${String(e2.message).slice(0, 80)}` });
    }
  }
  const results = [...byN.values()].sort((a, b) => a.n - b.n);
  const pass = results.filter((x) => x.status === 'PASS').length;
  const fail = results.filter((x) => x.status === 'FAIL').length;
  const unchecked = results.filter((x) => x.status === 'UNCHECKED' || String(x.summary || '').includes('crashed')).length;
  writeFileSync(RESULTS, JSON.stringify({ N: 56, results, note: 'retry after crash' }, null, 2));
  writeFileSync(
    PROGRESS,
    JSON.stringify(
      {
        N: 56,
        checked: results.filter((x) => x.status === 'PASS' || (x.status === 'FAIL' && !String(x.summary).includes('crashed'))).length,
        pass,
        fail,
        remainingCrash: results.filter((x) => String(x.summary || '').includes('crashed') || String(x.summary || '').includes('ERR:')).map((x) => `#${x.n} ${x.name}`),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

const results = [...byN.values()].sort((a, b) => a.n - b.n);
console.log('\n\n========== 全量表（重检后）==========');
for (const r of results) {
  console.log(`#${String(r.n).padStart(2, '0')} ${String(r.status).padEnd(4)} ${r.name} | ${r.summary} | id=${(r.id || '-').slice(0, 8)}`);
}
const pass = results.filter((x) => x.status === 'PASS').length;
const fail = results.filter((x) => x.status === 'FAIL').length;
const stillCrash = results.filter((x) => /crashed|ERR:/.test(String(x.summary || '')));
const noId = results.filter((x) => /无草稿/.test(String(x.summary || '')));
console.log(`\nN=56 PASS=${pass} FAIL=${fail} stillERR=${stillCrash.length} noId=${noId.length}`);
if (stillCrash.length || noId.length) {
  console.log('【未完成项】');
  [...stillCrash, ...noId].forEach((x) => console.log(`  #${x.n} ${x.name} | ${x.summary}`));
  console.log('未全部有效检查完成；禁止称「全部检查完成」');
  process.exit(3);
}
console.log('有效检查完成（未进入修改阶段）');
console.log('未点提交审核');
process.exit(0);
