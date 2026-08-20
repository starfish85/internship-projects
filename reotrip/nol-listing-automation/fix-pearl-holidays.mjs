/**
 * Pearl holiday calendar overrides for 4 options.
 * 5-seat: Oct/May 304, Spring 425
 * 7-seat: Oct/May 357, Spring 500
 * One segment at a time, 完成 each. Never 提交审核.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// option index → holiday price
// Excel: 7go spring 510 ≠ 7rtn spring 500 (user correction 2026-08-06)
const OPT_PRICES = [
  { label: '5go', oct: '304', spring: '425', may: '304' },
  { label: '7go', oct: '357', spring: '510', may: '357' },
  { label: '5rtn', oct: '304', spring: '425', may: '304' },
  { label: '7rtn', oct: '357', spring: '500', may: '357' },
];

const SEGMENTS = [
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
console.log('START', page.url());

// Close leftover option form
if (page.url().includes('option-form') || page.url().includes('popup')) {
  await page.keyboard.press('Escape');
  await sleep(500);
  const ok = page.getByRole('button', { name: /^确定$/ });
  if ((await ok.count()) > 0) {
    await ok.last().click();
    await sleep(800);
  }
  await page.evaluate(() => {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });
  await sleep(500);
}

async function calendarCaption() {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div,span'));
    const hit = els.find((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return /^\d{1,2}\s*月\s*20\d{2}$/.test(t) && r.width > 40;
    });
    return hit ? hit.innerText.trim() : null;
  });
}

function parseCaption(c) {
  const m = String(c || '').match(/^(\d{1,2})\s*月\s*(20\d{2})$/);
  if (!m) return null;
  return { month: Number(m[1]), year: Number(m[2]) };
}

async function gotoMonth(year, month) {
  for (let guard = 0; guard < 36; guard++) {
    const cur = parseCaption(await calendarCaption());
    if (!cur) {
      await sleep(300);
      continue;
    }
    if (cur.year === year && cur.month === month) return `${year}-${String(month).padStart(2, '0')}`;
    const delta = (year - cur.year) * 12 + (month - cur.month);
    const next = delta > 0;
    await page.evaluate((goNext) => {
      const btn = document.querySelector(
        goNext
          ? 'button[class*="custom-caption__NextButton"], button[aria-label*="next"], button[aria-label*="下"]'
          : 'button[class*="custom-caption__PreviousButton"], button[aria-label*="prev"], button[aria-label*="上"]',
      );
      if (btn) {
        btn.click();
        return;
      }
      // fallback: chevron buttons near caption
      const caps = Array.from(document.querySelectorAll('button')).filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width < 50 && r.height < 50 && r.y > 50 && r.y < 400;
      });
      // try last/first small buttons in calendar header
      if (goNext) caps[caps.length - 1]?.click();
      else caps[0]?.click();
    }, next);
    await sleep(250);
  }
  throw new Error(`Cannot reach ${year}-${month}`);
}

async function openCalendar(optionIndex) {
  // close any open dialog first
  if (await page.locator('[role=dialog]').count()) {
    await page.keyboard.press('Escape');
    await sleep(400);
    const ok = page.getByRole('button', { name: /^确定$/ });
    if ((await ok.count()) > 0) await ok.last().click().catch(() => {});
    await sleep(500);
  }

  const cals = page.getByRole('button', { name: /销售日历管理|판매 캘린더/ });
  const n = await cals.count();
  console.log(`  cal buttons ${n}, open ${optionIndex}`);
  if (optionIndex >= n) throw new Error('no calendar button');
  await cals.nth(optionIndex).click({ force: true });
  await sleep(1500);

  // tab: 选择单个日期（可多选）
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button, [role=tab], div, span')).find((e) => {
      const t = (e.innerText || '').trim();
      return (
        (t.includes('单个日期') || t.includes('單一日期') || t.includes('단일 날짜')) &&
        t.length < 40
      );
    });
    tab?.click();
  });
  await sleep(500);
}

async function clickDay(day) {
  await page.evaluate((d) => {
    const btns = Array.from(
      document.querySelectorAll('button[class*="custom-day__PlainDayButton"], button'),
    ).filter((b) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      // day button: exact day number, not disabled, in calendar area
      return (
        t === String(d) ||
        t.startsWith(String(d) + '\n') ||
        new RegExp(`^${d}\\n`).test(t) ||
        t.split('\n')[0] === String(d)
      ) && r.width > 20 && r.height > 20 && r.y > 150 && r.y < 700 && !b.disabled;
    });
    // prefer first match that is ONLY the day or day+price in current month grid
    const plain = btns.find((b) => {
      const t = (b.innerText || '').trim();
      return t === String(d) || t.split('\n')[0] === String(d);
    });
    (plain || btns[0])?.click();
  }, day);
  await sleep(40);
}

async function fillPrice(price) {
  const ok = await page.evaluate((p) => {
    const inputs = Array.from(document.querySelectorAll('input[placeholder="请输入价格"], input[placeholder="請輸入價格"], input[placeholder*="价格"], input[placeholder*="價格"]'));
    const el = inputs.filter((i) => !i.disabled && i.getBoundingClientRect().width > 50).at(-1);
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, p);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value === p;
  }, String(price));
  if (!ok) {
    const loc = page.locator('input[placeholder*="价格"], input[placeholder*="價格"]').last();
    if ((await loc.count()) && !(await loc.isDisabled())) {
      await loc.fill(String(price));
      return (await loc.inputValue()) === String(price);
    }
  }
  return ok;
}

async function saveCalendar() {
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '完成' || t === '완료') && !x.disabled;
    });
    b?.click();
  });
  await sleep(1800);
  // check still open
  const open = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role=dialog], *')).some((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return r.width > 300 && r.height > 300 && t.includes('销售日历') && t.includes('完成');
    }),
  );
  return !open;
}

async function setSegment(optIndex, seg, price) {
  console.log(`  → ${seg.key} ${seg.year}-${seg.month} ${seg.start}-${seg.end} price=${price}`);
  await openCalendar(optIndex);
  await gotoMonth(seg.year, seg.month);
  for (let d = seg.start; d <= seg.end; d++) {
    await clickDay(d);
  }
  const filled = await fillPrice(price);
  console.log(`    price filled?`, filled);
  if (!filled) throw new Error('price not filled ' + price);
  const saved = await saveCalendar();
  console.log(`    saved?`, saved);
  if (!saved) {
    // try 完成 again
    await page.getByRole('button', { name: /^完成$|^완료$/ }).last().click().catch(() => {});
    await sleep(1500);
  }
  await sleep(500);
}

// Process each option
for (let oi = 0; oi < 4; oi++) {
  const opt = OPT_PRICES[oi];
  console.log(`\n======== CAL ${oi} ${opt.label} ========`);
  try {
    for (const seg of SEGMENTS) {
      const price = opt[seg.key];
      await setSegment(oi, seg, price);
    }
  } catch (e) {
    console.log('  ERROR', e.message);
    // try close
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(500);
  }
}

// list temp save
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

console.log('\nDONE holidays', page.url());
console.log(
  await page.evaluate(() => ({
    sale: (document.body.innerText.match(/可销售|销售中/g) || []).length,
    hasAll: ['5인승', '7인승', '호텔 출발', '동방명주탑 출발'].every((s) =>
      document.body.innerText.includes(s),
    ),
  })),
);
process.exit(0);
