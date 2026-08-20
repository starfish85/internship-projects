/**
 * Match japan-list-ids / draft-ids to Excel 日本接送产品, audit price + times.
 * usage: node batch-price-times-japan.mjs [--limit N] [--only substring]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl } from './lib/japan-audit-fix.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 999;
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

/** Map Chinese Excel product name → Korean keyword tokens for draft matching */
function cnTokens(cn) {
  const t = [];
  const add = (cond, ...ks) => {
    if (cond) t.push(...ks);
  };
  add(/迪士尼|迪斯尼/.test(cn), '디즈니');
  add(/环球|USJ/.test(cn), '유니버설');
  add(/哈利波特/.test(cn), '해리포터', '워너브라더스');
  add(/晴空塔/.test(cn), '스카이트리');
  add(/羽田|HND/.test(cn), '하네다');
  add(/成田|NRT/.test(cn), '나리타');
  add(/关西|KIX/.test(cn), '간사이');
  add(/伊丹|ITM|大阪国际机场/.test(cn), '이타미');
  add(/新千岁|CTS/.test(cn), '신치토세', 'CTS');
  add(/中部|NGO/.test(cn), '중부', 'NGO');
  add(/横滨港/.test(cn) && !/邮轮|新横滨/.test(cn), '요코하마항');
  add(/横滨邮轮|邮轮港/.test(cn), '크루즈항');
  add(/新横滨/.test(cn), '신요코하마');
  add(/东京港/.test(cn), '도쿄항');
  add(/东京站/.test(cn), '도쿄역');
  add(/大阪站/.test(cn), '오사카역');
  add(/大阪港/.test(cn), '오사카항');
  add(/京都站/.test(cn), '교토역');
  add(/箱根/.test(cn), '하코네');
  add(/神户港/.test(cn), '고베항');
  add(/神户市区|神户酒店/.test(cn), '고베');
  add(/奈良/.test(cn), '나라');
  add(/京都/.test(cn) && !/京都站/.test(cn), '교토');
  add(/大阪市区酒店-京都|大阪.*京都酒店/.test(cn), '오사카 시내 호텔', '교토 시내 호텔');
  add(/铃鹿/.test(cn), '스즈카');
  add(/吉卜力|宫崎骏/.test(cn), '지브리');
  add(/高山/.test(cn), '다카야마');
  add(/名古屋/.test(cn), '나고야');
  add(/札幌/.test(cn), '삿포로');
  add(/二世谷/.test(cn), '니세코');
  add(/留寿都/.test(cn), '루스쓰');
  add(/登别/.test(cn), '노보리베츠');
  add(/洞爷/.test(cn), '도야코');
  add(/小樽/.test(cn), '오타루');
  add(/支笏/.test(cn), '시코쓰코');
  add(/星野/.test(cn), '호시노');
  add(/羊蹄/.test(cn), '요테이');
  add(/富良野/.test(cn), '후라노');
  add(/长野/.test(cn), '나가노');
  add(/乐高|铃鹿赛道/.test(cn), '레고랜드', '스즈카');
  // area anchors
  add(/东京市区酒店/.test(cn) || /东京市区-/.test(cn), '도쿄 시내');
  add(/大阪市区酒店/.test(cn) || /大阪市区-/.test(cn), '오사카 시내');
  add(/京都市区酒店/.test(cn), '교토 시내');
  add(/横滨市区/.test(cn), '요코하마 시내');
  return [...new Set(t)];
}

function loadExcel() {
  const data = JSON.parse(readFileSync(join(__dir, 'japan-excel-all-prices.json'), 'utf8'));
  // round decimal targets to int (calendar usually whole HKD)
  for (const p of data.products) {
    if (p.e7 != null) p.e7 = Math.round(Number(p.e7));
    if (p.e10 != null) p.e10 = Math.round(Number(p.e10));
  }
  return data.products;
}

function loadDrafts() {
  if (existsSync(join(__dir, 'japan-list-ids.json'))) {
    const list = JSON.parse(readFileSync(join(__dir, 'japan-list-ids.json'), 'utf8'));
    const m = new Map();
    for (const x of list) {
      if (!x.id) continue;
      const prev = m.get(x.id);
      if (!prev || (x.name && x.name.length > (prev.name || '').length)) m.set(x.id, x);
    }
    return [...m.values()];
  }
  return [];
}

