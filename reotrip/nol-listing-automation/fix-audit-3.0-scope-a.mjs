/**
 * Scope A live fix (2026-08-14):
 * 1) Tokyo port: Korean price-type names (ban 7seat go)
 * 2) Hub CSV prices: HND / NRT / KIX / ITM / 东京市区-横滨港
 * 3) FAQ×5 from #7 横滨港 onward (named batch first)
 * 4) Copy ban 교토역 on 铃鹿 / 大阪-京都 hotel_hotel
 * Never 提交审核. §43 text locate + DOM readback. tempSave→next.
 *
 * Usage:
 *   node fix-audit-3.0-scope-a.mjs              # all priority jobs
 *   node fix-audit-3.0-scope-a.mjs tokyo_port   # one key
 *   node fix-audit-3.0-scope-a.mjs hubs         # price-only hubs
 *   node fix-audit-3.0-scope-a.mjs faq7         # FAQ from #7 batch
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import {
  auditOptions,
  fixOptionPrice,
  dismiss,
  optionUrl,
  regsUrl,
} from './lib/japan-audit-fix.mjs';
import {
  SPEC_CANCEL_KO,
  FAQ_MIDSTOP_Q,
  fillTransferFaqsFull,
  fillSpecCancel,
  scanMustKnowBan,
  mustKnowMeetingLine,
} from './lib/transfer-audit-copy.mjs';
import fs from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

/** Priority jobs for Scope A */
const JOBS = {
  tokyo_port: {
    key: 'tokyo_port',
    id: '0de15895-0000-0000-0000-000000000000', // resolved below if needed
    idShort: '0de15895',
    label: '东京市区酒店-东京港',
    routeType: 'hotel_port',
    prices: { 7: 784, 10: 1176 },
    fixPt: true,
    fixFaq: true,
    fixCancel: true,
    fixCopy: false,
  },
  yoko: {
    key: 'yoko',
    idShort: '9f7d6122',
    label: '东京市区-横滨港',
    routeType: 'hotel_port',
    prices: { 7: 1264, 10: 1512 },
    fixPt: false,
    fixFaq: true,
    fixCancel: true,
    fixCopy: false,
  },
  hnd: {
    key: 'hnd',
    idShort: 'b6e560d4',
    label: '东京市区-羽田机场（HND）',
    routeType: 'hotel_airport',
    prices: { 7: 790, 10: 1185 },
    fixPt: false,
    fixFaq: true,
    fixCancel: true,
    fixCopy: false,
  },
  nrt: {
    key: 'nrt',
    idShort: '60557c54',
    label: '东京市区-成田机场(NRT)',
    routeType: 'hotel_airport',
    prices: { 7: 1264, 10: 1975 },
    fixPt: false,
    fixFaq: true,
    fixCancel: true,
    fixCopy: false,
  },
  kix: {
    key: 'kix',
    idShort: '7c220325',
    label: '大阪市区-关西机场(KIX)',
    routeType: 'hotel_airport',
    prices: { 7: 1117, 10: 1501 },
    fixPt: false,
    fixFaq: true,
    fixCancel: true,
    fixCopy: false,
  },
  itm: {
    key: 'itm',
    idShort: '88b3861b',
    label: '大阪市区-伊丹机场(ITM)',
    routeType: 'hotel_airport',
    prices: { 7: 869, 10: 1185 },
    fixPt: false,
    fixFaq: true,
    fixCancel: true,
    fixCopy: false,
  },
  harry: {
    key: 'harry',
    idShort: '9dcef924',
    label: '东京市区酒店-哈利波特',
    routeType: 'hotel_attraction',
    prices: null,
    fixPt: false,
    fixFaq: true,
    fixCancel: false,
    fixCopy: true,
  },
  skytree: {
    key: 'skytree',
    idShort: 'c765fa88',
    label: '东京市区酒店-晴空塔',
    routeType: 'hotel_attraction',
    prices: null,
    fixPt: false,
    fixFaq: true,
    fixCancel: false,
    fixCopy: true,
  },
  kyoto_st: {
    key: 'kyoto_st',
    idShort: '1653d003',
    label: '京都市区酒店-京都站',
    routeType: 'hotel_station',
    prices: null,
    fixPt: false,
    fixFaq: true,
    fixCancel: false,
    fixCopy: false,
  },
  suzuka: {
    key: 'suzuka',
    idShort: '4cef60c6',
    label: '京都市区酒店-铃鹿市区',
    routeType: 'hotel_hotel',
    prices: null,
    fixPt: false,
    fixFaq: true,
    fixCancel: false,
    fixCopy: true,
  },
  osaka_kyoto: {
    key: 'osaka_kyoto',
    idShort: '9cef6c16',
    label: '大阪市区酒店-京都市区酒店',
    routeType: 'hotel_hotel',
    prices: null,
    fixPt: false,
    fixFaq: true,
    fixCancel: false,
    fixCopy: true,
  },
  osaka_suzuka: {
    key: 'osaka_suzuka',
    idShort: '677cd988',
    label: '大阪市区酒店-铃鹿市区',
    routeType: 'hotel_hotel',
    prices: null,
    fixPt: false,
    fixFaq: true,
    fixCancel: false,
    fixCopy: true,
  },
};

