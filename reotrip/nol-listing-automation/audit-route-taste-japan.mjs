/**
 * Japan transfer full scan: C-ROUTE + C-TASTE only (nol-japan-transfer-audit)
 * Read-only. Writes audit-route-taste-results.json
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';
import fs from 'fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL('./audit-route-taste-results.json', import.meta.url).pathname;

const PRODUCTS = JSON.parse(
  fs.readFileSync(new URL('./japan-full-audit-results.json', import.meta.url), 'utf8'),
).results.map((r) => ({ n: r.n, name: r.name, id: r.id, routeTypePrev: r.routeType }));

// fix known wrong id #36
const ID_FIX = {
  '新千岁机场(CTS)-二世谷/留寿都': 'c5a6feaf-0000-0000-0000-000000000000', // placeholder if unknown
};
// inventory says c5a6feaf — try load from inventory later; for now override if same as niseko
for (const p of PRODUCTS) {
  if (p.name.includes('二世谷/留寿都') && p.id.startsWith('adaa42d7')) {
    p.id = 'c5a6feaf'; // short — will resolve via list if needed
    p.idNote = 'was-wrong-bound-to-adaa42d7';
  }
}

function inferType(name) {
  const n = name || '';
  const airport = /机场|空港|HND|NRT|KIX|ITM|CTS|NGO|羽田|成田|关西|伊丹|新千岁|中部国际|大阪国际/i.test(n);
  const station = /站(?!区)|东京站|京都站|大阪站|新横滨|车站/.test(n);
  const port = /港|邮轮/.test(n);
  const attr =
    /迪士尼|环球|哈利|晴空|吉卜力|乐高|赛道|登别|洞爷|富良野|小樽|支笏|星野|羊蹄|高山|长野|留寿都|二世谷/.test(
      n,
    ) && !/市区酒店-.*市区(?!.*赛道)/.test(n);
  // hotel-hotel / city-city
  if (/铃鹿市区|京都市区酒店-铃鹿|大阪市区酒店-铃鹿|大阪市区酒店-京都市区|名古屋市区-高山|东京-长野|札幌市区-二世谷|札幌市区-留寿都/.test(n)) {
    if (/赛道|乐高/.test(n)) return 'hotel_attraction';
    return 'hotel_hotel';
  }
  if (airport && station) return 'station_airport';
  if (airport && port) return 'airport_port';
  if (airport && attr) return 'airport_attraction';
  if (airport && /酒店|市区/.test(n)) return 'hotel_airport';
  if (airport) return 'hotel_airport';
  if (station && port) return 'port_station';
  if (station) return 'hotel_station';
  if (port) return 'hotel_port';
  if (attr || /迪士尼|环球|哈利|晴空|吉卜力/.test(n)) return 'hotel_attraction';
  return 'hotel_hotel';
}

/** Expected endpoint tokens (ko/zh/en) derived from product name */
function expectedTokens(name) {
  const map = [
    [/迪士尼|Disney/i, ['디즈니', 'disney', '디즈니리조트']],
    [/环球|USJ|ユニバーサル/i, ['유니버설', 'universal', 'usj']],
    [/哈利|Harry/i, ['해리포터', 'harry', '워너']],
    [/晴空|Skytree/i, ['스카이트리', 'skytree', '도쿄스카이']],
    [/吉卜力|Ghibli/i, ['지브리', 'ghibli']],
    [/羽田|HND/i, ['하네다', 'haneda', 'hnd']],
    [/成田|NRT/i, ['나리타', 'narita', 'nrt']],
    [/关西|KIX/i, ['간사이', 'kansai', 'kix']],
    [/伊丹|ITM/i, ['이타미', 'itami', 'itm']],
    [/新千岁|CTS/i, ['신치토세', 'chitose', 'cts']],
    [/中部|NGO|Centrair/i, ['주부', 'centrair', 'ngo']],
    [/东京站|도쿄역/i, ['도쿄역', 'tokyo station', 'tokyo sta']],
    [/京都站|교토역/i, ['교토역', 'kyoto station']],
    [/大阪站|오사카역|신오사카/i, ['오사카역', '신오사카', 'osaka station']],
    [/新横滨/i, ['신요코하마', 'shin-yokohama']],
    [/横滨港|横浜/i, ['요코하마', 'yokohama']],
    [/东京港/i, ['도쿄항', 'tokyo port', '하루미', '오다이바']],
    [/大阪港/i, ['오사카항', 'osaka port']],
    [/神户港/i, ['고베항', 'kobe port']],
    [/铃鹿(?!赛道)|스즈카(?! 서킷)/i, ['스즈카', 'suzuka']],
    [/铃鹿赛道|乐高/i, ['스즈카', '레고랜드', '서킷', 'legoland']],
    [/登别/i, ['노보리베츠', 'noboribetsu']],
    [/洞爷/i, ['도야', 'toya']],
    [/二世谷|Niseko/i, ['니세코', 'niseko']],
    [/留寿都|Rusutsu/i, ['루스쓰', 'rusutsu']],
    [/札幌/i, ['삿포로', 'sapporo']],
    [/名古屋/i, ['나고야', 'nagoya']],
    [/高山/i, ['다카야마', 'takayama']],
    [/长野/i, ['나가노', 'nagano']],
    [/富良野/i, ['후라노', 'furano']],
    [/小樽/i, ['오타루', 'otaru']],
    [/支笏/i, ['시코쓰', 'shikotsu']],
    [/星野/i, ['호시노', 'hoshino']],
    [/羊蹄/i, ['요테이', 'yotei']],
    [/奈良/i, ['나라', 'nara']],
    [/神户(?!港)|神戸/i, ['고베', 'kobe']],
    [/京都(?!站)/i, ['교토', 'kyoto']],
    [/大阪(?!站|港)/i, ['오사카', 'osaka']],
    [/东京(?!站|港)|Tokyo/i, ['도쿄', 'tokyo']],
    [/箱根/i, ['하코네', 'hakone']],
    [/横滨(?!港)/i, ['요코하마', 'yokohama']],
  ];
  const toks = [];
  for (const [re, list] of map) {
    if (re.test(name)) toks.push(...list);
  }
  return [...new Set(toks.map((t) => t.toLowerCase()))];
}

