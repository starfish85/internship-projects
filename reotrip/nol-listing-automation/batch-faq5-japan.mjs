/**
 * Scope A continue: FAQ×5 full set for all Japan drafts from #7 onward (and any n<5).
 * Also fill SPEC_CANCEL if missing. Never 提交审核.
 *
 * Usage:
 *   node batch-faq5-japan.mjs              # all n>=7 needing FAQ
 *   node batch-faq5-japan.mjs all          # all N=56 with n<5
 *   node batch-faq5-japan.mjs fail         # audit FAIL only
 *   node batch-faq5-japan.mjs 7-20         # range by audit n
 *   node batch-faq5-japan.mjs 20-40
 */
import fs from 'node:fs';
import { connectNolPage } from './lib/cdp-session.mjs';
import {
  fillTransferFaqsFull,
  fillSpecCancel,
  SPEC_CANCEL_KO,
  FAQ_MIDSTOP_Q,
  normalizeRouteType,
} from './lib/transfer-audit-copy.mjs';
import { dismiss, regsUrl } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const audit = JSON.parse(fs.readFileSync(new URL('./japan-full-audit-results.json', import.meta.url), 'utf8'));
const ALL = audit.results || audit;

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

function parseArg(arg) {
  if (!arg || arg === 'from7') {
    return ALL.filter((r) => r.n >= 7 && r.id && r.id.length >= 36);
  }
  if (arg === 'all') return ALL.filter((r) => r.id && r.id.length >= 36);
  if (arg === 'fail') return ALL.filter((r) => r.status === 'FAIL' && r.id && r.id.length >= 36);
  const m = String(arg).match(/^(\d+)-(\d+)$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    return ALL.filter((r) => r.n >= a && r.n <= b && r.id && r.id.length >= 36);
  }
  // single n
  if (/^\d+$/.test(arg)) {
    return ALL.filter((r) => r.n === +arg);
  }
  return ALL.filter((r) => r.n >= 7);
}

async function readFaq(page) {
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

async function fixCancelIfNeeded(page, id) {
  await page.goto(regsUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await dismiss(page);
  const before = await page.evaluate((exact) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    const v = (ta?.value || '').trim();
    return { exact: v === exact, hasNew: v.includes('예약 확정 후 취소'), preview: v.slice(0, 36) };
  }, SPEC_CANCEL_KO);
  if (before.exact || before.hasNew) return { ok: true, mode: 'already', ...before };
  await fillSpecCancel(page);
  await page.locator('textarea[name=specificCancelPolicy]').fill(SPEC_CANCEL_KO).catch(() => {});
  // saveThen or temp on regs
  const st = page.getByRole('button', { name: /保存然后|保存然後/ });
  if ((await st.count()) && !(await st.first().isDisabled().catch(() => true))) {
    await st.first().click();
    await sleep(2800);
  } else {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((x) => {
          const t = (x.innerText || '').trim();
          return (t === '临时保存' || t === '臨時存儲') && !x.disabled;
        })
        ?.click();
    });
    await sleep(2200);
  }
  await page.goto(regsUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1800);
  const after = await page.evaluate((exact) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    const v = (ta?.value || '').trim();
    return { exact: v === exact, hasNew: v.includes('예약 확정 후 취소'), preview: v.slice(0, 36) };
  }, SPEC_CANCEL_KO);
  return { ok: after.exact || after.hasNew, mode: 'filled', ...after };
}

const arg = process.argv[2] || 'from7';
let jobs = parseArg(arg);
// prefer known-good ids; drop placeholder shorts
jobs = jobs.filter((j) => j.id && j.id.length === 36);

console.log('【本轮验收·三句】');
console.log('1) 定位：文案/role 点「添加问答」+ fill，禁止坐标');
console.log('2) 选中：reload 后 FAQ n≥5 + mid-stop；cancel exact');
console.log('3) 门禁：只点 保存然后 落 FAQ；永不提交审核');
console.log(`【将要】FAQ×5 batch arg=${arg} count=${jobs.length}`);

async function connect() {
  return connectNolPage({
    selfHint: 'batch-faq5',
    killPeers: true,
    forceViewport: true,
    viewport: { width: 1440, height: 900 },
  });
}

let { page } = await connect();