// full UUIDs from japan-list-ids.json
const FULL_IDS = {
  '0de15895': '0de15895-41de-48f8-8653-5c47a947c301',
  '9f7d6122': '9f7d6122-c413-42be-89a8-d08ec789d32c',
  b6e560d4: 'b6e560d4-d4d3-4726-b08c-f5623499895a',
  '60557c54': '60557c54-6c11-4b0e-9e04-df85c0d3e78b',
  '7c220325': '7c220325-8783-4f58-a1dc-5fbfc4137a5e',
  '88b3861b': '88b3861b-e907-487b-bacb-5abcfc1a7988',
  '9dcef924': '9dcef924-c7d9-41ea-8fe0-27a31dfe1064',
  c765fa88: 'c765fa88-d2ff-48f1-a26f-37398bf1d6ec',
  '1653d003': '1653d003-b7ab-4056-9ec0-88870d305673',
  '4cef60c6': '4cef60c6-3d5a-4e65-9caa-134513e698e0',
  '9cef6c16': '9cef6c16-064d-4cff-be6d-9a6cc81e14eb',
  '677cd988': '677cd988-2727-4128-a0ab-57e73048d598',
};

async function resolveFullId(page, shortOrFull) {
  if (shortOrFull && shortOrFull.length >= 36) return shortOrFull;
  // try japan-list-ids.json
  try {
    const list = JSON.parse(fs.readFileSync(new URL('./japan-list-ids.json', import.meta.url), 'utf8'));
    const arr = Array.isArray(list) ? list : list.products || list.ids || Object.values(list).flat();
    const hit = arr.find((x) => {
      const id = typeof x === 'string' ? x : x.id || x.draftId || '';
      return id.startsWith(shortOrFull);
    });
    if (hit) return typeof hit === 'string' ? hit : hit.id || hit.draftId;
  } catch {
    /* ignore */
  }
  try {
    const list = JSON.parse(fs.readFileSync(new URL('./japan-full-audit-results.json', import.meta.url), 'utf8'));
    const arr = Array.isArray(list) ? list : list.results || [];
    const hit = arr.find((x) => (x.id || x.draft || '').startsWith(shortOrFull));
    if (hit) return hit.id || hit.draft;
  } catch {
    /* ignore */
  }
  return shortOrFull; // may fail if incomplete
}