/** High-signal foreign tokens that indicate wrong route if product doesn't expect them */
const FOREIGN_BANK = [
  { re: /디즈니|disney|디즈니리조트/i, key: 'disney', need: /迪士尼|disney/i },
  { re: /유니버설|universal\s*studio|usj/i, key: 'usj', need: /环球|USJ|universal/i },
  { re: /해리포터|harry\s*potter/i, key: 'harry', need: /哈利|harry/i },
  { re: /스카이트리|skytree/i, key: 'skytree', need: /晴空|skytree/i },
  { re: /지브리|ghibli/i, key: 'ghibli', need: /吉卜力|ghibli/i },
  { re: /하네다|haneda|\bhnd\b/i, key: 'hnd', need: /羽田|HND|haneda/i },
  { re: /나리타|narita|\bnrt\b/i, key: 'nrt', need: /成田|NRT|narita/i },
  { re: /간사이|kansai|\bkix\b/i, key: 'kix', need: /关西|KIX|kansai/i },
  { re: /이타미|itami|\bitm\b/i, key: 'itm', need: /伊丹|ITM|itami/i },
  { re: /신치토세|chitose|\bcts\b/i, key: 'cts', need: /新千岁|CTS|chitose/i },
  { re: /스즈카|suzuka|铃鹿/i, key: 'suzuka', need: /铃鹿|스즈카|suzuka/i },
  { re: /교토역|kyoto\s*station/i, key: 'kyoto_stn', need: /京都站|교토역|Kyoto\s*Station/i },
  { re: /도쿄역|tokyo\s*station/i, key: 'tokyo_stn', need: /东京站|도쿄역|Tokyo\s*Station/i },
  { re: /오사카역|신오사카|osaka\s*station/i, key: 'osaka_stn', need: /大阪站|오사카역|新大阪/i },
  { re: /니세코|niseko/i, key: 'niseko', need: /二世谷|niseko/i },
  { re: /루스쓰|rusutsu/i, key: 'rusutsu', need: /留寿都|rusutsu/i },
  { re: /나라\b|nara/i, key: 'nara', need: /奈良|nara/i },
  { re: /고베|kobe/i, key: 'kobe', need: /神户|kobe|神戸/i },
  { re: /하코네|hakone/i, key: 'hakone', need: /箱根|hakone/i },
  { re: /다카야마|takayama/i, key: 'takayama', need: /高山|takayama/i },
  { re: /나가노|nagano/i, key: 'nagano', need: /长野|nagano/i },
];