function matchDraft(excelProd, drafts) {
  const cn = excelProd.name;
  const need = cnTokens(cn);
  const e7 = excelProd.e7;
  const e10 = excelProd.e10;
  // significant chinese fragments
  const cnKey = cn.replace(/[（(].*?[）)]/g, '').replace(/市区酒店|市区-/g, '').slice(0, 12);

  const scored = drafts
    .map((d) => {
      const text = `${d.name || ''} ${d.label || ''}`;
      let score = 0;
      let hits = 0;
      for (const k of need) {
        if (text.includes(k)) {
          hits++;
          score += k.length > 4 ? 4 : 3;
        }
      }
      // Chinese name overlap (excel8 drafts often stored as CN label)
      if (cnKey && text.includes(cnKey.slice(0, 6))) score += 8;
      if (cn && text.includes(cn.slice(0, 8))) score += 10;
      // id-label aliases in work-queue style
      if (/HND|羽田/.test(cn) && /HND|羽田|하네다/.test(text) && /东京|도쿄/.test(text)) score += 6;
      if (/NRT|成田/.test(cn) && /NRT|成田|나리타/.test(text) && /东京|도쿄/.test(text)) score += 6;
      if (/KIX|关西/.test(cn) && /KIX|关西|간사이/.test(text) && /大阪|오사카/.test(text)) score += 6;
      if (/ITM|伊丹/.test(cn) && /ITM|伊丹|이타미/.test(text)) score += 6;
      if (/东京站/.test(cn) && !/羽田|成田|东京港|东京站-/.test(cn) && /东京站|도쿄역/.test(text) && /酒店|시내 호텔/.test(text))
        score += 6;
      if (/大阪站/.test(cn) && /大阪站|오사카역/.test(text)) score += 6;
      if (/横滨港/.test(cn) && /东京市区-横滨|도쿄 시내.*요코하마/.test(text)) score += 8;

      const ratio = need.length ? hits / need.length : 0;
      if (need.length && ratio < 0.5 && score < 10) score = 0;
      // hard reject wrong products
      if (/登别/.test(cn) && /후라노|富良野/.test(text)) score = 0;
      if (/富良野/.test(cn) && /노보리베츠|登别/.test(text)) score = 0;
      if (/东京市区酒店-东京站/.test(cn) && /도쿄역 ↔|东京站-/.test(text) && !/시내 호텔|市区酒店/.test(text)) score -= 8;
      if (/市区酒店-东京港/.test(cn) && /도쿄역 ↔ 도쿄항/.test(text)) score -= 8;
      return { d, score, hits };
    })
    .filter((x) => x.score >= 8)
    .sort((a, b) => b.score - a.score || b.hits - a.hits);

  if (!scored.length) return null;
  return { draft: scored[0].d, score: scored[0].score, e7, e10, tokens: need };
}

function parsePrices(body) {
  const re = /(?:^|\n)(\d{1,2})\n([\d,]+)(?=\n|$)/g;
  const prices = [];
  let m;
  while ((m = re.exec(body)) && prices.length < 80) {
    const p = m[2].replace(/,/g, '');
    if (p.length >= 2 && p.length <= 6) prices.push(p);
  }
  return [...new Set(prices)];
}

function parseTimes(body) {
  const idx = body.indexOf('时间段') >= 0 ? body.indexOf('时间段') : body.indexOf('時間段');
  const slice = idx >= 0 ? body.slice(idx, idx + 500) : '';
  const times = slice.match(/\d{2}:\d{2}/g) || [];
  return {
    count: times.length,
    first: times[0] || '',
    last: times[times.length - 1] || '',
    ok: times.length >= 28 && times[0] === '07:00' && times[times.length - 1] === '21:30',
  };
}

async function auditDraft(page, { id, name, e7, e10, excelName }) {
  await dismiss(page);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
  await sleep(2000);
  await dismiss(page);
  const body0 = await page.evaluate(() => (document.body.innerText || '').slice(0, 80));
  if (/找不到页面|아이코/.test(body0)) return { dead: true };

  const n = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
  const opts = [];
  for (let i = 0; i < Math.min(n, 6); i++) {
    await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(1500);
    await dismiss(page);
    await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(i).click();
    await sleep(2000);
    for (let w = 0; w < 20; w++) {
      if (await page.locator('#name').inputValue().catch(() => '')) break;
      await sleep(150);
    }
    const oname = await page.locator('#name').inputValue().catch(() => '');
    const body = await page.evaluate(() => document.body.innerText || '');
    const prices = parsePrices(body);
    const times = parseTimes(body);
    const expNum = /10인승/.test(oname) ? e10 : e7;
    const exp = expNum != null ? String(Math.round(Number(expNum))) : null;
    const priceOk =
      exp == null ? null : prices.some((p) => String(p) === exp || Math.abs(Number(p) - Number(exp)) < 1);
    opts.push({
      i,
      name: oname.slice(0, 50),
      prices: prices.slice(0, 4),
      exp,
      priceOk,
      timesOk: times.ok,
      tcount: times.count,
      tfirst: times.first,
      tlast: times.last,
    });
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(150);
    await page.getByText(/^消除$/).first().click({ timeout: 300 }).catch(() => {});
  }

  const priceOk = opts.every((o) => o.priceOk !== false);
  const timesOk = opts.every((o) => o.timesOk);
  const pass = priceOk && timesOk && n > 0;
  return { id, name, excelName, e7, e10, optsN: n, opts, priceOk, timesOk, pass };
}

