import { connectNolPage } from './lib/cdp-session.mjs';
import {
  auditOptions,
  fixOptionPrice,
  fixOptionTimes,
  fixReservation,
  dismiss,
  RESV_HUB,
} from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { page } = await connectNolPage({
  selfHint: 'fix-remaining',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

async function openByText(re) {
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(2500);
  const box = page.locator('input[placeholder*="搜索"], input[placeholder*="搜"], input[placeholder*="查找"]').first();
  if (await box.count()) {
    // extract keyword from re string
    const kw = re.source.replace(/[\\^$.*+?()[\]{}|]/g, ' ').trim().split(/\s+/)[0] || '';
    if (kw) {
      await box.fill(kw);
      await box.press('Enter').catch(() => {});
      await sleep(1500);
    }
  }
  const ok = await page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    const cards = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer4"]'));
    const c = cards.find((e) => re.test(e.innerText || ''));
    if (!c) return false;
    c.click();
    return true;
  }, re.source);
  await sleep(2500);
  const m = page.url().match(/id=([0-9a-f-]{36})/i);
  return { ok, id: m?.[1] || null, url: page.url() };
}

const jobs = [
  {
    key: 'tks',
    id: '09714a30-dc94-4378-a238-ed8a37a5d234',
    prices: { 7: 784, 10: 1176 },
    resv: 'hub',
    forceTimes: false,
  },
];

// resolve
for (const [key, re, prices] of [
  ['tkp_hotel', /도쿄 시내 호텔\s*↔\s*도쿄항/, { 7: 784, 10: 1176 }],
  ['osk', /오사카 시내 호텔\s*↔\s*오사카역(?!\/)/, { 7: 784, 10: 1176 }],
  ['yhp', /요코하마 시내 호텔\s*↔\s*요코하마항/, { 7: 1053, 10: 1389 }], // excel 横滨市区 is different; 东京市区-横滨 is 112/134 if exists
]) {
  console.log('\n【将要】打开', key);
  const r = await openByText(re);
  console.log('【结果】', r);
  if (r.id) jobs.push({ key, id: r.id, prices, resv: 'hub', forceTimes: key === 'osk' });
}

const results = [];
for (const job of jobs) {
  console.log(`\n========== ${job.key} ${job.id.slice(0, 8)} ==========`);
  try {
    let opts = await auditOptions(page, job.id);
    for (const o of opts) {
      const exp = /10인승/.test(o.name) ? job.prices[10] : job.prices[7];
      console.log(`  opt${o.i} p=${o.price} exp=${exp} tOk=${o.timesOk} ${o.name.slice(0, 40)}`);
    }
    // prices
    for (const o of opts) {
      const exp = /10인승/.test(o.name) ? job.prices[10] : job.prices[7];
      if (String(o.price) === String(exp)) continue;
      console.log(`【将要】改价 ${o.i} ${o.price}→${exp}`);
      const rr = await fixOptionPrice(page, job.id, o.i, exp);
      console.log('【结果】', rr);
    }
    // times
    opts = await auditOptions(page, job.id);
    for (const o of opts) {
      if (o.timesOk && !job.forceTimes) continue;
      if (!o.timesOk || job.forceTimes) {
        console.log(`【将要】时段 ${o.i}`);
        try {
          await fixOptionTimes(page, job.id, o.i);
        } catch (e) {
          console.log('times ERR', e.message?.slice(0, 120));
        }
      }
    }
    // resv
    console.log('【将要】预约 hub');
    const sum = await fixReservation(page, job.id, RESV_HUB);
    opts = await auditOptions(page, job.id);
    results.push({
      key: job.key,
      id: job.id,
      sum,
      opts: opts.map((o) => ({
        i: o.i,
        price: o.price,
        exp: /10인승/.test(o.name) ? job.prices[10] : job.prices[7],
        timesOk: o.timesOk,
        name: o.name.slice(0, 40),
      })),
    });
  } catch (e) {
    console.log('ERR', e.message);
    results.push({ key: job.key, err: String(e.message).slice(0, 200) });
  }
}

console.log('\nFINAL', JSON.stringify(results, null, 2));
console.log('未点提交审核');
process.exit(0);
