/**
 * Pop Mart holidays — same proven path as fix-tussauds-holidays.mjs
 * draft: 3851a9dd-61bb-4b8c-ad7a-e6616eb3f611
 * 5: oct/may 313, spring 438 | 7: oct/may 446, spring 625 (symmetric)
 * 每「选项×段」listClean；openCal/选日 **元素 .click**（§43 禁坐标）；验收 日\n价
 * NEVER 提交审核
 */
import { chromium } from 'playwright';

const DRAFT = '3851a9dd-61bb-4b8c-ad7a-e6616eb3f611';
const LIST_URL = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OPTS = [
  { label: '5go', oct: '313', spring: '438', may: '313' },
  { label: '7go', oct: '446', spring: '625', may: '446' },
  { label: '5rtn', oct: '313', spring: '438', may: '313' },
  { label: '7rtn', oct: '446', spring: '625', may: '446' },
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
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click();
  });
  await sleep(300);
  await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
  // §43: scroll + locator click（禁止 mouse 坐标）
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
  // §43: PlainDayButton 元素 .click()
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
    const cells = document.querySelectorAll(
      '[class*="custom-day___StyledContainer"], td.rdp-cell, [class*="sale-period-day"]',
    );
    for (const el of cells) {
      const t = (el.innerText || '').trim();
      const m = t.match(/^(\d{1,2})\s*[\n\s]+(\d+)/);
      if (m && wantDays.includes(+m[1])) out[m[1]] = m[2];
    }
    return out;
  }, days);
}

async function fillSegment(optIdx, seg, price) {
  const label = `${OPTS[optIdx].label}/${seg.key}/${price}`;
  console.log(`\n→ ${label}`);
  await listClean();
  console.log('  openCal', optIdx);
  await openCal(optIdx);
  console.log('  gotoMonth', seg.year, seg.month);
  await gotoMonth(seg.year, seg.month);
  const hit = await selectDays(seg.start, seg.end);
  console.log('  selected days', hit, 'expect', seg.end - seg.start + 1);
  if (hit < (seg.end - seg.start + 1) * 0.7) {
    console.log('  WARN low hit, continue');
  }
  const okFill = await fillPrice(price);
  console.log('  fillPrice', okFill, price);
  if (!okFill) throw new Error('price fill failed ' + label);
  await complete();
  console.log('  完成');

  // verify reopen
  await listClean();
  await openCal(optIdx);
  const checkDays = [seg.start, Math.min(seg.start + 4, seg.end), seg.end];
  const prices = await readDayPrices(seg.year, seg.month, checkDays);
  console.log('  verify', prices);
  const allOk = checkDays.every((d) => prices[d] === String(price));
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click();
  });
  await sleep(400);
  if (!allOk) throw new Error(`verify fail ${label} ${JSON.stringify(prices)}`);
  console.log('  PASS', label);
  return true;
}

// —— main ——
console.log('Pop Mart holidays (tussauds path)');
await listClean();
const fails = [];
for (let oi = 0; oi < 4; oi++) {
  for (const seg of SEGS) {
    const price = OPTS[oi][seg.key];
    try {
      await fillSegment(oi, seg, price);
    } catch (e) {
      console.log('  FAIL', e.message);
      try {
        console.log('  retry once');
        await fillSegment(oi, seg, price);
      } catch (e2) {
        console.log('  FAIL2', e2.message);
        fails.push({ oi, label: OPTS[oi].label, seg: seg.key, err: e2.message });
      }
    }
  }
}

await listClean();
// optional page temp save
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button')).filter(
    (b) => (b.innerText || '').trim() === '临时保存' && !b.disabled,
  );
  btns[btns.length - 1]?.click();
});
await sleep(1500);

// final verify spring 7go/7rtn 625, 5go 438
console.log('\n=== final verify ===');
for (const [oi, expect] of [
  [0, '438'],
  [1, '625'],
  [2, '438'],
  [3, '625'],
]) {
  await listClean();
  await openCal(oi);
  const p = await readDayPrices(2027, 2, [1, 8, 15]);
  const ok = [1, 8, 15].every((d) => p[d] === expect);
  console.log(OPTS[oi].label, 'spring', p, ok ? 'PASS' : 'FAIL');
  if (!ok) fails.push({ oi, label: OPTS[oi].label, seg: 'spring-final', err: JSON.stringify(p) });
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click();
  });
}

await listClean();
console.log('fails', fails.length, JSON.stringify(fails));
console.log('STOP list; NEVER 提交审核');
process.exit(fails.length ? 2 : 0);
