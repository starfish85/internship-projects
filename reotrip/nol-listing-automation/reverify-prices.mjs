import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { page } = await connectNolPage({
  selfHint: 'reverify',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

function parsePrices(body) {
  // day + price with optional commas: 12\n1,176 or 12\n784
  const re = /(?:^|\n)(\d{1,2})\n([\d,]+)(?=\n|$)/g;
  const prices = [];
  let m;
  while ((m = re.exec(body)) && prices.length < 80) {
    const p = m[2].replace(/,/g, '');
    if (p.length >= 2 && p.length <= 6) prices.push(p);
  }
  return [...new Set(prices)];
}

async function audit(id, label, expect7, expect10) {
  console.log(`\n======== ${label} ${id.slice(0, 8)} ========`);
  await dismiss(page);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const n = await page.getByRole('button', { name: /修改选项/ }).count();
  const out = [];
  for (let i = 0; i < n; i++) {
    await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1800);
    await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
    await sleep(2200);
    for (let w = 0; w < 25; w++) {
      if (await page.locator('#name').inputValue().catch(() => '')) break;
      await sleep(200);
    }
    const name = await page.locator('#name').inputValue();
    await page.evaluate(() => window.scrollTo(0, 2200));
    await sleep(300);
    const body = await page.evaluate(() => document.body.innerText || '');
    const prices = parsePrices(body);
    // times
    const idx = body.indexOf('时间段');
    const slice = idx >= 0 ? body.slice(idx, idx + 500) : '';
    const times = slice.match(/\d{2}:\d{2}/g) || [];
    const timesOk = times.length >= 28 && times[0] === '07:00' && times[times.length - 1] === '21:30';
    const exp = /10인승/.test(name) ? String(expect10) : String(expect7);
    const priceOk = prices.includes(exp);
    console.log(
      `  opt${i} price=${prices.join('|') || 'EMPTY'} exp=${exp} ${priceOk ? 'P✓' : 'P✗'} times=${times.length}/${times[0]}-${times[times.length - 1]} ${timesOk ? 'T✓' : 'T✗'} | ${name.slice(0, 42)}`,
    );
    out.push({ i, name: name.slice(0, 50), prices, exp, priceOk, timesOk, tfirst: times[0], tlast: times[times.length - 1], tcount: times.length });
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (x) => /下一个|下個/.test((x.innerText || '').trim()) && !x.disabled,
      );
      b?.click();
    });
    await sleep(1200);
    await dismiss(page);
  }
  return out;
}

const products = [
  { id: '09714a30-dc94-4378-a238-ed8a37a5d234', label: '东京站', e7: 784, e10: 1176 },
  { id: '0de15895-41de-48f8-8653-5c47a947c301', label: '东京港', e7: 784, e10: 1176 },
  { id: 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c', label: '大阪站', e7: 784, e10: 1176 },
  { id: '9f7d6122-c413-42be-89a8-d08ec789d32c', label: '东京-横滨港', e7: 112, e10: 134 },
  { id: 'b6e560d4-d4d3-4726-b08c-f5623499895a', label: 'HND', e7: 70, e10: 105 },
  { id: '60557c54-6c11-4b0e-9e04-df85c0d3e78b', label: 'NRT', e7: 112, e10: 175 },
  { id: '7c220325-8783-4f58-a1dc-5fbfc4137a5e', label: 'KIX', e7: 99, e10: 133 },
  { id: '88b3861b-e907-487b-bacb-5abcfc1a7988', label: 'ITM', e7: 77, e10: 105 },
];

const all = [];
for (const p of products) {
  const r = await audit(p.id, p.label, p.e7, p.e10);
  const pricePass = r.every((x) => x.priceOk);
  const timesPass = r.every((x) => x.timesOk);
  console.log(`【结果】${p.label} price=${pricePass ? 'PASS' : 'FAIL'} times=${timesPass ? 'PASS' : 'FAIL'}`);
  all.push({ label: p.label, id: p.id, pricePass, timesPass, r });
}

// resv quick check
console.log('\n======== 预约抽检 ========');
for (const p of [
  { id: '0de15895-41de-48f8-8653-5c47a947c301', label: '东京港' },
  { id: 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c', label: '大阪站' },
  { id: 'b6e560d4-d4d3-4726-b08c-f5623499895a', label: 'HND' },
]) {
  await page.goto(
    `https://tour.triple.partners/product-management/registration/regulations?id=${p.id}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded', timeout: 60000 },
  );
  await sleep(2000);
  const body = await page.evaluate(() => document.body.innerText || '');
  const empty = /您必須輸入代表|须填写「代表预约/.test(body);
  const hasPhone = /电话号码\*/.test(body);
  console.log(`  ${p.label} resvEmpty=${empty} hasPhone=${hasPhone}`);
}

console.log('\nSUMMARY');
for (const a of all) {
  console.log(`${a.label}: price=${a.pricePass} times=${a.timesPass}`);
}
console.log('未点提交审核');
process.exit(0);