function analyzeCopy(name, type, fieldTexts, bodySample) {
  const blob = fieldTexts.map((f) => f.v).join('\n') + '\n' + bodySample;
  const fails = [];
  const hits = [];

  // type-based taste bans
  const noFlight = /hotel_attraction|hotel_hotel|hotel_station/.test(type) && !/airport/.test(type);
  if (noFlight && /hotel_attraction|hotel_hotel/.test(type)) {
    if (/항공편|공항\s*픽업|공항\s*샌딩|터미널\s*정보|flight\s*number/i.test(blob)) {
      fails.push('C-TASTE: 酒店景点/酒店线路含机场航班叙事');
      hits.push('flight_narrative');
    }
    if (/교토역|도쿄역|오사카역|역 출구에서 미팅|역에서 픽업/i.test(blob) && !/station/.test(type)) {
      // hotel_hotel / attraction should not use station meeting lines
      if (!/站/.test(name)) {
        fails.push('C-TASTE: 非车站产品含车站会和/교토역等');
        hits.push('station_meeting');
      }
    }
  }
  if (type === 'hotel_station') {
    if (/항공편|비행기|airport\s*pickup/i.test(blob) && !/airport|机场/.test(name)) {
      fails.push('C-TASTE: 接送站产品含航空叙事');
      hits.push('station_as_airport');
    }
  }

  // foreign endpoint bank
  for (const f of FOREIGN_BANK) {
    if (!f.re.test(blob)) continue;
    if (f.need.test(name)) continue;
    // 교토 alone is ok for kyoto products — kyoto_stn already gated
    // kobe word might appear in kobe-related; need already covers
    // soft: disney on non-disney is hard fail
    fails.push(`C-ROUTE: 文案出现非本线路端点「${f.key}」`);
    hits.push(f.key);
  }

  // 스즈카 without 铃鹿 in product name
  if (/스즈카|铃鹿|suzuka/i.test(blob) && !/铃鹿|스즈카|suzuka/i.test(name)) {
    if (!hits.includes('suzuka')) {
      fails.push('C-TASTE: 串铃鹿/스즈카');
      hits.push('suzuka');
    }
  }

  return { fails: [...new Set(fails)], hits: [...new Set(hits)] };
}

