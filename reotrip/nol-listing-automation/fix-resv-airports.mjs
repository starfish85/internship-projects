import { connectNolPage } from './lib/cdp-session.mjs';
import { fixReservation, dismiss, RESV_AIRPORT, RESV_HUB, auditOptions, regsUrl } from './lib/japan-audit-fix.mjs';
import fs from 'fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { page } = await connectNolPage({
  selfHint: 'fix-resv',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const items = [
  { key: 'hnd', id: 'b6e560d4-d4d3-4726-b08c-f5623499895a', resv: 'airport' },
  { key: 'nrt', id: '60557c54-6c11-4b0e-9e04-df85c0d3e78b', resv: 'airport' },
  { key: 'kix', id: '7c220325-8783-4f58-a1dc-5fbfc4137a5e', resv: 'airport' },
  { key: 'itm', id: '88b3861b-e907-487b-bacb-5abcfc1a7988', resv: 'airport' },
  { key: 'tks', id: '09714a30-dc94-4378-a238-ed8a37a5d234', resv: 'hub' },
];

const out = [];
for (const it of items) {
  console.log('\n====', it.key);
  try {
    const ids = it.resv === 'airport' ? RESV_AIRPORT : RESV_HUB;
    const sum = await fixReservation(page, it.id, ids);
    await dismiss(page);
    await page.goto(regsUrl(it.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);
    const body = await page.evaluate(() => document.body?.innerText || '');
    const resvOk = !/您必須輸入代表|须填写「代表预约/.test(body);
    // summary non-empty: look for selected fields text
    const hasSummary = /电话|手機|手机|邮箱|郵件|酒店|航班|인원|픽업|CELL|EMAIL|HOTEL|FLIGHT/i.test(body);
    console.log('【结果】', { resvOk, hasSummary, emptyHint: sum.emptyHint, hasPhone: sum.hasPhone, hasFlight: sum.hasFlight });
    out.push({ key: it.key, resvOk, hasSummary, sum });
  } catch (e) {
    console.log('ERR', e.message);
    out.push({ key: it.key, err: String(e.message).slice(0, 200) });
  }
}

// recheck tks times+price
console.log('\n==== tks audit ====');
try {
  const opts = await auditOptions(page, '09714a30-dc94-4378-a238-ed8a37a5d234');
  for (const o of opts) console.log(o.i, 'p='+o.price, 'tOk='+o.timesOk, o.times);
  out.push({ key: 'tks_audit', opts: opts.map(o=>({i:o.i,price:o.price,timesOk:o.timesOk,t:o.times})) });
} catch(e) { console.log('tks audit err', e.message); }

// search list for tokyo port / yokohama / osaka station
console.log('\n==== list search ====');
await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(3000);
const found = await page.evaluate(() => {
  const t = document.body?.innerText || '';
  const keys = ['도쿄항', '요코하마항', '오사카역', '东京港', '横滨', '大阪站', '도쿄역', '하네다', '나리타'];
  const hits = {};
  for (const k of keys) hits[k] = t.includes(k);
  // card snippets
  const cards = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer4"]'))
    .map(e => (e.innerText||'').replace(/\s+/g,' ').trim().slice(0,100))
    .filter(s => /도쿄|오사카|요코|항|역|공항/.test(s))
    .slice(0, 40);
  return { hits, cards, len: t.length };
});
console.log(JSON.stringify(found, null, 2));
out.push({ listSearch: found });
fs.writeFileSync('japan-resv-results.json', JSON.stringify(out, null, 2));
console.log('未点提交审核');
process.exit(0);
