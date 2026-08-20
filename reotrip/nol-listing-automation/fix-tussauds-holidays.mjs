/**
 * Tussauds Shanghai — holiday calendar (Excel 售价列, 2026-08-06).
 * draft: 4f20f9a8-0e5a-48fd-942e-5ebd469cb68e
 * 每「选项×段」listClean；第4卡 scroll+mouse；验收容器 日\n价（7go 510 / 7rtn 500）
 * NEVER 提交审核
 */
import { chromium } from 'playwright';

const DRAFT =
  '4f20f9a8-0e5a-48fd-942e-5ebd469cb68e';
const LIST_URL = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Excel row-by-row: 7座去程春节 510 ≠ 7座返程 500 — never harmonize
const OPTS = [
  { label: '5go', oct: '304', spring: '425', may: '304' },
  { label: '7go', oct: '357', spring: '510', may: '357' },
  { label: '5rtn', oct: '304', spring: '425', may: '304' },
  { label: '7rtn', oct: '357', spring: '500', may: '357' },
];
const SEGS = [
  { key: 'oct', year: 2026, month: 10, start: 1, end: 10 },
  { key: 'spring', year: 2027, month: 2, start: 1, end: 15 },
  { key: 'may', year: 2027, month: 5, start: 1, end: 10 },
];

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
if (!page) throw new Error('no NOL tab');
await page.bringToFront().catch(() => {});

async function listClean() {
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(200);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click();
  });
  await sleep(400);
  // leave dialog stay
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click();
  });
  await sleep(300);
  await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const n = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('button')).filter((b) =>
        (b.innerText || '').includes('销售日历管理'),
      ).length,
  );
  if (n < 4) throw new Error(`listClean cals=${n} need 4`);
  return n;
}

async function caption() {
  return page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div,span')).find((e) =>
      /^\d{1,2}\s*月\s*20\d{2}$/.test((e.innerText || '').trim()),
    );
    return el?.innerText?.trim() || null;
  });
}

function parseCap(c) {
  const m = String(c || '').match(/^(\d{1,2})\s*月\s*(20\d{2})$/);
  return m ? { month: +m[1], year: +m[2] } : null;
}

async function gotoMonth(year, month) {
  for (let i = 0; i < 50; i++) {
    const cur = parseCap(await caption());
    if (!cur) {
      await sleep(250);
      continue;
    }
    if (cur.year === year && cur.month === month) return true;
    const delta = (year - cur.year) * 12 + (month - cur.month);
    if (delta > 0) {
      await page.evaluate(() =>
        document.querySelector('button[class*="custom-caption__NextButton"]')?.click(),
      );
    } else {
      await page.evaluate(() =>
        document.querySelector('button[class*="custom-caption__PreviousButton"]')?.click(),
      );
    }
    await sleep(280);
  }
  throw new Error(`goto ${year}-${month} failed, at ${await caption()}`);
}

async function openCal(idx) {
  // §43: scroll + locator.click（禁止 mouse 坐标）
  const btn = page.getByRole('button', { name: /销售日历管理/ }).nth(idx);
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 15000 });
  await sleep(2000);
  for (let w = 0; w < 15; w++) {
    const c = await caption();
    if (c) break;
    await sleep(200);
  }
  const multi = page.locator('button').filter({ hasText: /选择单个日期/ });
  if (await multi.count()) await multi.first().click({ timeout: 8000 });
  await sleep(500);
  const cap = await caption();
  if (!cap) throw new Error(`caption=null after openCal ${idx}`);
  return cap;
}

async function selectDays(start, end) {
  let hit = 0;
  for (let d = start; d <= end; d++) {
    const dayBtn = page.locator('button[class*="custom-day__PlainDayButton"]').filter({
      hasText: new RegExp(`^${d}$`),
    });
    const n = await dayBtn.count();
    let ok = false;
    for (let i = 0; i < n; i++) {
      if (await dayBtn.nth(i).isDisabled().catch(() => true)) continue;
      const t = (await dayBtn.nth(i).innerText()).trim().split('\n')[0];
      if (t !== String(d)) continue;
      await dayBtn.nth(i).scrollIntoViewIfNeeded().catch(() => {});
      await dayBtn.nth(i).click({ force: true, timeout: 8000 });
      ok = true;
      hit++;
      await sleep(40);
      break;
    }
    if (!ok) console.log('    missing day', d);
  }
  return hit;
}

async function fillPrice(price) {
  for (let i = 0; i < 20; i++) {
    const st = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('input')).find(
        (inp) =>
          (inp.placeholder || '').includes('请输入价格') ||
          (inp.placeholder || '').includes('請輸入價格'),
      );
      return el ? { d: el.disabled } : { missing: true };
    });
    if (st.missing) return false;
    if (!st.d) break;
    await sleep(150);
  }
  const loc = page
    .locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]')
    .last();
  await loc.scrollIntoViewIfNeeded();
  await loc.fill(String(price));
  const v = await loc.inputValue();
  return v === String(price);
}

