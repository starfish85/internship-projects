/**
 * Full READ-ONLY audit of Excel 日本接送产品 (N independent products).
 * Checks (nol接送产品修改部分.md + skill §57):
 *  FAQ mid-stop | SPEC_CANCEL | times 07:00–21:30×30 | price e7/e10 |
 *  Korean price-type | option count | reservation | route copy flags
 * NO FIXES. Progress → japan-full-audit-progress.json / results.json
 *
 * usage: node japan-full-audit.mjs [--from=1] [--to=56] [--resume]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl, regsUrl } from './lib/japan-audit-fix.mjs';
import { SPEC_CANCEL_KO, FAQ_MIDSTOP_Q } from './lib/transfer-audit-copy.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fromArg = Number(process.argv.find((a) => a.startsWith('--from='))?.split('=')[1] || 1);
const toArg = Number(process.argv.find((a) => a.startsWith('--to='))?.split('=')[1] || 56);
const RESUME = process.argv.includes('--resume');
const PROGRESS = join(__dir, 'japan-full-audit-progress.json');
const RESULTS = join(__dir, 'japan-full-audit-results.json');

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

/** Known full UUIDs (excel name → id) */
const ID_MAP = {
  '东京市区酒店-东京迪士尼': '462b9cef-c378-45d7-afd5-9b44f364b378',
  '大阪市区酒店-大阪环球影城': '4b49b221-a013-4420-9def-ffddfc09a310',
  '东京市区酒店-东京站': '09714a30-dc94-4378-a238-ed8a37a5d234',
  '东京市区酒店-东京港': '0de15895-41de-48f8-8653-5c47a947c301',
  '大阪市区酒店-大阪站': 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c',
  '大阪市区酒店-大阪港': 'c9bedab3-78bc-4cca-9c0c-aaff0bda84fd',
  '东京市区-横滨港': '9f7d6122-c413-42be-89a8-d08ec789d32c',
  '东京市区-羽田机场（HND）': 'b6e560d4-d4d3-4726-b08c-f5623499895a',
  '东京市区-成田机场(NRT)': '60557c54-6c11-4b0e-9e04-df85c0d3e78b',
  '大阪市区-关西机场(KIX)': '7c220325-8783-4f58-a1dc-5fbfc4137a5e',
  '大阪市区-大阪国际机场（伊丹机场）(ITM)': '88b3861b-e907-487b-bacb-5abcfc1a7988',
  '东京市区酒店-哈利波特': '9dcef924-c7d9-41ea-8fe0-27a31dfe1064',
  '东京市区酒店-晴空塔': 'c765fa88-d2ff-48f1-a26f-37398bf1d6ec',
  '横滨市区酒店-横滨港': '885023cc-f518-433f-916c-ca2a056df00f',
  '新千岁机场(CTS)-登别': '0b27766d-3dd0-4231-b373-ae43b36764b3',
  '中部国际机场(NGO)-吉卜力公园': '49b0490f-f778-44b9-9a29-eff3d094899a',
  '中部国际机场(NGO)-名古屋市区酒店': '2e97dd5e-d7a7-480f-8f31-87cde2cd79a4',
  '东京站-成田机场': 'f14da9cb-2c98-42c3-b238-86aeef6d9bcb',
  '横滨港-新横滨站': 'ef40fdfb-63bd-4b71-a711-c564df5cc49f',
  '大阪港-关西机场(KIX)': 'ed8ff28b-4a7d-4cba-b904-995d7177cf70',
  '东京-长野': '2649bc67-21d8-47e6-b359-274b9ed2daff',
  '新千岁机场(CTS)-富良野': 'c59fa273-049c-4983-88c1-2ccbaf3d507b',
};

