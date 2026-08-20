import { connectNolPage } from './lib/cdp-session.mjs';
import { auditOptions, fixOptionPrice, fixReservation, dismiss, RESV_HUB, optionUrl } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = '09714a30-dc94-4378-a238-ed8a37a5d234';
const { page } = await connectNolPage({
  selfHint: 'fix-tks-price',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

console.log('【将要】东京站 价格 7=784 10=1176 + 预约补 Kakao');
let opts = await auditOptions(page, ID);
for (const o of opts) console.log('before', o.i, o.price, o.timesOk, o.name.slice(0, 45));

// fix each option price to target
const targets = opts.map((o) => (/10인승/.test(o.name) ? 1176 : 784));
for (let i = 0; i < opts.length; i++) {
  const exp = targets[i];
  if (String(opts[i].price) === String(exp)) {
    console.log('skip price ok', i, exp);
    continue;
  }
  console.log('【将要】改价', i, opts[i].price, '→', exp);
  try {
    const r = await fixOptionPrice(page, ID, i, exp);
    console.log('【结果】', r);
  } catch (e) {
    console.log('ERR price', e.message);
  }
}

opts = await auditOptions(page, ID);
for (const o of opts) console.log('after', o.i, o.price, o.timesOk);

// ensure hub resv including KAKAO
const sum = await fixReservation(page, ID, RESV_HUB);
console.log('resv', sum);

// search tokyo port / osaka station in list with scroll
await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
});
await sleep(2500);
// try filter unpublished
await page.getByText(/未发布|未發布|UNPUBLISHED|草稿/).first().click({ timeout: 2000 }).catch(() => {});
await sleep(1000);
// search 항 or 도쿄
const search = page.locator('input').filter({ has: page.locator('xpath=..') }).first();
for (const q of ['도쿄항', '东京港', '오사카역', '大阪站', '요코하마 시내']) {
  const box = page.locator('input[placeholder*="搜索"], input[placeholder*="搜"], input[placeholder*="查找"]').first();
  if (await box.count()) {
    await box.fill(q);
    await box.press('Enter').catch(() => {});
    await sleep(1500);
  }
  const hit = await page.evaluate((qq) => {
    const t = document.body.innerText || '';
    return { q: qq, has: t.includes(qq), sample: t.includes(qq) ? t.slice(t.indexOf(qq) - 20, t.indexOf(qq) + 80) : '' };
  }, q);
  console.log('search', hit);
}

console.log('未点提交审核');
process.exit(0);
