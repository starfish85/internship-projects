/**
 * PKX holidays — listClean per segment, element/text locators, verify 日\n价
 * 7go: 581 / 814 / 581 | 7rtn: 727 / 1017 / 727
 * NEVER 提交审核
 * §52: no setViewport by default; innerWidth gate; one CDP only
 */
import { connectNolPage, normPrice } from './lib/cdp-session.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DRAFT = '761d6911-b55e-47c0-af96-08f04636f8a2';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;

const OPTS = [
  { label: '7go', oct: '457', spring: '639', may: '457' },
  { label: '7rtn', oct: '581', spring: '814', may: '581' },
];
const SEGS = [
  { key: 'oct', year: 2026, month: 10, start: 1, end: 10 },
  { key: 'spring', year: 2027, month: 2, start: 1, end: 15 },
  { key: 'may', year: 2027, month: 5, start: 1, end: 10 },
];

const { page } = await connectNolPage({ selfHint: 'sha-fix-holidays', killPeers: true });

async function listClean() {
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(200);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click();
  });
  await sleep(400);
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  const n = await page.getByRole('button', { name: /销售日历管理/ }).count();
  if (n < 2) throw new Error(`cals=${n}`);
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

async function gotoMonth(year, month) {
  for (let i = 0; i < 50; i++) {
    const c = await caption();
    const m = String(c || '').match(/^(\d{1,2})\s*月\s*(20\d{2})$/);
    if (m && +m[1] === month && +m[2] === year) return true;
    const cur = m ? +m[2] * 12 + +m[1] : 0;
    const tgt = year * 12 + month;
    if (cur && cur < tgt) {
      await page.locator('button[class*="custom-caption__NextButton"]').click({ force: true }).catch(async () => {
        await page.evaluate(() =>
          document.querySelector('button[class*="custom-caption__NextButton"]')?.click(),
        );
      });
    } else {
      await page.locator('button[class*="custom-caption__PreviousButton"]').click({ force: true }).catch(async () => {
        await page.evaluate(() =>
          document.querySelector('button[class*="custom-caption__PreviousButton"]')?.click(),
        );
      });
    }
    await sleep(280);
  }
  throw new Error(`goto ${year}-${month} failed at ${await caption()}`);
}

async function openCal(idx) {
  const btn = page.getByRole('button', { name: /销售日历管理/ }).nth(idx);
  await btn.scrollIntoViewIfNeeded();
  await sleep(300);
  await btn.click();
  await sleep(2000);
  for (let w = 0; w < 20; w++) {
    if (await caption()) break;
    await sleep(200);
  }
  // 选择单个日期
  const multi = page.getByRole('button', { name: /选择单个日期/ });
  if (await multi.count()) {
    await multi.first().click();
    await sleep(500);
  } else {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').includes('选择单个日期'))
        ?.click();
    });
    await sleep(500);
  }
  const cap = await caption();
  if (!cap) throw new Error(`caption=null openCal ${idx}`);
  console.log('  openCal', idx, cap);
  return cap;
}

async function selectDays(start, end) {
  let hit = 0;
  for (let d = start; d <= end; d++) {
    // PlainDayButton by exact day text — element click, no coordinates
    const dayBtn = page.locator('button[class*="custom-day__PlainDayButton"]').filter({
      hasText: new RegExp(`^${d}$`),
    });
    // may match multiple months if visible — pick enabled visible
    const n = await dayBtn.count();
    let clicked = false;
    for (let i = 0; i < n; i++) {
      const dis = await dayBtn.nth(i).isDisabled().catch(() => true);
      if (dis) continue;
      const t = (await dayBtn.nth(i).innerText()).trim().split('\n')[0];
      if (t !== String(d)) continue;
      await dayBtn.nth(i).scrollIntoViewIfNeeded().catch(() => {});
      await dayBtn.nth(i).click({ force: true });
      clicked = true;
      hit++;
      await sleep(40);
      break;
    }
    if (!clicked) {
      // fallback evaluate element click by day text
      const ok = await page.evaluate((day) => {
        const b = Array.from(
          document.querySelectorAll('button[class*="custom-day__PlainDayButton"]'),
        ).find((btn) => (btn.innerText || '').trim().split('\n')[0] === String(day) && !btn.disabled);
        if (!b) return false;
        b.click();
        return true;
      }, d);
      if (ok) hit++;
    }
  }
  console.log('  days hit', hit, `${start}-${end}`);
  return hit;
}

async function fillPrice(price) {
  const loc = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]').last();
  await loc.scrollIntoViewIfNeeded();
  for (let i = 0; i < 25; i++) {
    if (!(await loc.isDisabled().catch(() => true))) break;
    await sleep(100);
  }
  if (await loc.isDisabled().catch(() => true)) throw new Error('price disabled');
  await loc.fill(String(price));
  const v = await loc.inputValue();
  console.log('  price', v);
  return v;
}

async function complete() {
  await page.getByRole('button', { name: /^完成$/ }).click().catch(async () => {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '完成' && !b.disabled)
        ?.click();
    });
  });
  await sleep(1800);
}

async function verifyDays(wantDays, price) {
  // sample first mid last from open calendar
  return page.evaluate(
    ({ wantDays, price }) => {
      const cells = Array.from(
        document.querySelectorAll('[class*="custom-day___StyledContainer"], td.rdp-cell'),
      );
      const found = [];
      for (const day of wantDays) {
        const cell = cells.find((c) => {
          const t = (c.innerText || '').trim();
          return t.startsWith(String(day) + '\n') || t === `${day}\n${price}`;
        });
        if (cell) {
          const parts = (cell.innerText || '').trim().split('\n');
          found.push({ day, text: parts.join('\\n'), price: parts[1] });
        } else found.push({ day, text: null });
      }
      return found;
    },
    { wantDays, price },
  );
}

const n = await listClean();
console.log('listClean cals=', n);

const results = [];
for (let oi = 0; oi < OPTS.length; oi++) {
  const opt = OPTS[oi];
  for (const seg of SEGS) {
    const price = opt[seg.key];
    console.log(`\n【将要】${opt.label} ${seg.key} ${seg.year}-${seg.month} ${seg.start}-${seg.end} 价=${price}`);
    await listClean();
    await openCal(oi);
    await gotoMonth(seg.year, seg.month);
    const hit = await selectDays(seg.start, seg.end);
    if (hit < (seg.end - seg.start + 1) * 0.5) {
      console.log('  WARN low hit', hit);
    }
    await fillPrice(price);
    await complete();

    // verify reopen
    await listClean();
    await openCal(oi);
    await gotoMonth(seg.year, seg.month);
    const mid = Math.floor((seg.start + seg.end) / 2);
    const v = await verifyDays([seg.start, mid, seg.end], price);
    // §51/§52: UI may show "1,017" — compare with normPrice
    const ok = v.every((x) => normPrice(x.price) === normPrice(price));
    console.log('  验收', ok ? 'PASS' : 'FAIL', v);
    results.push({ oi, seg: seg.key, price, hit, ok, v });
    // close calendar without dirty leave if possible
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '关闭' || (b.innerText || '').trim() === '完成')
        ?.click();
    });
    await sleep(500);
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '消除')
        ?.click(),
    );
  }
}

await listClean();
await page.getByRole('button', { name: /^临时保存$/ }).first().click().catch(() => {});
await sleep(1500);
console.log('DONE holidays', JSON.stringify(results, null, 2));
const allOk = results.every((r) => r.ok);
console.log(allOk ? 'ALL PASS' : 'SOME FAIL', 'NEVER 提交审核');
process.exit(allOk ? 0 : 2);
