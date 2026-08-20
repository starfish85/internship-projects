/**
 * Live fix Japan transfer drafts: FAQ mid-stop + SPEC_CANCEL + route-type HOW.
 * node fix-japan-audit.mjs [prefix...]
 * node fix-japan-audit.mjs --all
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import {
  SPEC_CANCEL_KO,
  FAQ_MIDSTOP_Q,
  fillTransferFaqs,
  fillSpecCancel,
  fillHowToUse,
  buildHowToUse,
} from './lib/transfer-audit-copy.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ALL = process.argv.includes('--all');

// prefix → { label, routeType, fixHow }
const MAP = {
  hp: { label: '哈利波特', routeType: 'hotel_attraction', fixHow: true, fixHighlightDisney: true },
  st: { label: '晴空塔', routeType: 'hotel_attraction', fixHow: true },
  ky: { label: '京都站', routeType: 'hotel_station', fixHow: true },
  sz: { label: '京都-铃鹿', routeType: 'hotel_hotel', fixHow: true },
  ok: { label: '大阪-京都酒店', routeType: 'hotel_hotel', fixHow: true },
  // airports / hubs
  kk: { label: 'KIX', routeType: 'hotel_airport', fixHow: false },
  nk: { label: 'NRT酒店', routeType: 'hotel_airport', fixHow: false },
  cn: { label: '成田相关', routeType: 'hotel_airport', fixHow: false },
  cnr: { label: '成田2', routeType: 'hotel_airport', fixHow: false },
  hh: { label: '羽田相关', routeType: 'hotel_airport', fixHow: false },
  htd: { label: '羽田-迪士尼', routeType: 'airport_attraction', fixHow: false },
  ntd: { label: '成田-迪士尼', routeType: 'airport_attraction', fixHow: false },
  // ports
  kp: { label: '东京港相关', routeType: 'hotel_port', fixHow: true },
  yhp: { label: '横滨港', routeType: 'hotel_port', fixHow: true },
  kpk: { label: '神户港-京都', routeType: 'port_hotel', fixHow: true },
  opk: { label: '大阪港-KIX', routeType: 'port_airport', fixHow: false },
  csp: { label: '港相关', routeType: 'hotel_port', fixHow: false },
  // stations
  tsp: { label: '东京站', routeType: 'hotel_station', fixHow: true },
  tsh: { label: '东京站2', routeType: 'hotel_station', fixHow: true },
  ysy: { label: '车站相关', routeType: 'hotel_station', fixHow: true },
  snk: { label: '新大阪相关', routeType: 'hotel_station', fixHow: true },
  // more Japan recent
  iky: { label: 'ITM-京都', routeType: 'airport_hotel', fixHow: false },
  ina: { label: 'ITM-奈良', routeType: 'airport_hotel', fixHow: false },
  ikb: { label: 'ITM-神户', routeType: 'airport_hotel', fixHow: false },
  nsl: { label: '名古屋-铃鹿', routeType: 'hotel_hotel', fixHow: true },
  ngt: { label: '名古屋', routeType: 'hotel_attraction', fixHow: true },
  ngg: { label: '乐高', routeType: 'hotel_attraction', fixHow: true },
  tkn: { label: '东京-长野', routeType: 'hotel_hotel', fixHow: true },
  cfu: { label: 'CTS-富良野', routeType: 'airport_hotel', fixHow: false },
  cot: { label: 'CTS-小樽', routeType: 'airport_hotel', fixHow: false },
  csk: { label: 'CTS-支笏', routeType: 'airport_hotel', fixHow: false },
  cho: { label: 'CTS-星野', routeType: 'airport_hotel', fixHow: false },
  cye: { label: 'CTS-羊蹄', routeType: 'airport_hotel', fixHow: false },
  sru: { label: '札幌-留寿都', routeType: 'hotel_attraction', fixHow: true },
  cty: { label: 'CTS', routeType: 'airport_hotel', fixHow: false },
  cnh: { label: 'CTS2', routeType: 'airport_hotel', fixHow: false },
  osu: { label: 'USJ/铃鹿', routeType: 'hotel_attraction', fixHow: true },
  kb: { label: '神户', routeType: 'hotel_port', fixHow: false },
  hn: { label: '箱根-NRT(local id)', routeType: 'hotel_airport', fixHow: false },
  nyp: { label: 'nyp', routeType: 'hotel_attraction', fixHow: true },
  hyp: { label: 'hyp', routeType: 'hotel_attraction', fixHow: true },
  nhh: { label: 'nhh', routeType: 'hotel_hotel', fixHow: true },
  yts: { label: 'yts', routeType: 'hotel_station', fixHow: true },
};

function loadList() {
  const keys = ALL ? Object.keys(MAP) : args.length ? args : Object.keys(MAP);
  const out = [];
  for (const prefix of keys) {
    if (!MAP[prefix]) continue;
    const f = path.join(__dir, `.${prefix}-draft-id`);
    if (!fs.existsSync(f)) continue;
    const id = fs.readFileSync(f, 'utf8').trim();
    if (!id) continue;
    out.push({ prefix, id, ...MAP[prefix] });
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissLeave(page) {
  await page.getByText(/^消除$/).first().click({ timeout: 600 }).catch(() => {});
  await page.getByRole('button', { name: /^消除$/ }).click({ timeout: 400 }).catch(() => {});
}

async function clickSaveThen(page) {
  const btn = page.locator('button').filter({ hasText: /^保存然后$|^保存然後$/ }).first();
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(300);
  const en = await btn.isEnabled().catch(() => false);
  if (!en) {
    // wait briefly
    for (let i = 0; i < 8; i++) {
      await sleep(400);
      if (await btn.isEnabled().catch(() => false)) break;
    }
  }
  const en2 = await btn.isEnabled().catch(() => false);
  if (!en2) {
    const texts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((b) => /保存|存储|儲存/.test(b.innerText || ''))
        .map((b) => ({ t: (b.innerText || '').trim(), d: b.disabled }))
        .slice(0, 12),
    );
    return { ok: false, reason: 'disabled', texts };
  }
  await btn.click();
  await sleep(2200);
  await dismissLeave(page);
  return { ok: true };
}

async function readFaqOk(page) {
  return page.evaluate((q) => {
    const el = document.querySelector('input[name="faqs.0.question"]');
    const a = document.querySelector('textarea[name="faqs.0.answer"]');
    return {
      has: !!el,
      q: el ? (el.value || '').slice(0, 50) : '',
      a: a ? (a.value || '').slice(0, 40) : '',
      ok: !!(el && (el.value || '').includes(q.slice(0, 10))),
    };
  }, FAQ_MIDSTOP_Q);
}

async function readCancelOk(page) {
  return page.evaluate((exp) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    const v = ta ? ta.value || '' : '';
    return { ok: v.trim() === exp.trim() || (v.includes('예약 확정 후 취소') && v.includes('환불 가능하며')), preview: v.slice(0, 50) };
  }, SPEC_CANCEL_KO);
}

killPeerCdpScripts('fix-japan-audit');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes('tour.triple.partners'));
if (!page) {
  console.error('NO PAGE');
  process.exit(2);
}
await page.bringToFront();
page.setDefaultTimeout(28000);
page.setDefaultNavigationTimeout(60000);

const list = loadList();
console.log('【将要】修复日本草稿', list.length, '个');
const results = [];

for (const d of list) {
  const row = { prefix: d.prefix, label: d.label, id: d.id, faq: null, cancel: null, how: null };
  console.log(`\n======== ${d.prefix} ${d.label} ${d.id.slice(0, 8)} ========`);
  try {
    // --- INTRO ---
    console.log('【将要】打开介绍页 + FAQ');
    await page.goto(
      `https://tour.triple.partners/product-management/registration/introduction?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(2000);
    await dismissLeave(page);

    // headline check
    const hl = await page.locator('#headline, input[name=headline]').inputValue().catch(() => '');
    console.log('【读回】headline', hl.slice(0, 50));
    if (!hl) {
      row.error = 'empty headline / bad draft';
      results.push(row);
      console.log('【结果】SKIP empty');
      continue;
    }

    // fix HOW for non-airport if still has 항공편명 wrong template
    if (d.fixHow) {
      const usage = await page.locator('#usage, textarea[name=usage]').inputValue().catch(() => '');
      const needHow =
        /항공편명/.test(usage) && !['hotel_airport', 'airport_hotel', 'airport_attraction', 'port_airport', 'station_airport'].includes(d.routeType);
      if (needHow || /터미널·역 출구/.test(usage)) {
        console.log('【将要】修正 HOW 线路类型', d.routeType);
        row.how = await fillHowToUse(page, d.routeType);
        console.log('【结果】HOW', row.how);
      }
    }

    // Harry Potter highlight disney slip
    if (d.fixHighlightDisney) {
      const hi = await page.locator('#highlight, textarea[name=highlight]').inputValue().catch(() => '');
      if (/디즈니/.test(hi)) {
        const fixed = hi.replace('디즈니/스튜디오 일정에 맞춘 프라이빗 픽업 및 샌딩', '스튜디오 투어 일정에 맞춘 프라이빗 픽업 및 샌딩');
        await page.locator('#highlight, textarea[name=highlight]').fill(fixed);
        console.log('【结果】highlight 去迪士尼误写');
      }
    }

    console.log('【将要】填写 FAQ mid-stop');
    const faqRb = await fillTransferFaqs(page);
    console.log('【结果】FAQ fill', faqRb);
    row.faq = await readFaqOk(page);
    console.log('【读回】FAQ', row.faq);

    if (!row.faq.ok) {
      // one more try: force click 添加问答 + fill
      await page.getByText(/添加问答|添加問答/).first().click({ timeout: 3000 }).catch(() => {});
      await sleep(500);
      await page.locator('input[name="faqs.0.question"]').fill(FAQ_MIDSTOP_Q).catch(() => {});
      await page.locator('textarea[name="faqs.0.answer"]').fill(
        '본 서비스는 출발지에서 목적지까지 바로 이동하는 지점 간 전용 차량 서비스입니다. 중간 경유지 추가 또는 중간 승하차는 제공되지 않습니다.',
      ).catch(() => {});
      row.faq = await readFaqOk(page);
      console.log('【读回】FAQ retry', row.faq);
    }

    console.log('【将要】介绍 保存然后');
    const introSave = await clickSaveThen(page);
    console.log('【结果】introSave', introSave);
    row.introSave = introSave;

    // --- REGS ---
    console.log('【将要】打开法规 + 特殊条款');
    await page.goto(
      `https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(2000);
    await dismissLeave(page);

    const cancelRb = await fillSpecCancel(page);
    console.log('【结果】cancel fill', cancelRb);
    row.cancel = await readCancelOk(page);
    console.log('【读回】cancel', row.cancel);

    console.log('【将要】法规 保存然后');
    const regsSave = await clickSaveThen(page);
    console.log('【结果】regsSave', regsSave);
    row.regsSave = regsSave;

    // re-verify cancel after save (reopen)
    await page.goto(
      `https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(1500);
    row.cancelAfter = await readCancelOk(page);

    await page.goto(
      `https://tour.triple.partners/product-management/registration/introduction?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(1500);
    row.faqAfter = await readFaqOk(page);

    row.status =
      row.faqAfter?.ok && row.cancelAfter?.ok ? 'PASS' : 'PARTIAL';
    console.log('【结果】', row.status, 'faqAfter', row.faqAfter?.ok, 'cancelAfter', row.cancelAfter?.ok);
  } catch (e) {
    row.error = String(e.message || e).slice(0, 250);
    row.status = 'ERR';
    console.log('【结果】ERR', row.error);
  }
  results.push(row);
  // progress file
  fs.writeFileSync(path.join(__dir, 'fix-japan-results.json'), JSON.stringify(results, null, 2));
}

console.log('\n========== FIX SUMMARY ==========');
for (const r of results) {
  console.log(
    `[${r.status}] ${r.prefix} ${r.label} faq=${r.faqAfter?.ok ?? r.faq?.ok} cancel=${r.cancelAfter?.ok ?? r.cancel?.ok}${r.error ? ' ' + r.error : ''}`,
  );
}
const pass = results.filter((r) => r.status === 'PASS').length;
console.log(`PASS ${pass}/${results.length}`);
// never 提交审核
console.log('【结果】未点击提交审核/批准请求');
process.exit(0);
