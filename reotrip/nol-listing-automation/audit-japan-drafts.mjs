/**
 * Audit Japan transfer drafts: FAQ mid-stop + SPEC_CANCEL + rough copy type.
 * Usage: node audit-japan-drafts.mjs [prefix...]
 *        node audit-japan-drafts.mjs --fix [prefix...]  # write FAQ+cancel + 保存然后 when needed
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import {
  SPEC_CANCEL_KO,
  FAQ_MIDSTOP_Q,
  FAQ_MIDSTOP_A,
  fillTransferFaqs,
  fillSpecCancel,
} from './lib/transfer-audit-copy.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const DO_FIX = process.argv.includes('--fix');
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'));

// Audit-priority Japan routes (prefix → label). Expand via .*-draft-id if needed.
const PRIORITY = [
  ['hp', '东京酒店-哈利波特', 'hotel_attraction'],
  ['st', '东京酒店-晴空塔', 'hotel_attraction'],
  ['ky', '京都酒店-京都站', 'hotel_station'],
  ['sz', '京都酒店-铃鹿', 'hotel_hotel'],
  ['ok', '大阪酒店-京都酒店', 'hotel_hotel'],
  ['hn', '东京-羽田HND', 'hotel_airport'],
  ['nk', '东京-成田NRT', 'hotel_airport'],
  ['kk', '大阪-关西KIX', 'hotel_airport'],
  ['osu', '大阪-USJ或铃鹿', 'hotel_attraction'],
  ['kp', '东京港或相关', 'hotel_port'],
  ['yhp', '横滨港', 'hotel_port'],
  ['tsp', '东京站', 'hotel_station'],
  ['tsh', '东京站相关', 'hotel_station'],
  ['ysy', '横滨/车站', 'hotel_station'],
  ['hh', '羽田相关', 'hotel_airport'],
  ['htd', '羽田-迪士尼', 'airport_attraction'],
  ['ntd', '成田-迪士尼', 'airport_attraction'],
  ['cn', '成田相关', 'hotel_airport'],
  ['cnr', '成田相关2', 'hotel_airport'],
  ['kb', '神户相关', 'hotel_port'],
  ['kpk', '神户港-京都', 'port_hotel'],
  ['opk', '大阪港-KIX', 'port_airport'],
  ['iky', 'ITM-京都', 'airport_hotel'],
  ['ina', 'ITM-奈良', 'airport_hotel'],
  ['ikb', 'ITM-神户', 'airport_hotel'],
  ['nsl', '名古屋-铃鹿', 'hotel_hotel'],
  ['ngt', '名古屋相关', 'hotel_attraction'],
  ['ngg', '名古屋-乐高', 'hotel_attraction'],
  ['tkn', '东京-长野', 'hotel_hotel'],
  ['cfu', 'CTS-富良野', 'airport_hotel'],
  ['cot', 'CTS-小樽', 'airport_hotel'],
  ['csk', 'CTS-支笏湖', 'airport_hotel'],
  ['cho', 'CTS-星野', 'airport_hotel'],
  ['cye', 'CTS-羊蹄', 'airport_hotel'],
  ['sru', '札幌-留寿都', 'hotel_attraction'],
  ['cty', 'CTS相关', 'airport_hotel'],
  ['cnh', 'CTS相关2', 'airport_hotel'],
  ['csp', '札幌/港', 'hotel_port'],
  ['snk', '新大阪/相关', 'hotel_station'],
  ['nyp', '相关', 'hotel_attraction'],
  ['hyp', '相关2', 'hotel_attraction'],
  ['nhh', '相关3', 'hotel_hotel'],
  ['yts', '相关4', 'hotel_station'],
];

function loadDrafts() {
  const list = [];
  for (const [prefix, label, routeType] of PRIORITY) {
    const f = path.join(__dir, `.${prefix}-draft-id`);
    if (!fs.existsSync(f)) continue;
    const id = fs.readFileSync(f, 'utf8').trim();
    if (!id || id.length < 10) continue;
    if (ONLY.length && !ONLY.includes(prefix)) continue;
    list.push({ prefix, label, routeType, id });
  }
  // also known fixed samples
  const extras = [
    { prefix: 'disney', label: '东京迪士尼(过审样板)', routeType: 'hotel_attraction', id: '462b9cef-c378-45d7-afd5-9b44f364b378' },
    { prefix: 'usj', label: '大阪USJ(过审样板)', routeType: 'hotel_attraction', id: '4b49b221-a013-4420-9def-ffddfc09a310' },
  ];
  for (const e of extras) {
    if (ONLY.length && !ONLY.includes(e.prefix)) continue;
    if (!list.find((x) => x.id === e.id)) list.push(e);
  }
  return list;
}

async function readIntroState(page) {
  return page.evaluate(() => {
    const val = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.value || '') : '';
    };
    const body = document.body?.innerText || '';
    const desc = val('#description, textarea[name=description]');
    const usage = val('#usage, textarea[name=usage]');
    const checkList = val('#checkList, textarea[name=checkList]');
    const headline = val('#headline, input[name=headline]');
    // FAQ fields
    const all = Array.from(document.querySelectorAll('input, textarea'));
    const faqBits = all
      .filter((el) => /faq|question|answer|질문|문제|回答/i.test(`${el.name}|${el.id}|${el.placeholder || ''}`))
      .map((el) => ({ name: el.name || el.id, v: (el.value || '').slice(0, 80) }));
    const allText = [desc, usage, checkList, headline, body.slice(0, 3000), ...faqBits.map((f) => f.v)].join('\n');
    return {
      headline: headline.slice(0, 60),
      hasMidstopQ: /중간에 다른 장소/.test(allText),
      hasMidstopA: /중간 경유지|중간 승하차/.test(allText),
      hasFlightInUsage: /항공편명/.test(usage),
      hasAirportWord: /공항 픽업|터미널/.test(usage + desc),
      hasStationWord: /역 출구|역 픽업/.test(usage + desc),
      usagePreview: usage.slice(0, 100).replace(/\n/g, '|'),
      faqFieldCount: faqBits.length,
      faqBits,
    };
  });
}

async function readRegsState(page) {
  return page.evaluate((expected) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy], #specificCancelPolicy');
    const v = ta ? ta.value || '' : '';
    return {
      hasField: !!ta,
      exact: v.trim() === expected.trim(),
      hasNew: v.includes('예약 확정 후 취소 요청은 협력사 확인'),
      hasOld: v.includes('파트너 수동 취소 정책을 따릅니다') || (v.includes('환불됩니다') && !v.includes('환불 가능하며')),
      preview: v.slice(0, 70),
      empty: !v.trim(),
    };
  }, SPEC_CANCEL_KO);
}

async function clickSaveThen(page) {
  const btn = page.locator('button').filter({ hasText: /保存然后|保存然後|저장 후/ }).first();
  const en = await btn.isEnabled().catch(() => false);
  if (!en) {
    // try scroll
    await btn.scrollIntoViewIfNeeded().catch(() => {});
  }
  const en2 = await btn.isEnabled().catch(() => false);
  if (!en2) return { ok: false, reason: 'saveThen disabled' };
  await btn.click();
  await page.waitForTimeout(2000);
  return { ok: true };
}

async function ensureFaqUi(page) {
  // try click add FAQ if empty
  const add = page.locator('button').filter({ hasText: /添加|추가|Add|新增/ }).filter({ hasText: /FAQ|问题|질문|常見|常见/ });
  // broader: any add near FAQ section
  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('button, a, span'));
    const hit = nodes.find((e) => {
      const t = (e.innerText || '').replace(/\s+/g, ' ').trim();
      return /添加.*FAQ|FAQ.*添加|추가.*질문|添加问题|添加問答|등록.*FAQ/i.test(t) && t.length < 40;
    });
    hit?.click();
  });
  await page.waitForTimeout(400);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('audit-japan');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
if (!page) {
  console.error('NO NOL PAGE');
  process.exit(2);
}
await page.bringToFront();
page.setDefaultTimeout(25000);
page.setDefaultNavigationTimeout(60000);

const drafts = loadDrafts();
console.log('【将要】审计', drafts.length, '个草稿', DO_FIX ? '(FIX模式)' : '(只读)');

const results = [];
for (const d of drafts) {
  const row = { ...d, faq: null, cancel: null, actions: [] };
  try {
    console.log('\n---', d.prefix, d.label, d.id.slice(0, 8));
    // INTRO
    const introUrl = `https://tour.triple.partners/product-management/registration/introduction?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`;
    await page.goto(introUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1800);
    // leave dialog
    await page.getByText(/^消除$|^取消$/).first().click({ timeout: 800 }).catch(() => {});

    let intro = await readIntroState(page);
    // if page not found / wrong
    if (!intro.headline && page.url().includes('login')) {
      row.error = 'need login';
      results.push(row);
      continue;
    }

    if (DO_FIX && !intro.hasMidstopQ) {
      console.log('  【将要】补 FAQ mid-stop');
      await ensureFaqUi(page);
      const rb = await fillTransferFaqs(page);
      console.log('  【结果】FAQ', rb);
      row.actions.push({ faqFill: rb });
      // if still no fields, append Q/A into checkList as fallback? better leave note
      intro = await readIntroState(page);
      if (!intro.hasMidstopQ && intro.faqFieldCount === 0) {
        // try Formik-style: click 添加 under 常见问题
        await page.evaluate((qa) => {
          const setReact = (el, val) => {
            if (!el) return;
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            desc.set.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          // find empty question/answer pairs by placeholder
          const inputs = Array.from(document.querySelectorAll('input, textarea'));
          const qs = inputs.filter((e) => /问题|問題|질문|Question|FAQ/i.test(e.placeholder || '') || /question/i.test(e.name || ''));
          const as = inputs.filter((e) => /回答|답변|Answer/i.test(e.placeholder || '') || /answer/i.test(e.name || ''));
          if (qs[0] && as[0]) {
            setReact(qs[0], qa.q);
            setReact(as[0], qa.a);
          }
        }, { q: FAQ_MIDSTOP_Q, a: FAQ_MIDSTOP_A });
        intro = await readIntroState(page);
      }
      if (DO_FIX) {
        const sav = await clickSaveThen(page);
        row.actions.push({ introSave: sav });
        console.log('  【结果】介绍保存然后', sav);
        await sleep(1200);
      }
    }

    row.faq = {
      hasQ: intro.hasMidstopQ,
      hasA: intro.hasMidstopA,
      flightInUsage: intro.hasFlightInUsage,
      faqFields: intro.faqFieldCount,
      usage: intro.usagePreview,
      headline: intro.headline,
    };

    // REGS
    const regsUrl = `https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`;
    await page.goto(regsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1800);
    await page.getByText(/^消除$|^取消$/).first().click({ timeout: 800 }).catch(() => {});

    let regs = await readRegsState(page);
    if (DO_FIX && regs.hasField && !regs.exact) {
      console.log('  【将要】写特殊条款 exact');
      const rb = await fillSpecCancel(page);
      console.log('  【结果】cancel', rb);
      row.actions.push({ cancelFill: rb });
      regs = await readRegsState(page);
      const sav = await clickSaveThen(page);
      row.actions.push({ regsSave: sav });
      console.log('  【结果】法规保存然后', sav);
      await sleep(1000);
    }
    row.cancel = regs;

    const faqOk = row.faq.hasQ;
    const cancelOk = row.cancel.exact || row.cancel.hasNew;
    row.status = faqOk && cancelOk ? 'OK' : 'NEED';
    console.log('  【结果】', row.status, 'faq=', faqOk, 'cancel=', cancelOk, 'exact=', row.cancel.exact);
  } catch (e) {
    row.error = String(e.message || e).slice(0, 200);
    row.status = 'ERR';
    console.log('  ERR', row.error);
  }
  results.push(row);
}

// summary
const need = results.filter((r) => r.status === 'NEED');
const ok = results.filter((r) => r.status === 'OK');
const err = results.filter((r) => r.status === 'ERR');
console.log('\n========== SUMMARY ==========');
console.log('total', results.length, 'OK', ok.length, 'NEED', need.length, 'ERR', err.length);
for (const r of results) {
  const f = r.faq ? `faqQ=${r.faq.hasQ}` : 'faq=?';
  const c = r.cancel ? `cancelExact=${r.cancel.exact} new=${r.cancel.hasNew} empty=${r.cancel.empty}` : 'cancel=?';
  console.log(`[${r.status}] ${r.prefix} ${r.label} | ${f} | ${c}${r.error ? ' | ' + r.error : ''}`);
}
fs.writeFileSync(path.join(__dir, 'audit-japan-results.json'), JSON.stringify(results, null, 2));
console.log('wrote audit-japan-results.json');
process.exit(0);