const intro = (id) =>
  `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;

async function resolveId(page, p) {
  if (p.id && p.id.length > 20) return p.id;
  // search list for short id or name
  await page.goto('https://tour.triple.partners/product-management', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(2000);
  await dismiss(page);
  const q = p.name.includes('留寿都') ? '니세코' : p.name.slice(0, 8);
  // try open by scanning links
  const found = await page.evaluate((hint) => {
    const links = Array.from(document.querySelectorAll('a[href*="registration"]'));
    for (const a of links) {
      const href = a.href || '';
      const t = (a.innerText || '') + (a.closest('tr')?.innerText || '');
      if (href.includes(hint) || t.includes('루스쓰') || t.includes('留寿都')) {
        const m = href.match(/id=([a-f0-9-]{36})/i);
        if (m) return m[1];
      }
    }
    return null;
  }, p.id);
  return found || p.id;
}

async function scanProduct(page, p) {
  const type = inferType(p.name);
  let id = p.id;
  if (id.length < 30) {
    // incomplete uuid
    id = await resolveId(page, p).catch(() => p.id);
  }

  await page.goto(intro(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  await dismiss(page);

  const data = await page.evaluate(() => {
    const fields = [];
    for (const el of document.querySelectorAll('textarea, input')) {
      const v = (el.value || '').trim();
      if (v.length < 4) continue;
      const name = el.name || el.id || el.placeholder || el.tagName;
      if (/search|password|email|phone|tel|url|file/i.test(name) && v.length < 40) continue;
      fields.push({ name: String(name).slice(0, 60), v: v.slice(0, 500) });
    }
    // faq count
    let faqN = 0;
    for (let i = 0; i < 12; i++) {
      if (document.querySelector(`input[name="faqs.${i}.question"]`)) faqN++;
    }
    const body = (document.body.innerText || '').slice(0, 4000);
    const url = location.href;
    const dead = /找不到|不存在|404|error/i.test(body) && body.length < 500;
    return { fields, faqN, body, url, dead };
  });

  if (data.dead || !data.url.includes(id.slice(0, 8))) {
    return {
      n: p.n,
      name: p.name,
      id,
      type,
      status: 'SKIP',
      fails: ['页面打不开或 id 无效'],
      hits: [],
      fieldHits: [],
    };
  }

  const { fails, hits } = analyzeCopy(p.name, type, data.fields, data.body);
  // field-level hits for fix
  const fieldHits = [];
  for (const f of data.fields) {
    const a = analyzeCopy(p.name, type, [f], '');
    if (a.fails.length) fieldHits.push({ name: f.name, preview: f.v.slice(0, 100), hits: a.hits });
  }

  const status = fails.length ? 'FAIL' : 'PASS';
  return {
    n: p.n,
    name: p.name,
    id,
    type,
    status,
    fails,
    hits,
    fieldHits: fieldHits.slice(0, 15),
    faqN: data.faqN,
    fieldCount: data.fields.length,
  };
}

const { page } = await connectNolPage({
  selfHint: 'audit-route-taste',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const results = [];
console.log('======== C-ROUTE + C-TASTE 全量扫描 N=', PRODUCTS.length, '========\n');

for (const p of PRODUCTS) {
  try {
    const r = await scanProduct(page, p);
    results.push(r);
    const tag = r.status === 'PASS' ? '✓' : r.status === 'SKIP' ? '?' : '✗';
    console.log(
      `${String(r.n).padStart(2)} ${tag} ${r.name.slice(0, 22).padEnd(22)} ${r.type.padEnd(18)} ${(r.fails || []).join(' | ') || 'ok'}`,
    );
  } catch (e) {
    results.push({ n: p.n, name: p.name, id: p.id, status: 'ERR', fails: [String(e).slice(0, 120)] });
    console.log(p.n, 'ERR', e.message || e);
  }
}

const fail = results.filter((r) => r.status === 'FAIL');
const pass = results.filter((r) => r.status === 'PASS');
const skip = results.filter((r) => r.status === 'SKIP' || r.status === 'ERR');

const summary = {
  N: results.length,
  pass: pass.length,
  fail: fail.length,
  skip: skip.length,
  failList: fail.map((r) => ({ n: r.n, name: r.name, id: r.id, type: r.type, fails: r.fails, hits: r.hits })),
  results,
  note: 'C-ROUTE+C-TASTE only; no submit',
};

fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
console.log('\n======== 汇总 ========');
console.log(JSON.stringify({ N: summary.N, pass: summary.pass, fail: summary.fail, skip: summary.skip }, null, 2));
console.log('FAIL 产品:');
for (const f of fail) console.log(' -', f.n, f.name, f.fails.join('; '));
console.log('wrote', OUT);
process.exit(fail.length ? 2 : 0);