async function saveThenOrTemp(page) {
  const st = page.getByRole('button', { name: /保存然后|保存然後/ });
  if ((await st.count()) && !(await st.first().isDisabled().catch(() => true))) {
    await st.first().click();
    await sleep(2800);
    return 'saveThen';
  }
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '临时保存' || t === '臨時存儲') && !x.disabled;
    });
    b?.click();
  });
  await sleep(2200);
  return 'temp';
}

async function tempSaveNext(page) {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { el: b, t: (b.innerText || '').trim(), d: b.disabled, w: r.width };
      })
      .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d && x.w > 40)
      .sort((a, b) => a.w - b.w);
    btns[0]?.el.click();
  });
  await sleep(2200);
  for (let i = 0; i < 12; i++) {
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
        .map((b) => {
          const r = b.getBoundingClientRect();
          return { el: b, t: (b.innerText || '').trim(), d: b.disabled, w: r.width };
        })
        .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d && x.w > 80)
        .sort((a, b) => b.w - a.w);
      if (btns[0]) {
        btns[0].el.click();
        return true;
      }
      return false;
    });
    if (ok) break;
    await sleep(500);
  }
  await sleep(1800);
  await dismiss(page);
}

async function readFaqState(page) {
  return page.evaluate((q) => {
    let n = 0;
    let mid = false;
    const qs = [];
    for (let i = 0; i < 12; i++) {
      const qi = document.querySelector(`input[name="faqs.${i}.question"]`);
      const ai = document.querySelector(`textarea[name="faqs.${i}.answer"]`);
      if (qi && (qi.value || '').trim() && ai && (ai.value || '').trim()) {
        n++;
        qs.push((qi.value || '').slice(0, 24));
        if ((qi.value || '').includes(q.slice(0, 10))) mid = true;
      }
    }
    return { n, mid, qs, ok: n >= 5 && mid };
  }, FAQ_MIDSTOP_Q);
}

/**
 * Fix English price-type names — playbook §5.B
 * 选择价格类型 → 其他价格类型 → placeholder 销售渠道 / 滿 19 → 完成 → 临时保存→下一个
 */
async function fixPriceTypeKorean(page, draftId, optionIndex) {
  const list = optionUrl(draftId);
  await dismiss(page);
  await page.goto(list, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(optionIndex).click();
  await sleep(2200);
  for (let w = 0; w < 25; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await sleep(200);
  }
  const optName = await page.locator('#name').inputValue().catch(() => '');
  const seat = /10인승|10座|10seat/i.test(optName) ? 10 : 7;
  let dir = '가는';
  if (/출발\s*→/.test(optName)) {
    const left = optName.split('→')[0] || '';
    if (!/호텔|시내/.test(left)) dir = '오는';
  }
  if (/오는|返程|return|rtn/i.test(optName)) dir = '오는';
  const ptName = `${seat}인승 ${dir}`;
  const ptDesc = `${seat}인승 차량`;
  console.log(`  【将要】价格类型韩文 option${optionIndex} → ${ptName}`, optName.slice(0, 50));

  await page.getByRole('button', { name: /选择价格类型|選擇價格類型/ }).first().click();
  await sleep(1000);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button,div,span,li'))
      .find((e) => {
        const t = (e.innerText || '').trim();
        return /其他价格类型|其他價格類型|기타 가격/.test(t) && t.length < 40;
      })
      ?.click();
  });
  await sleep(1200);

  const before = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('input')).find((i) =>
      /销售渠道|銷售渠道/.test(i.placeholder || ''),
    );
    return el?.value || '';
  });
  console.log('  【读回】pt name before', before);
  if (before === ptName) {
    await page.keyboard.press('Escape').catch(() => {});
    await tempSaveNext(page);
    return { ptName, before, after: before, ok: true, mode: 'already' };
  }

  // fill by placeholder（简繁混写）
  for (const [phs, val] of [
    [['销售渠道', '銷售渠道'], ptName],
    [['滿 19', '满 19'], ptDesc],
  ]) {
    for (const p of phs) {
      const loc = page.locator(`input[placeholder*="${p}"]`);
      if (!(await loc.count())) continue;
      await loc.first().fill('');
      await loc.first().fill(val);
      break;
    }
  }
  const filled = await page.evaluate(() => {
    const nameEl = Array.from(document.querySelectorAll('input')).find((i) =>
      /销售渠道|銷售渠道/.test(i.placeholder || ''),
    );
    const descEl = Array.from(document.querySelectorAll('input')).find((i) =>
      /滿 19|满 19/.test(i.placeholder || ''),
    );
    return { name: nameEl?.value || '', desc: descEl?.value || '' };
  });
  console.log('  【读回】pt fill', filled);

  await page.locator('[aria-labelledby="ETC-required-label"]').click({ force: true }).catch(() => {});
  await page.locator('[aria-labelledby="ETC-representative-label"]').click({ force: true }).catch(() => {});
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => {
        const t = (x.innerText || '').trim();
        return t === '完成' || t === '완료';
      })
      ?.click();
  });
  await sleep(1000);
  if (optName) await page.locator('#name').fill(optName).catch(() => {});
  await tempSaveNext(page);

  // verify stored
  await page.goto(list, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1800);
  await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(optionIndex).click();
  await sleep(2000);
  await page.getByRole('button', { name: /选择价格类型/ }).first().click();
  await sleep(800);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button,div,span'))
      .find((el) => /其他价格类型|기타/.test((el.innerText || '').trim()) && (el.innerText || '').trim().length < 50)
      ?.click();
  });
  await sleep(1000);
  const after = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('input')).find((i) =>
      /销售渠道|銷售渠道/.test(i.placeholder || ''),
    );
    return el?.value || '';
  });
  console.log('  【读回】pt after', after);
  await page.keyboard.press('Escape').catch(() => {});
  await dismiss(page);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => /下一个|下個/.test((x.innerText || '').trim()) && !x.disabled)
      ?.click();
  });
  await sleep(800);
  return { ptName, before, after, ok: after === ptName };
}

