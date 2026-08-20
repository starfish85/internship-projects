/**
 * JinMao holiday prices — same Excel cells as Pearl/Top (2026-08-06).
 * Nav: custom-caption__NextButton; days: custom-day__PlainDayButton + mouse;
 * price enables after day select; 完成 closes.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Excel row-by-row (user 2026-08-06): 7座去程春节 510 ≠ 7座返程 500 — never "harmonize"
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
await page.bringToFront().catch(() => {});

// clean list page
await page.keyboard.press('Escape').catch(() => {});
await sleep(300);
await page.goto(
  'https://tour.triple.partners/product-management/registration/option?id=6be1a050-26d4-4ab9-a68f-23ef30b251dd&status=UNPUBLISHED&lang=zh-tw',
  { waitUntil: 'domcontentloaded' },
);
await sleep(3000);
console.log('START', page.url());

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
  for (let i = 0; i < 40; i++) {
    const cur = parseCap(await caption());
    if (!cur) {
      await sleep(200);
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
    await sleep(260);
  }
  throw new Error(`goto ${year}-${month} failed, at ${await caption()}`);
}

async function openCal(idx) {
  // close if open
  const open = await page.evaluate(
    () => document.body.innerText.includes('消除') && document.body.innerText.includes('完成') && document.body.innerText.includes('销售日历'),
  );
  if (open) {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '消除')
        ?.click();
    });
    await sleep(800);
  }
  const cals = page.getByRole('button', { name: /销售日历管理/ });
  await cals.nth(idx).click({ force: true });
  await sleep(1800);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').includes('选择单个日期'))
      ?.click();
  });
  await sleep(500);
}

async function selectDays(start, end) {
  // §43: 元素 .click，禁止 mouse 坐标
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
      await sleep(40);
      break;
    }
    if (!ok) console.log('    missing day', d);
  }
}

async function fillPrice(price) {
  // wait enable
  for (let i = 0; i < 15; i++) {
    const st = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('input')).find(
        (i) =>
          (i.placeholder || '').includes('请输入价格') || (i.placeholder || '').includes('請輸入價格'),
      );
      return el ? { d: el.disabled } : { missing: true };
    });
    if (st.missing) return false;
    if (!st.d) break;
    await sleep(150);
  }
  const loc = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]').last();
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

for (let oi = 0; oi < 4; oi++) {
  const opt = OPTS[oi];
  console.log(`\n======== ${oi} ${opt.label} ========`);
  for (const seg of SEGS) {
    const price = opt[seg.key];
    console.log(`  ${seg.key} ${seg.year}-${seg.month} d${seg.start}-${seg.end} → ${price}`);
    try {
      await openCal(oi);
      await gotoMonth(seg.year, seg.month);
      console.log('    at', await caption());
      await selectDays(seg.start, seg.end);
      const ok = await fillPrice(price);
      console.log('    price', ok);
      if (!ok) throw new Error('price fill failed');
      await complete();
      console.log('    done');
    } catch (e) {
      console.log('    ERR', e.message);
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(500);
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button'))
          .find((b) => (b.innerText || '').trim() === '消除')
          ?.click();
      });
      await sleep(800);
    }
  }
}

// verify a few cells: open cal, goto spring, read day containers
async function readDayPrices(year, month, days) {
  await gotoMonth(year, month);
  return page.evaluate((wantDays) => {
    const out = {};
    for (const btn of document.querySelectorAll('button[class*="custom-day__PlainDayButton"]')) {
      const lines = (btn.innerText || '').trim().split('\n').map(s=>s.trim()).filter(Boolean);
      // parent container may hold price
      let text = btn.innerText || '';
      let p = btn.parentElement;
      for (let i=0;i<4 && p;i++) {
        const pt = (p.innerText||'').trim();
        if (pt.includes('\n') || /\d{2,}/.test(pt)) { text = pt; break; }
        p = p.parentElement;
      }
      const parts = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
      const day = parts[0];
      if (wantDays.includes(+day)) {
        out[day] = parts.slice(1).join('|') || parts.join('|');
      }
    }
    // also scan sale-period containers
    for (const el of document.querySelectorAll('[class*="sale-period-day"], [class*="DayContent"], div')) {
      const t = (el.innerText||'').trim();
      if (!/^\d{1,2}\n\d+/.test(t) && !/^\d{1,2}\s+\d+/.test(t)) continue;
      const m = t.match(/^(\d{1,2})[\n\s]+(\d+)/);
      if (m && wantDays.includes(+m[1])) out[m[1]] = m[2];
    }
    return out;
  }, days);
}

const checks = [];
for (let oi = 0; oi < 4; oi++) {
  const opt = OPTS[oi];
  try {
    await openCal(oi);
    const spring = await readDayPrices(2027, 2, [1, 15]);
    const expect = opt.spring;
    const ok1 = String(spring['1']||'').includes(expect);
    const ok15 = String(spring['15']||'').includes(expect);
    checks.push({ oi, label: opt.label, spring, expect, ok: ok1 && ok15 });
    console.log('VERIFY', oi, opt.label, spring, 'expect', expect, ok1&&ok15);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find(b=>(b.innerText||'').trim()==='消除')?.click();
    });
    await sleep(800);
  } catch (e) {
    checks.push({ oi, label: opt.label, err: e.message, ok: false });
  }
}

// temp save list
await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll('button'))
    .map((b, i) => {
      const r = b.getBoundingClientRect();
      return { i, t: (b.innerText || '').trim(), d: b.disabled, y: Math.round(r.y) };
    })
    .filter((b) => b.t === '临时保存' && !b.d)
    .sort((a, b) => b.y - a.y);
  if (c[0]) document.querySelectorAll('button')[c[0].i].click();
});
await sleep(2000);
console.log('\nCHECKS', JSON.stringify(checks, null, 2));
console.log('ALL DONE', page.url());
console.log('NEVER 提交审核');
const allOk = checks.length===4 && checks.every(c=>c.ok);
process.exit(allOk ? 0 : 2);
