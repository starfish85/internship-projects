/**
 * Continue Excel 待调整:
 * 1) 东京站 10座 1176
 * 2) 东京港 预约+价+时段
 * 3) 大阪站 时段+价
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import {
  dismiss,
  optionUrl,
  regsUrl,
  fixOptionTimes,
  fixReservation,
  auditOptions,
  RESV_HUB,
  JAPAN_TIMES,
} from './lib/japan-audit-fix.mjs';
import { setTimesChinaOnOption } from './lib/set-times-china.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { page } = await connectNolPage({
  selfHint: 'continue-excel',
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
        return { el: b, t: (b.innerText || '').trim(), d: b.disabled, w: r.width, y: r.y };
      })
      .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d && x.w > 40)
      .sort((a, b) => a.w - b.w || b.y - a.y);
    btns[0]?.el.click();
  });
  await sleep(2200);
  for (let i = 0; i < 15; i++) {
    const en = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (x) => /下一个|下個/.test((x.innerText || '').trim()) && !x.disabled && x.getBoundingClientRect().width > 100,
      );
      return !!b;
    });
    if (en) break;
    await sleep(400);
  }
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
  await sleep(2500);
  await dismiss(page);
}

async function openOption(id, i) {
  await dismiss(page);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await dismiss(page);
  await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(i).click();
  await sleep(2200);
  for (let w = 0; w < 30; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await sleep(200);
  }
  return page.locator('#name').inputValue();
}

async function readCalPrices() {
  await page.evaluate(() => window.scrollTo(0, 2200));
  await sleep(300);
  await page.getByText(/销售日历|期间选择|期間選擇|銷售日曆/).first().scrollIntoViewIfNeeded().catch(() => {});
  await sleep(300);
  return page.evaluate(() => {
    const body = document.body.innerText || '';
    const prices = [];
    const re = /(?:^|\n)(\d{1,2})\n(\d{2,5})(?=\n|$)/g;
    let m;
    while ((m = re.exec(body)) && prices.length < 60) prices.push(m[2]);
    const input = Array.from(document.querySelectorAll('input')).find(
      (i) => (i.placeholder || '').includes('价格') || (i.placeholder || '').includes('價格'),
    );
    return {
      uniq: [...new Set(prices)],
      sample: prices.slice(0, 6),
      inputVal: input?.value || '',
      inputDis: input?.disabled ?? null,
      name: document.querySelector('#name')?.value?.slice(0, 55) || '',
    };
  });
}

/** Robust price set matching create-one */
async function setPriceOnOpenForm(price) {
  const p = String(price);
  // ONE_YEAR
  await page.locator('input[value=ONE_YEAR]').click({ force: true }).catch(async () => {
    await page.getByText('1年', { exact: true }).click().catch(() => {});
  });
  await sleep(1000);
  // enable input if needed - click period again
  const filled = await page.evaluate((val) => {
    const el = Array.from(document.querySelectorAll('input')).find(
      (i) =>
        ((i.placeholder || '').includes('请输入价格') || (i.placeholder || '').includes('請輸入價格')) &&
        !i.disabled,
    );
    if (!el) {
      // try any price input even disabled: force enable path
      const any = Array.from(document.querySelectorAll('input')).find(
        (i) => (i.placeholder || '').includes('价格') || (i.placeholder || '').includes('價格'),
      );
      if (!any) return { ok: false, reason: 'no input' };
      any.disabled = false;
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(any, val);
      any.dispatchEvent(new Event('input', { bubbles: true }));
      any.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: any.value, forced: true };
    }
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: el.value, forced: false };
  }, p);
  // also playwright fill
  const ph = page.getByPlaceholder(/请输入价格|請輸入價格/);
  if (await ph.count()) {
    const dis = await ph.isDisabled().catch(() => true);
    if (!dis) {
      await ph.fill('');
      await ph.fill(p);
    }
  }
  await sleep(400);
  const after = await readCalPrices();
  return { filled, after };
}

async function findProductId(keyword, nameRegex) {
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(2500);
  const box = page.locator('input[placeholder*="搜索"], input[placeholder*="搜"], input[placeholder*="查找"]').first();
  if (await box.count()) {
    await box.fill(keyword);
    await box.press('Enter').catch(() => {});
    await sleep(2000);
  }
  // click 修复 on matching card if needed
  const clicked = await page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    const cards = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer4"]'));
    const card = cards.find((e) => re.test((e.innerText || '').replace(/\s+/g, ' ')));
    if (!card) return { ok: false, n: cards.length };
    // prefer click 修复 button inside card
    const fix = Array.from(card.querySelectorAll('button,a,span,div')).find((e) =>
      /修复|修復|修改/.test((e.innerText || '').trim()),
    );
    (fix || card).click();
    return { ok: true, text: (card.innerText || '').replace(/\s+/g, ' ').slice(0, 80) };
  }, nameRegex);
  console.log('  click card', clicked);
  await sleep(3000);
  // if still on list, try card click again center
  let m = page.url().match(/id=([0-9a-f-]{36})/i);
  if (!m) {
    await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const cards = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer4"]'));
      const card = cards.find((e) => re.test(e.innerText || ''));
      if (card) {
        const r = card.getBoundingClientRect();
        // click middle of card
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const el = document.elementFromPoint(x, y);
        el?.click();
        card.click();
      }
    }, nameRegex);
    await sleep(3000);
    m = page.url().match(/id=([0-9a-f-]{36})/i);
  }
  return m ? m[1] : null;
}