async function fixFaqFull(page, draftId, routeType) {
  console.log('  【将要】FAQ×5', routeType);
  await dismiss(page);
  await page.goto(introUrl(draftId), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss(page);
  const body = await page.evaluate(() => (document.body.innerText || '').slice(0, 100));
  if (/找不到页面|아이코|404/.test(body)) {
    return { ok: false, reason: '404' };
  }
  let before = await readFaqState(page);
  console.log('  【读回】FAQ before', before);
  if (before.ok) return { ok: true, mode: 'already', ...before };

  const r = await fillTransferFaqsFull(page, routeType, { force: before.n > 0 && before.n < 5 });
  console.log('  【读回】fill FAQ', r);
  const save = await saveThenOrTemp(page);
  await page.goto(introUrl(draftId), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const after = await readFaqState(page);
  console.log('  【读回】FAQ after', after, 'save=', save);
  return { ok: after.ok, before, after, fill: r };
}

async function fixCancel(page, draftId) {
  console.log('  【将要】特殊条款 exact');
  await page.goto(regsUrl(draftId), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  let cancel = await page.evaluate((exact) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    const v = (ta?.value || '').trim();
    return { exact: v === exact, hasNew: v.includes('예약 확정 후 취소'), preview: v.slice(0, 40) };
  }, SPEC_CANCEL_KO);
  console.log('  【读回】cancel before', cancel);
  if (cancel.exact || cancel.hasNew) return { ok: true, ...cancel, mode: 'already' };
  await fillSpecCancel(page);
  await page.locator('textarea[name=specificCancelPolicy]').fill(SPEC_CANCEL_KO).catch(() => {});
  await saveThenOrTemp(page);
  await page.goto(regsUrl(draftId), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  cancel = await page.evaluate((exact) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    const v = (ta?.value || '').trim();
    return { exact: v === exact, hasNew: v.includes('예약 확정 후 취소'), preview: v.slice(0, 40) };
  }, SPEC_CANCEL_KO);
  console.log('  【读回】cancel after', cancel);
  return { ok: cancel.exact || cancel.hasNew, ...cancel };
}

async function fixCopyBan(page, draftId, routeType) {
  console.log('  【将要】须知禁串站 scan+fix', routeType);
  await page.goto(introUrl(draftId), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const scan = await scanMustKnowBan(page, routeType);
  console.log('  【读回】scanMustKnow', scan);
  if (scan.ok) return { ok: true, mode: 'clean', scan };

  const meeting = mustKnowMeetingLine(routeType);
  // rewrite checklist items that contain banned tokens
  const fixed = await page.evaluate((banSrc) => {
    const re = new RegExp(banSrc, 'i');
    const changed = [];
    for (const el of document.querySelectorAll('textarea, input')) {
      const name = el.name || el.id || '';
      const v = el.value || '';
      if (!v || !re.test(v)) continue;
      if (!/checkList|checklist|usage|description|highlight|must|know|注意|알아야/i.test(name + (el.placeholder || '')))
        continue;
      // replace station-specific wrong phrases with hotel meeting line stub
      let nv = v
        .replace(/교토역[^\n。．]*/g, '호텔 주소와 픽업/샌딩 장소')
        .replace(/도쿄역[^\n。．]*/g, '호텔 주소와 픽업/샌딩 장소')
        .replace(/오사카역[^\n。．]*/g, '호텔 주소와 픽업/샌딩 장소')
        .replace(/역 출구[^\n。．]*/g, '픽업/샌딩 장소')
        .replace(/항공편[^\n。．]{0,40}/g, '이용 시간')
        .replace(/공항 픽업[^\n。．]*/g, '호텔 픽업');
      if (nv !== v) {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        desc.set.call(el, nv);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        changed.push({ name, from: v.slice(0, 60), to: nv.slice(0, 60) });
      }
    }
    return changed;
  }, meeting.ban?.source || '교토역');
  console.log('  【读回】copy rewritten', fixed);

  // also ensure one checklist line is meeting line if still banned in body
  if (fixed.length) {
    await saveThenOrTemp(page);
  }
  await page.goto(introUrl(draftId), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  const scan2 = await scanMustKnowBan(page, routeType);
  console.log('  【读回】scan after', scan2);
  return { ok: scan2.ok, fixed, scan2 };
}

async function fixPrices(page, draftId, prices) {
  if (!prices) return { ok: true, mode: 'skip' };
  console.log('  【将要】CSV 改价', prices);
  let opts = await auditOptions(page, draftId);
  const results = [];
  for (const o of opts) {
    const exp = /10인승|10座|10seat/i.test(o.name) ? prices[10] : prices[7];
    const cur = String(o.price || '').replace(/,/g, '');
    console.log(`  opt${o.i} p=${cur} exp=${exp} ${o.name.slice(0, 40)}`);
    if (cur === String(exp)) {
      results.push({ i: o.i, ok: true, mode: 'match', cur, exp });
      continue;
    }
    const rr = await fixOptionPrice(page, draftId, o.i, exp);
    results.push({ i: o.i, ...rr, exp });
  }
  return { ok: results.every((r) => r.ok || r.mode === 'match'), results };
}

// ---- main ----
const arg = process.argv[2] || 'all';
let keys;
if (arg === 'all') {
  keys = Object.keys(JOBS);
} else if (arg === 'hubs') {
  keys = ['yoko', 'hnd', 'nrt', 'kix', 'itm'];
} else if (arg === 'faq7') {
  keys = ['yoko', 'hnd', 'nrt', 'kix', 'itm', 'harry', 'skytree', 'kyoto_st', 'suzuka', 'osaka_kyoto', 'osaka_suzuka'];
} else if (arg === 'named') {
  keys = ['tokyo_port', 'yoko', 'hnd', 'nrt', 'kix', 'itm', 'harry', 'skytree', 'kyoto_st', 'suzuka', 'osaka_kyoto', 'osaka_suzuka'];
} else {
  keys = [arg];
}

console.log('【本轮验收标准·三句】');
console.log('1) 定位：只用文案/role/label/id，禁止 mouse.click 坐标（§43）');
console.log('2) 选中：点后读回 FAQ n≥5 / 价 日\\n价 / 价格类型韩文 / cancel exact（§51）');
console.log('3) 门禁：读回不达标禁止说已做好；临时保存→下一个；永不提交审核');
console.log('【将要】Scope A keys=', keys.join(','));

const { page } = await connectNolPage({
  selfHint: 'fix-audit-3.0',
  killPeers: true,
  forceViewport: false,
});

const results = [];
for (const key of keys) {
  const job = JOBS[key];
  if (!job) {
    console.log('unknown key', key);
    continue;
  }
  console.log(`\n======== ${job.label} (${key}) ========`);
  try {
    const id = await resolveFullId(page, FULL_IDS[job.idShort] || job.idShort);
    // try open intro to expand short id via URL if needed
    let fullId = id;
    if (id.length < 36) {
      // search japan-list-ids / audit results more carefully
      for (const f of ['japan-list-ids.json', 'japan-full-audit-results.json', 'japan-status-summary.json', 'japan-work-queue.json']) {
        try {
          const raw = fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8');
          const m = raw.match(new RegExp(`${job.idShort}[0-9a-f-]{28}`, 'i'));
          if (m) {
            fullId = m[0];
            break;
          }
        } catch {
          /* */
        }
      }
    }
    console.log('  id=', fullId);
    if (fullId.length < 36) {
      console.log('  【结果】FAIL no full UUID');
      results.push({ key, label: job.label, err: 'no full id' });
      continue;
    }

    const out = { key, label: job.label, id: fullId };

    if (job.fixFaq) {
      out.faq = await fixFaqFull(page, fullId, job.routeType);
      console.log('  【结果】FAQ', out.faq.ok ? 'PASS' : 'FAIL');
    }
    if (job.fixCancel) {
      out.cancel = await fixCancel(page, fullId);
      console.log('  【结果】cancel', out.cancel.ok ? 'PASS' : 'FAIL');
    }
    if (job.fixCopy) {
      out.copy = await fixCopyBan(page, fullId, job.routeType);
      console.log('  【结果】copy', out.copy.ok ? 'PASS' : 'NEED');
    }
    if (job.prices) {
      out.prices = await fixPrices(page, fullId, job.prices);
      console.log('  【结果】prices', out.prices.ok ? 'PASS' : 'FAIL');
    }
    if (job.fixPt) {
      const opts = await auditOptions(page, fullId);
      out.pt = [];
      for (const o of opts) {
        const rr = await fixPriceTypeKorean(page, fullId, o.i);
        out.pt.push(rr);
        console.log(`  【结果】pt${o.i}`, rr.ok ? 'PASS' : 'NEED', rr.ptName);
      }
    }

    results.push(out);
  } catch (e) {
    console.log('ERR', job.label, e.message);
    results.push({ key, label: job.label, err: String(e.message).slice(0, 200) });
  }
}

const outPath = new URL('./fix-audit-3.0-scope-a-results.json', import.meta.url);
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log('\nSUMMARY written', outPath.pathname);
console.log(JSON.stringify(results.map((r) => ({
  key: r.key,
  label: r.label,
  faq: r.faq?.ok,
  cancel: r.cancel?.ok,
  prices: r.prices?.ok,
  pt: r.pt?.map((x) => x.ok),
  copy: r.copy?.ok,
  err: r.err,
})), null, 2));
console.log('未点提交审核');
const bad = results.some((r) => r.err || r.faq?.ok === false || r.cancel?.ok === false || r.prices?.ok === false);
process.exit(bad ? 2 : 0);