async function complete() {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '完成' && !b.disabled)
      ?.click();
  });
  await sleep(1800);
}

async function readDayPrices(year, month, days) {
  await gotoMonth(year, month);
  await sleep(400);
  return page.evaluate((wantDays) => {
    const out = {};
    // containers: custom-day___StyledContainer / rdp-cell → "1\n510"
    const cells = document.querySelectorAll(
      '[class*="custom-day___StyledContainer"], td.rdp-cell, [class*="sale-period-day"]',
    );
    for (const el of cells) {
      const t = (el.innerText || '').trim();
      const m = t.match(/^(\d{1,2})\s*[\n\s]+(\d+)/);
      if (m && wantDays.includes(+m[1])) out[m[1]] = m[2];
    }
    // fallback walk parents of PlainDayButton
    for (const btn of document.querySelectorAll(
      'button[class*="custom-day__PlainDayButton"]',
    )) {
      let p = btn;
      for (let i = 0; i < 5 && p; i++) {
        const t = (p.innerText || '').trim();
        const m = t.match(/^(\d{1,2})\s*[\n\s]+(\d+)/);
        if (m && wantDays.includes(+m[1])) {
          out[m[1]] = m[2];
          break;
        }
        p = p.parentElement;
      }
    }
    return out;
  }, days);
}

// ---- main fill ----
console.log('START tussauds holidays', DRAFT);
await listClean();
console.log('listClean ok cals=4');

const results = [];
for (let oi = 0; oi < 4; oi++) {
  const opt = OPTS[oi];
  console.log(`\n======== ${oi} ${opt.label} ========`);
  for (const seg of SEGS) {
    const price = opt[seg.key];
    console.log(`  ${seg.key} ${seg.year}-${seg.month} d${seg.start}-${seg.end} → ${price}`);
    try {
      await listClean();
      const cap0 = await openCal(oi);
      console.log('    open at', cap0);
      await gotoMonth(seg.year, seg.month);
      console.log('    at', await caption());
      const hit = await selectDays(seg.start, seg.end);
      console.log('    days hit', hit);
      const ok = await fillPrice(price);
      console.log('    price', ok, price);
      if (!ok) throw new Error('price fill failed');
      await complete();
      results.push({ oi, label: opt.label, seg: seg.key, price, ok: true });
      console.log('    done');
    } catch (e) {
      console.log('    ERR', e.message);
      results.push({ oi, label: opt.label, seg: seg.key, price, ok: false, err: e.message });
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(400);
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button'))
          .find((b) => (b.innerText || '').trim() === '消除')
          ?.click();
      });
      await sleep(600);
    }
  }
}

// ---- verify spring cells (critical 510/500) ----
console.log('\n======== VERIFY spring cells ========');
const checks = [];
for (let oi = 0; oi < 4; oi++) {
  const opt = OPTS[oi];
  try {
    await listClean();
    await openCal(oi);
    const spring = await readDayPrices(2027, 2, [1, 15]);
    const expect = opt.spring;
    const ok1 = String(spring['1'] || '').includes(expect);
    const ok15 = String(spring['15'] || '').includes(expect);
    const ok = ok1 && ok15;
    checks.push({ oi, label: opt.label, spring, expect, ok });
    console.log('VERIFY', oi, opt.label, spring, 'expect', expect, ok ? 'OK' : 'FAIL');
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '消除')
        ?.click();
    });
    await sleep(800);
  } catch (e) {
    checks.push({ oi, label: opt.label, err: e.message, ok: false });
    console.log('VERIFY ERR', oi, e.message);
  }
}

// page temp-save (list footer — never 提交审核)
await listClean();
await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll('button'))
    .map((b, i) => {
      const r = b.getBoundingClientRect();
      return { i, t: (b.innerText || '').trim(), d: b.disabled, y: Math.round(r.y), w: Math.round(r.width) };
    })
    .filter((b) => (b.t === '临时保存' || b.t === '臨時存儲') && !b.d)
    .sort((a, b) => b.y - a.y || a.w - b.w);
  if (c[0]) document.querySelectorAll('button')[c[0].i].click();
});
await sleep(2000);

const fillOk = results.filter((r) => r.ok).length;
const fillFail = results.filter((r) => !r.ok);
const allVerify = checks.length === 4 && checks.every((c) => c.ok);

console.log('\nFILL_RESULTS', JSON.stringify(results, null, 2));
console.log('CHECKS', JSON.stringify(checks, null, 2));
console.log('fillOk', fillOk, '/12 fail', fillFail.length);
console.log('verifyAll', allVerify);
console.log('URL', page.url());
console.log('NEVER 提交审核');
process.exit(allVerify && fillFail.length === 0 ? 0 : 2);