function matchNameScore(cn, ko) {
  let s = 0;
  const rules = [
    [/迪士尼/, /디즈니/],
    [/环球/, /유니버설/],
    [/哈利波特/, /해리포터|워너/],
    [/晴空塔/, /스카이트리/],
    [/羽田|HND/, /하네다|HND/],
    [/成田|NRT/, /나리타|NRT/],
    [/关西|KIX/, /간사이|KIX/],
    [/伊丹|ITM/, /이타미|ITM/],
    [/横滨港/, /요코하마항/],
    [/东京港/, /도쿄항/],
    [/东京站/, /도쿄역/],
    [/大阪站/, /오사카역/],
    [/大阪港/, /오사카항/],
    [/京都站/, /교토역/],
    [/铃鹿/, /스즈카/],
    [/箱根/, /하코네/],
    [/登别/, /노보리베츠/],
    [/富良野/, /후라노/],
    [/小樽/, /오타루/],
    [/支笏/, /시코쓰코/],
    [/星野/, /호시노/],
    [/羊蹄/, /요테이/],
    [/洞爷/, /도야코/],
    [/二世谷/, /니세코/],
    [/留寿都/, /루스쓰/],
    [/札幌/, /삿포로/],
    [/长野/, /나가노/],
    [/高山/, /다카야마/],
    [/吉卜力/, /지브리/],
    [/名古屋/, /나고야/],
    [/中部|NGO/, /중부|NGO/],
    [/神户港/, /고베항/],
    [/神户/, /고베/],
    [/奈良/, /나라/],
    [/新横滨/, /신요코하마/],
    [/邮轮/, /크루즈/],
    [/乐高|赛道/, /레고|서킷/],
    [/新千岁|CTS/, /신치토세|CTS/],
    [/京都/, /교토/],
    [/大阪/, /오사카/],
    [/东京/, /도쿄/],
  ];
  for (const [c, k] of rules) if (c.test(cn) && k.test(ko)) s++;
  if (/大阪市区酒店-大阪港/.test(cn) && /오사카 시내 호텔/.test(ko) && /오사카항/.test(ko) && !/간사이/.test(ko)) s += 5;
  if (/大阪港-关西/.test(cn) && /간사이/.test(ko) && /오사카항/.test(ko)) s += 5;
  if (/东京市区酒店-东京站/.test(cn) && /도쿄 시내 호텔/.test(ko) && /도쿄역/.test(ko)) s += 4;
  if (/东京站-羽田/.test(cn) && /도쿄역/.test(ko) && /하네다/.test(ko) && !/시내 호텔/.test(ko)) s += 4;
  if (/中部.*吉卜力|NGO.*吉卜力/.test(cn) && /중부|NGO/.test(ko) && /지브리/.test(ko)) s += 5;
  if (/中部.*名古屋|NGO.*名古屋/.test(cn) && /중부|NGO/.test(ko) && /나고야 시내 호텔/.test(ko)) s += 5;
  if (/登别/.test(cn) && /노보리베츠/.test(ko)) s += 5;
  if (/富良野/.test(cn) && /후라노/.test(ko)) s += 5;
  if (/CTS.*洞爷|洞爷湖/.test(cn) && /도야코/.test(ko)) s += 5;
  if (/CTS.*小樽|小樽/.test(cn) && /오타루/.test(ko)) s += 5;
  if (/CTS.*支笏|支笏/.test(cn) && /시코쓰코/.test(ko)) s += 5;
  if (/CTS.*星野|星野/.test(cn) && /호시노/.test(ko)) s += 5;
  if (/CTS.*羊蹄|羊蹄/.test(cn) && /요테이/.test(ko)) s += 5;
  if (/CTS.*札幌|札幌酒店/.test(cn) && /삿포로 시내 호텔/.test(ko) && /신치토세|CTS/.test(ko)) s += 5;
  if (/二世谷\/留寿都|二世谷\/留寿都/.test(cn) && /니세코|루스쓰/.test(ko) && /신치토세|CTS/.test(ko)) s += 3;
  // 市区酒店↔机场/站 vs 枢纽↔景点 消歧
  if (/东京市区.*羽田|东京市区酒店.*羽田|东京市区-羽田/.test(cn) && /도쿄 시내 호텔/.test(ko) && /하네다/.test(ko) && !/디즈니/.test(ko)) s += 4;
  if (/东京市区.*羽田|东京市区-羽田/.test(cn) && /디즈니/.test(ko)) s -= 4;
  if (/东京市区.*成田|东京市区-成田/.test(cn) && /도쿄 시내 호텔/.test(ko) && /나리타/.test(ko) && !/디즈니/.test(ko)) s += 4;
  if (/东京市区.*成田|东京市区-成田/.test(cn) && /디즈니/.test(ko)) s -= 4;
  if (/大阪市区.*关西|大阪市区-关西/.test(cn) && /오사카 시내 호텔/.test(ko) && /간사이/.test(ko)) s += 4;
  if (/大阪市区.*伊丹|大阪国际机场/.test(cn) && /오사카 시내 호텔/.test(ko) && /이타미/.test(ko)) s += 4;
  if (/哈利波特/.test(cn) && /해리포터|워너/.test(ko)) s += 3;
  if (/晴空塔/.test(cn) && /스카이트리/.test(ko)) s += 3;
  if (/京都站/.test(cn) && /교토역/.test(ko)) s += 3;
  if (/横滨市区/.test(cn) && /요코하마 시내/.test(ko) && /요코하마항/.test(ko)) s += 4;
  if (/羽田机场-横滨港/.test(cn) && /하네다/.test(ko) && /요코하마항/.test(ko) && !/시내 호텔/.test(ko)) s += 3;
  if (/成田机场-横滨港/.test(cn) && /나리타/.test(ko) && /요코하마항/.test(ko) && !/시내 호텔/.test(ko)) s += 3;
  if (/箱根.*羽田/.test(cn) && /하코네/.test(ko) && /하네다/.test(ko)) s += 3;
  if (/箱根.*成田/.test(cn) && /하코네/.test(ko) && /나리타/.test(ko)) s += 3;
  if (/伊丹.*京都/.test(cn) && /이타미/.test(ko) && /교토/.test(ko)) s += 3;
  if (/伊丹.*奈良/.test(cn) && /이타미/.test(ko) && /나라/.test(ko)) s += 3;
  if (/伊丹.*神户/.test(cn) && /이타미/.test(ko) && /고베/.test(ko)) s += 3;
  if (/名古屋市区-高山/.test(cn) && /나고야/.test(ko) && /다카야마/.test(ko)) s += 3;
  if (/名古屋市区-吉卜力/.test(cn) && /나고야/.test(ko) && /지브리/.test(ko) && !/중부|NGO/.test(ko)) s += 3;
  if (/札幌市区-二世谷/.test(cn) && /삿포로/.test(ko) && /니세코/.test(ko) && !/신치토세|CTS/.test(ko)) s += 3;
  if (/札幌市区-留寿都/.test(cn) && /삿포로/.test(ko) && /루스쓰/.test(ko) && !/신치토세|CTS/.test(ko)) s += 3;
  if (/新横滨/.test(cn) && /신요코하마/.test(ko)) s += 3;
  if (/长野/.test(cn) && /나가노/.test(ko)) s += 3;
  if (/成田.*羽田机场|NRT.*HND/.test(cn) && /나리타/.test(ko) && /하네다/.test(ko) && !/디즈니/.test(ko)) s += 3;
  if (/大阪市区酒店-铃鹿/.test(cn) && /오사카 시내/.test(ko) && /스즈카/.test(ko)) s += 3;
  if (/大阪市区酒店-京都市区酒店/.test(cn) && /오사카 시내 호텔/.test(ko) && /교토 시내 호텔/.test(ko)) s += 5;
  if (/京都市区酒店-关西/.test(cn) && /교토 시내 호텔/.test(ko) && /간사이/.test(ko)) s += 3;
  if (/奈良市区酒店-关西/.test(cn) && /나라 시내 호텔/.test(ko) && /간사이/.test(ko)) s += 3;
  if (/神户市区酒店-关西/.test(cn) && /고베 시내 호텔/.test(ko) && /간사이/.test(ko)) s += 3;
  if (/京都市区酒店-铃鹿/.test(cn) && /교토 시내 호텔/.test(ko) && /스즈카/.test(ko)) s += 3;
  if (/迪士尼/.test(cn) && /시내 호텔/.test(cn) && /도쿄 시내 호텔/.test(ko) && /디즈니/.test(ko)) s += 4;
  if (/环球/.test(cn) && /유니버설/.test(ko) && /오사카 시내/.test(ko)) s += 4;
  return s;
}