async function fixProductPrices(id, price7, price10, label) {
  console.log(`\n【将要】①改价 ${label} 7=${price7} 10=${price10}`);
  const mods = await page.evaluate(async () => 0);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  const n = await page.getByRole('button', { name: /修改选项/ }).count();
  console.log('  options', n);
  const results = [];
  for (let i = 0; i < n; i++) {
    const name = await openOption(id, i);
    const target = /10인승/.test(name) ? price10 : price7;
    console.log(`  opt${i}`, name.slice(0, 45), '→', target);
    let cal = await readCalPrices();
    console.log('  before cal', cal);
    if (cal.uniq.includes(String(target)) && cal.uniq.length === 1) {
      console.log('  already OK');
      await tempSaveNext();
      results.push({ i, status: 'already', target, cal });
      continue;
    }
    const setr = await setPriceOnOpenForm(target);
    console.log('  set', setr.filled, 'calAfter', setr.after);
    await tempSaveNext();
    // re-open verify
    await openOption(id, i);
    cal = await readCalPrices();
    console.log('  verify', cal);
    const ok = cal.uniq.includes(String(target));
    results.push({ i, status: ok ? 'PASS' : 'FAIL', target, cal });
    await tempSaveNext();
  }
  return results;
}

async function fixProductTimes(id, label) {
  console.log(`\n【将要】②时段 ${label}`);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  const n = await page.getByRole('button', { name: /修改选项/ }).count();
  const out = [];
  for (let i = 0; i < n; i++) {
    // audit first via open
    await openOption(id, i);
    const tv = await page.evaluate(() => {
      const body = document.body.innerText || '';
      const idx = body.indexOf('时间段');
      const slice = idx >= 0 ? body.slice(idx, idx + 400) : '';
      const times = (slice.match(/\d{2}:\d{2}/g) || []);
      return { count: times.length, first: times[0], last: times[times.length - 1] };
    });
    // use readTimesCompact if available - import
    const ok = tv.count >= 28 && tv.first === '07:00' && (tv.last === '21:30' || tv.last === '21:00');
    console.log(`  opt${i} times`, tv, ok ? 'OK' : 'NEED');
    await page.keyboard.press('Escape').catch(() => {});
    await dismiss(page);
    if (ok && tv.count === 30 && tv.last === '21:30') {
      out.push({ i, status: 'already', tv });
      continue;
    }
    try {
      const r = await setTimesChinaOnOption(page, {
        listUrl: optionUrl(id),
        optionIndex: i,
        timesOpts: JAPAN_TIMES,
      });
      console.log('  fixed', r.tv);
      out.push({ i, status: 'PASS', tv: r.tv });
    } catch (e) {
      console.log('  FAIL', e.message?.slice(0, 100));
      out.push({ i, status: 'FAIL', err: String(e.message).slice(0, 100) });
    }
  }
  return out;
}

// ========== WORK ==========
const report = [];

// 1) Tokyo station 10-seat prices
{
  const ID = '09714a30-dc94-4378-a238-ed8a37a5d234';
  console.log('\n======== 东京站 价格 ========');
  const r = await fixProductPrices(ID, 784, 1176, '东京站');
  report.push({ key: 'tks_price', r });
  console.log('【将要】东京站 预约 hub');
  const sum = await fixReservation(page, ID, RESV_HUB);
  report.push({ key: 'tks_resv', sum });
}

// 2) Tokyo port hotel
{
  console.log('\n======== 东京港 resolve ========');
  const id = await findProductId('도쿄항', '도쿄 시내 호텔.*도쿄항');
  console.log('【结果】东京港 id', id);
  if (id) {
    report.push({ key: 'tkp_id', id });
    const pr = await fixProductPrices(id, 784, 1176, '东京港');
    report.push({ key: 'tkp_price', pr });
    const tr = await fixProductTimes(id, '东京港');
    report.push({ key: 'tkp_times', tr });
    const sum = await fixReservation(page, id, RESV_HUB);
    report.push({ key: 'tkp_resv', sum });
  }
}

// 3) Osaka station
{
  console.log('\n======== 大阪站 resolve ========');
  const id = await findProductId('오사카역', '오사카 시내 호텔.*오사카역');
  console.log('【结果】大阪站 id', id);
  if (id) {
    report.push({ key: 'osk_id', id });
    const pr = await fixProductPrices(id, 784, 1176, '大阪站');
    report.push({ key: 'osk_price', pr });
    const tr = await fixProductTimes(id, '大阪站');
    report.push({ key: 'osk_times', tr });
    const sum = await fixReservation(page, id, RESV_HUB);
    report.push({ key: 'osk_resv', sum });
  }
}

console.log('\n========== REPORT ==========');
console.log(JSON.stringify(report, null, 2));
console.log('未点提交审核');
process.exit(0);
