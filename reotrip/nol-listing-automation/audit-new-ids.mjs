import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl } from './lib/japan-audit-fix.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const JOBS = [
  { id: '462b9cef-c378-45d7-afd5-9b44f364b378', label: '东京迪士尼', e7: 627, e10: 1020 },
  { id: '4b49b221-a013-4420-9def-ffddfc09a310', label: '大阪USJ', e7: 627, e10: 1020 },
  { id: 'ef40fdfb-63bd-4b71-a711-c564df5cc49f', label: '横滨港-新横滨', e7: 1053, e10: 1389 },
  { id: '2649bc67-21d8-47e6-b359-274b9ed2daff', label: '东京-长野', e7: 5266, e10: 5602 },
  { id: '0b27766d-3dd0-4231-b373-ae43b36764b3', label: 'CTS-登别', e7: 3092, e10: 3431 },
  { id: 'c59fa273-????', label: 'CTS-富良野', e7: 3431, e10: 3769 }, // fill real
  { id: '2e97dd5e-d7a7-480f-8f31-87cde2cd79a4', label: 'NGO(待确认名)', e7: 1264, e10: 2054 },
  { id: 'ed8ff28b-4a7d-4cba-b904-995d7177cf70', label: '大阪港相关id', e7: 784, e10: 1176 },
];

// load furano id from list
import { readFileSync } from 'fs';
const list = JSON.parse(readFileSync(new URL('./japan-list-ids.json', import.meta.url)));
const furano = list.find((x) => /후라노|富良野|c59fa273/.test(JSON.stringify(x)));
if (furano) {
  JOBS[5].id = furano.id;
  JOBS[5].label = 'CTS-富良野';
}

function parsePrices(body) {
  const re = /(?:^|\n)(\d{1,2})\n([\d,]+)(?=\n|$)/g;
  const prices = [];
  let m;
  while ((m = re.exec(body)) && prices.length < 40) prices.push(m[2].replace(/,/g, ''));
  return [...new Set(prices)];
}

const { page } = await connectNolPage({
  selfHint: 'audit-new',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

for (const j of JOBS) {
  if (!j.id || j.id.includes('?')) continue;
  console.log(`\n======== ${j.label} ${j.id.slice(0, 8)} ========`);
  await page.goto(optionUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 50000 });
  await sleep(2000);
  await dismiss(page);
  const title = await page.evaluate(() => {
    const t = document.body.innerText || '';
    const m = t.match(/[\uac00-\ud7af].{10,60}단독 차량/);
    return m?.[0] || t.slice(0, 80);
  });
  console.log('【读回】产品', title);
  const n = await page.getByRole('button', { name: /修改选项/ }).count();
  let okP = true,
    okT = true;
  for (let i = 0; i < Math.min(n, 4); i++) {
    await page.goto(optionUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(1400);
    await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
    await sleep(1800);
    for (let w = 0; w < 20; w++) {
      if (await page.locator('#name').inputValue().catch(() => '')) break;
      await sleep(120);
    }
    const name = await page.locator('#name').inputValue();
    const body = await page.evaluate(() => document.body.innerText || '');
    const prices = parsePrices(body);
    const idx = body.indexOf('时间段') >= 0 ? body.indexOf('时间段') : body.indexOf('時間段');
    const times = (idx >= 0 ? body.slice(idx, idx + 400) : '').match(/\d{2}:\d{2}/g) || [];
    const exp = /10인승/.test(name) ? String(j.e10) : String(j.e7);
    const pOk = prices.includes(exp);
    const tOk = times.length >= 28 && times[0] === '07:00' && times[times.length - 1] === '21:30';
    if (!pOk) okP = false;
    if (!tOk) okT = false;
    console.log(`  opt${i} P=${prices.join('|')} exp=${exp} ${pOk ? 'P✓' : 'P✗'} T=${times.length}/${times[0]}-${times[times.length - 1]} ${tOk ? 'T✓' : 'T✗'}`);
  }
  console.log(okP && okT ? `【结果】PASS ${j.label}` : `【结果】FAIL ${j.label} p=${okP} t=${okT}`);
}
console.log('未点提交审核');
process.exit(0);