function routeType(cn) {
  if (/哈利波特|晴空塔|迪士尼|环球|吉卜力|高山|铃鹿|乐高|长野|二世谷|留寿都|洞爷|登别|富良野|小樽|支笏|星野|羊蹄/.test(cn) && !/机场|HND|NRT|KIX|ITM|CTS|NGO/.test(cn))
    return 'hotel_attraction';
  if (/机场|HND|NRT|KIX|ITM|CTS|NGO/.test(cn)) return 'airport_related';
  if (/站/.test(cn)) return 'station_related';
  if (/港/.test(cn)) return 'port_related';
  if (/酒店.*酒店|京都市区酒店$/.test(cn) || /大阪市区酒店-京都市区酒店/.test(cn)) return 'hotel_hotel';
  return 'other';
}

function parsePrices(body) {
  const re = /(?:^|\n)(\d{1,2})\n([\d,]+)(?=\n|$)/g;
  const prices = [];
  let m;
  while ((m = re.exec(body)) && prices.length < 80) prices.push(m[2].replace(/,/g, ''));
  return [...new Set(prices)];
}

function parseTimes(body) {
  const idxA = body.indexOf('时间段');
  const idxB = body.indexOf('時間段');
  const idx = idxA >= 0 ? idxA : idxB;
  const slice = idx >= 0 ? body.slice(idx, idx + 500) : '';
  const times = slice.match(/\d{2}:\d{2}/g) || [];
  return {
    count: times.length,
    first: times[0] || '',
    last: times[times.length - 1] || '',
    ok: times.length >= 28 && times[0] === '07:00' && times[times.length - 1] === '21:30',
  };
}

