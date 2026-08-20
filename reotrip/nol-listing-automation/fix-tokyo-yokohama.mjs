/**
 * 东京市区-横滨港 draft 9f7d6122…
 * Excel HKD: 7=112 / 10=134 · hub resv · times 07:00–21:30×30 · no dups
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import {
  dismiss,
  optionUrl,
  regsUrl,
  fixOptionPrice,
  fixOptionTimes,
  fixReservation,
  RESV_HUB,
  JAPAN_TIMES,
} from './lib/japan-audit-fix.mjs';
import { SPEC_CANCEL_KO, FAQ_MIDSTOP_Q, fillTransferFaqs, fillSpecCancel } from './lib/transfer-audit-copy.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = '9f7d6122-c413-42be-89a8-d08ec789d32c';
const LABEL = '东京市区-横滨港';
const PRICES = [112, 134, 112, 134]; // 7go 10go 7rtn 10rtn

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

async function listTitles(page) {
  return page.evaluate(() => {
    function isTitle(t) {
      return (
        t.length > 15 &&
        t.length < 90 &&
        /편도 이동 \(\d+인승 차량\)$/.test(t) &&
        !/도착|최대|수하물/.test(t)
      );
    }
    const titles = Array.from(document.querySelectorAll('div'))
      .filter((d) => d.children.length === 0)
      .map((d) => (d.innerText || '').trim())
      .filter(isTitle);
    const out = [];
    for (const t of titles) if (out[out.length - 1] !== t) out.push(t);
    return out;
  });
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

async function auditOpts(page) {
  await page.goto(optionUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  await dismiss(page);
  const titles = await listTitles(page);
  const n = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
  console.log('【读回】titles', n, titles);
  const opts = [];
  for (let i = 0; i < n; i++) {
    await page.goto(optionUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1800);
    await dismiss(page);
    await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(i).click();
    await sleep(2200);
    for (let w = 0; w < 25; w++) {
      if (await page.locator('#name').inputValue().catch(() => '')) break;
      await sleep(200);
    }
    const name = await page.locator('#name').inputValue();
    const body = await page.evaluate(() => document.body.innerText || '');
    const prices = parsePrices(body);
    const idx = body.indexOf('时间段') >= 0 ? body.indexOf('时间段') : body.indexOf('時間段');
    const slice = idx >= 0 ? body.slice(idx, idx + 500) : '';
    const times = slice.match(/\d{2}:\d{2}/g) || [];
    const timesOk = times.length >= 28 && times[0] === '07:00' && times[times.length - 1] === '21:30';
    const exp = /10인승/.test(name) ? '134' : '112';
    const priceOk = prices.includes(exp);
    console.log(
      `【读回】opt${i} P=${prices.join('|') || '∅'} exp=${exp} ${priceOk ? 'P✓' : 'P✗'} T=${times.length}/${times[0]}-${times[times.length - 1]} ${timesOk ? 'T✓' : 'T✗'} ${name.slice(0, 40)}`,
    );
    opts.push({ i, name, prices, exp, priceOk, timesOk, tcount: times.length });
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(200);
    await page.getByText(/^消除$/).first().click({ timeout: 400 }).catch(() => {});
  }
  return { titles, n, opts };
}

async function deleteLastDup(page) {
  // reuse icon-delete path
  await page.goto(optionUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await page.getByText(/^编辑列表$|^編輯列表$/).first().click();
  await sleep(1200);
  const n = await page.evaluate(() => {
    document.querySelectorAll('button[data-del-icon]').forEach((b) => b.removeAttribute('data-del-icon'));
    const icons = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const cs = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return { b, bg: cs.backgroundImage || '', y: r.y, w: r.width };
      })
      .filter((x) => /icon-delete|delete\.svg/i.test(x.bg) && x.w > 0)
      .sort((a, b) => a.y - b.y);
    icons.forEach((x, i) => x.b.setAttribute('data-del-icon', String(i)));
    return icons.length;
  });
  if (n <= 4) return { deleted: false, n };
  const loc = page.locator(`button[data-del-icon="${n - 1}"]`);
  await loc.scrollIntoViewIfNeeded();
  await loc.click();
  await sleep(2000);
  const done = page.getByText(/^已編輯$|^已编辑$/);
  if (await done.count()) await done.first().click().catch(() => {});
  await sleep(800);
  return { deleted: true, n };
}

const { page } = await connectNolPage({
  selfHint: 'fix-tky-yoko',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

console.log(`【将要】验收+修复 ${LABEL} ${ID.slice(0, 8)}`);
let audit = await auditOpts(page);

// delete dups until 4
let guard = 0;
while (audit.n > 4 && guard < 8) {
  console.log('【将要】删重复 当前', audit.n);
  const d = await deleteLastDup(page);
  console.log('【读回】delete', d);
  audit = await auditOpts(page);
  guard++;
}

// fix prices
for (const o of audit.opts) {
  if (!o.priceOk) {
    console.log(`【将要】改价 opt${o.i} → ${o.exp}`);
    const r = await fixOptionPrice(page, ID, o.i, o.exp);
    console.log('【结果】改价', r);
  }
}

// fix times
for (const o of audit.opts) {
  if (!o.timesOk) {
    console.log(`【将要】改时段 opt${o.i}`);
    try {
      const r = await fixOptionTimes(page, ID, o.i);
      console.log('【结果】时段', r);
    } catch (e) {
      console.log('【结果】时段 FAIL', e.message?.slice(0, 200));
    }
  }
}

// resv hub
console.log('【将要】预约 RESV_HUB');
try {
  const r = await fixReservation(page, ID, RESV_HUB);
  console.log('【结果】预约', r);
} catch (e) {
  console.log('【结果】预约 err', e.message?.slice(0, 150));
}

// FAQ
console.log('【将要】检查/补 FAQ mid-stop');
await page.goto(introUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2200);
const faqBefore = await page.evaluate(() => {
  const pairs = [];
  for (let i = 0; i < 10; i++) {
    const q = document.querySelector(`input[name="faqs.${i}.question"],textarea[name="faqs.${i}.question"]`);
    const a = document.querySelector(`textarea[name="faqs.${i}.answer"]`);
    if (!q && !a) continue;
    pairs.push({ i, q: (q?.value || '').trim(), a: (a?.value || '').trim().slice(0, 60) });
  }
  return {
    pairs,
    mid: pairs.some((p) => /중간에 다른 장소/.test(p.q)),
  };
});
console.log('【读回】FAQ', faqBefore);
if (!faqBefore.mid) {
  await fillTransferFaqs(page).catch((e) => console.log('fill FAQ err', e.message));
  // save then if enabled
  const st = page.getByRole('button', { name: /保存然后|保存然後/ });
  if ((await st.count()) && !(await st.first().isDisabled())) {
    await st.first().click();
    await sleep(2500);
  } else {
    // temp save page
    await page.getByRole('button', { name: /^临时保存$|^臨時存儲$/ }).first().click().catch(() => {});
    await sleep(2000);
  }
}

// cancel
console.log('【将要】检查/补 SPEC_CANCEL');
await page.goto(regsUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2200);
const cancel = await page.evaluate((exact) => {
  const ta = document.querySelector('textarea[name=specificCancelPolicy]');
  const v = (ta?.value || '').trim();
  return { exact: v === exact, preview: v.slice(0, 50), len: v.length };
}, SPEC_CANCEL_KO);
console.log('【读回】cancel', cancel);
if (!cancel.exact) {
  await fillSpecCancel(page).catch((e) => console.log('fill cancel err', e.message));
  const st = page.getByRole('button', { name: /保存然后|保存然後/ });
  if ((await st.count()) && !(await st.first().isDisabled())) {
    await st.first().click();
    await sleep(2500);
  } else {
    await page.getByRole('button', { name: /^临时保存$|^臨時存儲$/ }).first().click().catch(() => {});
    await sleep(2000);
  }
}

// final audit
console.log('\n======== 终检 ========');
const final = await auditOpts(page);
const titlesOk = final.n === 4 && new Set(final.titles).size === 4;
const priceOk = final.opts.every((o) => o.priceOk);
const timesOk = final.opts.every((o) => o.timesOk);
console.log(
  titlesOk && priceOk && timesOk
    ? `【结果】PASS ${LABEL} opts=4 price+times`
    : `【结果】NEED ${LABEL} titlesOk=${titlesOk} priceOk=${priceOk} timesOk=${timesOk}`,
  final.opts.map((o) => ({ i: o.i, p: o.priceOk, t: o.timesOk })),
);
console.log('未点提交审核');
process.exit(titlesOk && priceOk && timesOk ? 0 : 2);