const results = [];
const t0 = Date.now();
for (const j of jobs) {
  const label = `#${String(j.n).padStart(2, '0')} ${j.name}`;
  const rt = normalizeRouteType(j.routeType || 'hotel_attraction');
  console.log(`\n======== ${label} (${j.id.slice(0, 8)}) rt=${rt} ========`);
  try {
    // recover crashed tab
    try {
      await page.evaluate(() => 1);
    } catch {
      console.log('【将要】重连 CDP（Target crashed）');
      ({ page } = await connect());
    }
    await dismiss(page);
    await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2200);
    await dismiss(page);
    const body = await page.evaluate(() => (document.body.innerText || '').slice(0, 100));
    if (/找不到页面|아이코|404|不存在/.test(body)) {
      console.log('【结果】SKIP 404');
      results.push({ n: j.n, name: j.name, id: j.id, status: 'SKIP_404' });
      continue;
    }

    let faq = await readFaq(page);
    console.log('【读回】FAQ before', faq.n, faq.mid, faq.ok);
    if (!faq.ok) {
      console.log('【将要】fillTransferFaqsFull + 保存然后');
      const fill = await fillTransferFaqsFull(page, rt, { force: faq.n > 0 && faq.n < 5, save: true });
      console.log('【读回】fill', fill.mode, fill.n, fill.saveMode, fill.ok);
      if (fill.saveMode === 'saveThen-disabled' || !fill.ok) {
        // one more try: wait and force saveThen click path already inside lib
        console.log('【结果】FAQ fill need recheck');
      }
      await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(2200);
      faq = await readFaq(page);
      // if still fail and save was disabled, try manual saveThen wait once more
      if (!faq.ok) {
        console.log('【将要】retry fill+saveThen');
        await fillTransferFaqsFull(page, rt, { force: true, save: true });
        await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(2200);
        faq = await readFaq(page);
      }
    }
    console.log('【结果】FAQ', faq.ok ? 'PASS' : 'FAIL', `n=${faq.n}`);

    let cancel = { ok: true, mode: 'skip' };
    // fix cancel for FAIL products or if known false
    if (j.status === 'FAIL' || j.checks?.cancelOk === false || j.checks?.cancelExact === false) {
      console.log('【将要】特殊条款');
      cancel = await fixCancelIfNeeded(page, j.id);
      console.log('【结果】cancel', cancel.ok ? 'PASS' : 'FAIL', cancel.mode);
    }

    results.push({
      n: j.n,
      name: j.name,
      id: j.id,
      rt,
      faqOk: faq.ok,
      faqN: faq.n,
      cancelOk: cancel.ok,
      status: faq.ok && cancel.ok ? 'PASS' : 'NEED',
    });
  } catch (e) {
    console.log('ERR', label, e.message?.slice(0, 150));
    results.push({ n: j.n, name: j.name, id: j.id, status: 'ERR', err: String(e.message).slice(0, 150) });
  }

  // progress heartbeat every product (~skill 2min)
  const elapsed = Math.round((Date.now() - t0) / 1000);
  const done = results.length;
  const pass = results.filter((r) => r.status === 'PASS' || r.faqOk).length;
  console.log(`【进度】${done}/${jobs.length} elapsed=${elapsed}s pass~=${pass}`);
}

const outPath = new URL('./batch-faq5-japan-results.json', import.meta.url);
fs.writeFileSync(outPath, JSON.stringify({ arg, at: new Date().toISOString(), results }, null, 2));
console.log('\nSUMMARY', outPath.pathname);
const summary = {
  total: results.length,
  pass: results.filter((r) => r.status === 'PASS').length,
  need: results.filter((r) => r.status === 'NEED').length,
  skip404: results.filter((r) => r.status === 'SKIP_404').length,
  err: results.filter((r) => r.status === 'ERR').length,
  needList: results.filter((r) => r.status === 'NEED' || r.status === 'ERR' || r.status === 'SKIP_404').map((r) => ({
    n: r.n,
    name: r.name,
    faqN: r.faqN,
    status: r.status,
  })),
};
console.log(JSON.stringify(summary, null, 2));
console.log('未点提交审核');
process.exit(summary.need + summary.err + summary.skip404 > 0 ? 2 : 0);