function buildIdMap(products) {
  const listIds = [];
  try {
    for (const x of JSON.parse(readFileSync(join(__dir, 'japan-list-ids.json'), 'utf8'))) {
      if (x.id) listIds.push(x);
    }
  } catch {}
  try {
    for (const s of JSON.parse(readFileSync(join(__dir, 'batch-scan-japan-results.json'), 'utf8'))) {
      if (s.id && !listIds.find((x) => x.id === s.id)) listIds.push({ id: s.id, name: s.label || '' });
    }
  } catch {}
  for (const f of readdirSync(__dir)) {
    if (!f.startsWith('.') || !f.endsWith('-draft-id')) continue;
    const id = readFileSync(join(__dir, f), 'utf8').trim().replace(/\s+/g, '');
    if (id.length > 20 && !listIds.find((x) => x.id === id)) listIds.push({ id, name: f });
  }

  const map = { ...ID_MAP };
  for (const p of products) {
    if (map[p.name] && !String(map[p.name]).includes('?')) continue;
    let best = null;
    let bestS = 0;
    for (const x of listIds) {
      if (!x.id || !x.name) continue;
      const sc = matchNameScore(p.name, x.name);
      if (sc > bestS) {
        bestS = sc;
        best = x.id;
      }
    }
    if (bestS >= 2) map[p.name] = best;
  }
  return map;
}

