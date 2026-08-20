/**
 * Set price via 销售日历管理 for empty 10-seat calendars.
 * Pattern: open option → 销售日历管理 → select period / multi days → fill price → 完成 → 临时保存→下一个
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { page } = await connectNolPage({
  selfHint: 'fix-10seat-cal',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

async function tempSaveNext() {
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(200);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { el: b, t: (b.innerText || '').trim(), d: b.disabled, w: r.width };
      })
      .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d)
      .sort((a, b) => a.w - b.w);
    btns[0]?.el.click();
  });
  await sleep(2200);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { el: b, t: (b.innerText || '').trim(), d: b.disabled, w: r.width };
      })
      .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d && x.w > 100)
      .sort((a, b) => b.w - a.w);
    btns[0]?.el.click();
  });
  await sleep(2200);
  await dismiss(page);
}

async function openOpt(id, i) {
  await dismiss(page);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
  await sleep(2500);
  for (let w = 0; w < 25; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await sleep(200);
  }
  return page.locator('#name').inputValue();
}

async function readCal() {
  await page.evaluate(() => window.scrollTo(0, 2000));
  await sleep(300);
  return page.evaluate(() => {
    const body = document.body.innerText || '';
    const prices = [];
    const re = /(?:^|\n)(\d{1,2})\n(\d{2,5})(?=\n|$)/g;
    let m;
    while ((m = re.exec(body)) && prices.length < 40) prices.push(m[2]);
    return [...new Set(prices)];
  });
}

async function dumpPriceSection() {
  return page.evaluate(() => {
    const body = document.body.innerText || '';
    const idx = Math.max(body.indexOf('销售'), body.indexOf('价格'), body.indexOf('期间'));
    return {
      slice: body.slice(Math.max(0, idx), Math.max(0, idx) + 800),
      inputs: Array.from(document.querySelectorAll('input')).map((i) => ({
        ph: i.placeholder,
        name: i.name,
        v: i.value,
        d: i.disabled,
        type: i.type,
        y: Math.round(i.getBoundingClientRect().y),
      })).filter((x) => x.y > 100 && x.y < 1200 && x.type !== 'hidden' && x.type !== 'checkbox'),
      radios: Array.from(document.querySelectorAll('input[type=radio]')).map((i) => ({
        name: i.name,
        value: i.value,
        checked: i.checked,
      })).filter((r) => /YEAR|PERIOD|period|sale|Sale/.test(r.name + r.value)),
    };
  });
}

// Debug one empty 10-seat on tks
const ID = '09714a30-dc94-4378-a238-ed8a37a5d234';
const name = await openOpt(ID, 1);
console.log('name', name);
console.log('dump before', JSON.stringify(await dumpPriceSection(), null, 2).slice(0, 2500));

// try 销售日历管理
const calBtns = page.locator('button').filter({ hasText: /销售日历管理/ });
console.log('cal manage count', await calBtns.count());
if (await calBtns.count()) {
  await calBtns.first().scrollIntoViewIfNeeded();
  await calBtns.first().click();
  await sleep(2000);
  const popup = await page.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      hasMulti: /选择单个日期|可多选/.test(t),
      hasPrice: /请输入价格|請輸入價格/.test(t),
      hasComplete: /完成/.test(t),
      caption: (t.match(/\d+\s*月\s*\d{4}|20\d{2}/) || [])[0],
      buttons: Array.from(document.querySelectorAll('button'))
        .map((b) => (b.innerText || '').trim())
        .filter((x) => x && x.length < 40)
        .slice(0, 40),
    };
  });
  console.log('popup', popup);

  // click 选择单个日期（可多选） if present
  await page.getByText(/选择单个日期|可多选/).first().click({ timeout: 3000 }).catch(() => {});
  await sleep(500);

  // select a range of days in current month - first 10 plain day buttons
  const days = page.locator('button[class*="PlainDayButton"]');
  const dn = await days.count();
  console.log('day buttons', dn);
  const max = Math.min(dn, 15);
  for (let i = 0; i < max; i++) {
    await days.nth(i).click({ timeout: 1000 }).catch(() => {});
  }
  await sleep(500);

  // fill price
  const ph = page.getByPlaceholder(/请输入价格|請輸入價格/);
  if (await ph.count()) {
    await ph.fill('1176');
    console.log('filled popup price', await ph.inputValue());
  } else {
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('input')).find((i) =>
        /价格|價格/.test(i.placeholder || ''),
      );
      if (!el) return;
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, '1176');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // 完成
  await page.getByRole('button', { name: /^完成$/ }).click({ timeout: 5000 }).catch(async () => {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '完成' && !b.disabled)
        ?.click();
    });
  });
  await sleep(1500);
}

// also try ONE_YEAR + fill on main form again after cal
await page.locator('input[value=ONE_YEAR]').click({ force: true }).catch(() => {});
await sleep(800);
await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('input')).find(
    (i) =>
      ((i.placeholder || '').includes('请输入价格') || (i.placeholder || '').includes('請輸入價格')) &&
      !i.disabled,
  );
  if (!el) return;
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  s.call(el, '1176');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(500);

const cal = await readCal();
console.log('cal after', cal);
await tempSaveNext();

// verify
await openOpt(ID, 1);
console.log('verify cal', await readCal());
console.log('dump after', JSON.stringify(await dumpPriceSection(), null, 2).slice(0, 1500));
process.exit(0);