// build jobs from excel × drafts
const excel = loadExcel();
let drafts = loadDrafts();
// also merge batch-scan labels as name
if (existsSync(join(__dir, 'batch-scan-japan-results.json'))) {
  const scan = JSON.parse(readFileSync(join(__dir, 'batch-scan-japan-results.json'), 'utf8'));
  for (const s of scan) {
    if (!drafts.find((d) => d.id === s.id)) drafts.push({ id: s.id, name: s.label });
    else {
      const d = drafts.find((x) => x.id === s.id);
      if (s.label && (!d.name || d.name.length < 10)) d.name = s.label;
    }
  }
}

// re-seed clean from draft ids if names poor
if (existsSync(join(__dir, 'japan-list-ids.json'))) {
  // ok
}

const jobs = [];
const unmatchedExcel = [];
const usedDrafts = new Set();

for (const p of excel) {
  if (!p.e7 && !p.e10 && !(p.targets && p.targets.length)) {
    // still try match for later
  }
  const m = matchDraft(p, drafts);
  if (!m) {
    unmatchedExcel.push(p.name);
    continue;
  }
  if (usedDrafts.has(m.draft.id)) {
    // allow secondary only if different excel - skip duplicate draft reuse for same id
    continue;
  }
  usedDrafts.add(m.draft.id);
  jobs.push({
    id: m.draft.id,
    name: m.draft.name,
    excelName: p.name,
    e7: p.e7,
    e10: p.e10,
    score: m.score,
  });
}

// also audit known drafts not in excel match (price only times)
const orphanDrafts = drafts.filter((d) => d.id && !usedDrafts.has(d.id));

let work = jobs;
if (only) work = work.filter((j) => (j.excelName + j.name).includes(only));
work = work.slice(0, LIMIT);

console.log('【读回】Excel产品', excel.length, '匹配草稿', jobs.length, '本轮验', work.length);
console.log('未匹配Excel', unmatchedExcel.length, unmatchedExcel.slice(0, 20));
console.log('未挂Excel的草稿', orphanDrafts.length);
work.forEach((j, i) => console.log(`  ${i + 1}. ${j.excelName} → ${j.id.slice(0, 8)} e7=${j.e7} e10=${j.e10} | ${String(j.name).slice(0, 40)}`));

const { page } = await connectNolPage({
  selfHint: 'batch-pt-jp',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const results = [];
for (let i = 0; i < work.length; i++) {
  const j = work[i];
  console.log(`\n======== [${i + 1}/${work.length}] ${j.excelName} ========`);
  try {
    const r = await auditDraft(page, j);
    if (r.dead) {
      console.log('【结果】DEAD');
      results.push({ ...j, status: 'DEAD' });
      continue;
    }
    for (const o of r.opts) {
      console.log(
        `  opt${o.i} P=${(o.prices || []).join('|') || '∅'} exp=${o.exp} ${o.priceOk === true ? 'P✓' : o.priceOk === false ? 'P✗' : 'P?'} T=${o.tcount}/${o.tfirst}-${o.tlast} ${o.timesOk ? 'T✓' : 'T✗'}`,
      );
    }
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(`【结果】${status} price=${r.priceOk} times=${r.timesOk} opts=${r.optsN}`);
    results.push({ ...j, ...r, status });
  } catch (e) {
    console.log('ERR', e.message?.slice(0, 120));
    results.push({ ...j, status: 'ERR', err: String(e.message).slice(0, 150) });
  }
  if ((i + 1) % 3 === 0) {
    writeFileSync(join(__dir, 'batch-price-times-results.json'), JSON.stringify({ results, unmatchedExcel, orphanDrafts: orphanDrafts.map((d) => d.id) }, null, 2));
  }
}

writeFileSync(
  join(__dir, 'batch-price-times-results.json'),
  JSON.stringify({ results, unmatchedExcel, orphanDrafts: orphanDrafts.map((d) => ({ id: d.id, name: d.name })) }, null, 2),
);

const pass = results.filter((r) => r.status === 'PASS');
const fail = results.filter((r) => r.status === 'FAIL');
console.log('\n======== SUMMARY ========');
console.log(`pass=${pass.length} fail=${fail.length} err=${results.filter((r) => r.status === 'ERR').length}`);
if (fail.length) {
  console.log('FAIL:');
  fail.forEach((r) => console.log(`  - ${r.excelName} ${r.id.slice(0, 8)} price=${r.priceOk} times=${r.timesOk}`));
}
console.log('未点提交审核');
process.exit(fail.length ? 2 : 0);