async function auditOne(page, product, idMap) {
  const n = product['#'];
  const name = product.name;
  let id = idMap[name];
  if (id && String(id).includes('?')) id = null;

  const row = {
    n,
    name,
    id: id || null,
    e7: product.e7 != null ? Math.round(Number(product.e7)) : null,
    e10: product.e10 != null ? Math.round(Number(product.e10)) : null,
    routeType: routeType(name),
    checks: {},
    summary: '',
    status: 'UNCHECKED',
  };

  if (!id) {
    row.status = 'FAIL';
    row.summary = '无草稿id/未定位';
    row.checks = { id: false };
    return row;
  }

  try {
    await dismiss(page);
    await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(1800);
    await dismiss(page);
    if (await page.evaluate(() => /找不到页面|아이코/.test(document.body?.innerText || ''))) {
      row.status = 'FAIL';
      row.summary = '草稿页404';
      return row;
    }

    const optN = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
    row.checks.optCount = optN;
    row.checks.optCountOk = optN >= 2 && optN <= 4;

    const optDetails = [];
    let priceOkAll = true;
    let timesOkAll = true;
    let koreanPt = true;
    for (let i = 0; i < Math.min(optN, 4); i++) {
      await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
      await sleep(1300);
      await dismiss(page);
      await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(i).click();
      await sleep(1700);
      for (let w = 0; w < 22; w++) {
        if (await page.locator('#name').inputValue().catch(() => '')) break;
        await sleep(100);
      }
      const oname = await page.locator('#name').inputValue().catch(() => '');
      const body = await page.evaluate(() => document.body.innerText || '');
      const prices = parsePrices(body);
      const times = parseTimes(body);
      const exp = /10인승/.test(oname) ? row.e10 : row.e7;
      const pOk = exp == null ? true : prices.some((p) => String(p) === String(exp));
      if (!pOk) priceOkAll = false;
      if (!times.ok) timesOkAll = false;
      if (/\b\d+seat\b|seat go|seat rtn/i.test(body)) koreanPt = false;
      optDetails.push({
        i,
        name: oname.slice(0, 45),
        prices: prices.slice(0, 3),
        exp,
        priceOk: pOk,
        timesOk: times.ok,
        t: `${times.count}/${times.first}-${times.last}`,
      });
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(80);
      await page.getByText(/^消除$/).first().click({ timeout: 250 }).catch(() => {});
    }
    row.checks.priceOk = priceOkAll;
    row.checks.timesOk = timesOkAll;
    row.checks.koreanPriceType = koreanPt;
    row.opts = optDetails;

    // FAQ + copy
    await page.goto(introUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(1500);
    await dismiss(page);
    const faq = await page.evaluate((q) => {
      let midQ = false;
      let midA = false;
      for (let i = 0; i < 12; i++) {
        const qi = document.querySelector(`input[name="faqs.${i}.question"],textarea[name="faqs.${i}.question"]`);
        const ai = document.querySelector(`textarea[name="faqs.${i}.answer"],input[name="faqs.${i}.answer"]`);
        if (qi && (qi.value || '').includes(q.slice(0, 10))) midQ = true;
        if (ai && /중간 경유지|지점 간 전용/.test(ai.value || '')) midA = true;
      }
      return { ok: midQ && midA, midQ, midA };
    }, FAQ_MIDSTOP_Q);
    row.checks.faq = faq.ok;

    const copy = await page.evaluate(() => {
      const usage = document.querySelector('textarea[name=usage],#usage')?.value || '';
      const desc = document.querySelector('textarea[name=description],#description')?.value || '';
      const all = usage + '\n' + desc;
      return {
        hasFlight: /항공편|터미널|공항 픽업/.test(all),
        hasShinOsaka: /신오사카/.test(all),
        usageHead: usage.slice(0, 50),
      };
    });
    row.checks.copy = copy;
    const rt = row.routeType;
    row.checks.copyOk =
      rt === 'hotel_attraction' || rt === 'hotel_hotel' ? !copy.hasFlight : true;
    if (/大阪站/.test(name) && copy.hasShinOsaka) row.checks.copyOk = false;

    // cancel + resv
    await page.goto(regsUrl(id), { waitUntil: 'domcontentloaded', timeout: 50000 });
    await sleep(1500);
    await dismiss(page);
    const regs = await page.evaluate((exact) => {
      const ta = document.querySelector('textarea[name=specificCancelPolicy]');
      const v = (ta?.value || '').trim();
      const body = document.body.innerText || '';
      const resvEmpty = /您必須輸入代表|须填写「代表|请选择代表|必須輸入代表/.test(body);
      const resvSlice = (body.match(/代表预约信息[\s\S]{0,160}/) || [''])[0].replace(/\s+/g, ' ').slice(0, 90);
      return {
        cancelExact: v === exact,
        cancelOk: v.includes('예약 확정 후 취소') && v.includes('협력사 확인'),
        cancelPreview: v.slice(0, 36),
        resvEmpty,
        resvOk: !resvEmpty && resvSlice.length > 15,
        resvSlice,
      };
    }, SPEC_CANCEL_KO);
    row.checks.cancelExact = regs.cancelExact;
    row.checks.cancelOk = regs.cancelOk;
    row.checks.cancelPreview = regs.cancelPreview;
    row.checks.resvOk = regs.resvOk;
    row.checks.resvSlice = regs.resvSlice;

    const fails = [];
    if (!row.checks.optCountOk) fails.push(`opts=${row.checks.optCount}`);
    if (!row.checks.priceOk) fails.push('price');
    if (!row.checks.timesOk) fails.push('times');
    if (!row.checks.koreanPriceType) fails.push('ptEN');
    if (!row.checks.faq) fails.push('faq');
    if (!row.checks.cancelOk) fails.push('cancel');
    if (!row.checks.resvOk) fails.push('resv');
    if (row.checks.copyOk === false) fails.push('copy');

    row.status = fails.length ? 'FAIL' : 'PASS';
    row.summary = fails.length
      ? `FAIL:${fails.join(',')}|faq=${row.checks.faq}|cancel=${row.checks.cancelOk}|P=${row.checks.priceOk}|T=${row.checks.timesOk}|opts=${row.checks.optCount}|resv=${row.checks.resvOk}`
      : `PASS|opts=${row.checks.optCount}|P✓T✓|faq✓|cancel✓|resv✓`;
  } catch (e) {
    row.status = 'FAIL';
    row.summary = `ERR:${String(e.message || e).slice(0, 80)}`;
    row.err = String(e.message || e).slice(0, 150);
  }
  return row;
}

// ---- main ----
const products = JSON.parse(readFileSync(join(__dir, 'japan-excel-product-list.json'), 'utf8'));
for (const p of products) {
  if (p.e7 != null) p.e7 = Math.round(Number(p.e7));
  if (p.e10 != null) p.e10 = Math.round(Number(p.e10));
}

const idMap = buildIdMap(products);
console.log('【0】N=', products.length);
const withId = products.filter((p) => idMap[p.name]);
console.log('【读回】已定位草稿id', withId.length, '/', products.length);
const noId = products.filter((p) => !idMap[p.name]);
if (noId.length) {
  console.log('【读回】缺id（将记 FAIL 无草稿）:');
  noId.forEach((p) => console.log(`  #${p['#']} ${p.name}`));
}

let results = [];
if (RESUME && existsSync(RESULTS)) {
  try {
    results = JSON.parse(readFileSync(RESULTS, 'utf8')).results || [];
    console.log('【读回】resume 已有', results.length);
  } catch {}
}
const doneSet = new Set(results.map((r) => r.n));

const { page } = await connectNolPage({
  selfHint: 'jp-full-audit',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const slice = products.filter((p) => p['#'] >= fromArg && p['#'] <= toArg);
console.log(`【将要】只读检查 #${fromArg}–#${toArg}（共${slice.length}）禁止修改`);

for (const p of slice) {
  if (doneSet.has(p['#'])) {
    console.log(`skip #${p['#']}`);
    continue;
  }
  console.log(`\n======== [#${p['#']}/${products.length}] ${p.name} ========`);
  console.log('【元素定位】id=', (idMap[p.name] || '无').toString().slice(0, 8));
  const row = await auditOne(page, p, idMap);
  console.log(`【结果】${row.status} ${row.summary}`);
  results.push(row);
  doneSet.add(p['#']);

  const remaining = products.filter((x) => !doneSet.has(x['#'])).map((x) => `#${x['#']} ${x.name}`);
  const prog = {
    N: products.length,
    checked: results.length,
    unchecked: products.length - results.length,
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
    remaining,
    lastDone: `#${p['#']} ${p.name}`,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(PROGRESS, JSON.stringify(prog, null, 2));
  writeFileSync(RESULTS, JSON.stringify({ N: products.length, results, idMap }, null, 2));
}

// full table
console.log('\n\n========== 全量表（每产品一行）==========');
const sorted = [...results].sort((a, b) => a.n - b.n);
for (const r of sorted) {
  console.log(
    `#${String(r.n).padStart(2, '0')} ${String(r.status).padEnd(4)} ${r.name} | ${r.summary} | id=${(r.id || '-').slice(0, 8)}`,
  );
}
const remaining = products.filter((x) => !doneSet.has(x['#']));
console.log(`\nN=${products.length} checked=${results.length} unchecked=${remaining.length} PASS=${results.filter((r) => r.status === 'PASS').length} FAIL=${results.filter((r) => r.status === 'FAIL').length}`);
if (remaining.length) {
  console.log('【剩余未检查】');
  remaining.forEach((x) => console.log(`  #${x['#']} ${x.name}`));
  console.log('未检查≠0，禁止称「全部检查完成」；进度已写入 japan-full-audit-progress.json');
  process.exit(3);
}
console.log('未检查=0 → 全部检查完成（本轮未进入修改阶段）');
console.log('未点提交审核');
process.exit(0);
