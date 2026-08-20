/**
 * Batch scan Japan drafts (from .*-draft-id + audit json + excel queue):
 * - option count (修改选项)
 * - FAQ mid-stop
 * - SPEC_CANCEL exact
 * Writes batch-scan-japan-results.json
 * usage: node batch-scan-japan.mjs [--fix]  // --fix fills FAQ/cancel fails
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl, regsUrl } from './lib/japan-audit-fix.mjs';
import {
  SPEC_CANCEL_KO,
  FAQ_MIDSTOP_Q,
  fillTransferFaqs,
  fillSpecCancel,
} from './lib/transfer-audit-copy.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const doFix = process.argv.includes('--fix');

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

function collectIds() {
  const map = new Map(); // id -> labels[]
  const add = (id, label) => {
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    if (!map.has(id)) map.set(id, []);
    if (label && !map.get(id).includes(label)) map.get(id).push(label);
  };

  // .*-draft-id files
  for (const f of readdirSync(__dir)) {
    if (!f.startsWith('.') || !f.endsWith('-draft-id')) continue;
    const id = readFileSync(join(__dir, f), 'utf8').trim();
    const label = f.replace(/^\./, '').replace(/-draft-id$/, '');
    // skip known China-only prefixes
    if (/^(cn|cnh|cnr|cot|csk|csp|cty|cye|cho|cgp|cfu|hsz|pr|popland|huangpu)/.test(label)) {
      // some c* are China — skip China city prefixes
      if (/^(cn|cnh|cnr|cot|csk|csp|cty|cye|cho|cgp|hsz|pr|popland|huangpu)/.test(label)) {
        // still include cfu (CTS) etc. — actually cfu is Japan Hokkaido
        // skip only clear China
        if (/^(cn|cnh|cnr|cot|csk|csp|cty|cye|cho|cgp|hsz|pr|popland|huangpu)/.test(label) && !/^(cfu)$/.test(label)) {
          // re-check: cn-bootstrap might be China. Skip cn*, cnh, cnr, cot, csk, csp, cty, cye, cho, cgp, hsz, pr, popland, huangpu
          if (!/^(cfu)$/.test(label)) {
            // too aggressive on c* - cfu is Japan. Skip list:
            const china = new Set([
              'cn',
              'cnh',
              'cnr',
              'cot',
              'csk',
              'csp',
              'cty',
              'cye',
              'cho',
              'cgp',
              'hsz',
              'pr',
              'popland',
              'huangpu',
            ]);
            if (china.has(label)) continue;
          }
        }
      }
    }
    const chinaSkip = new Set([
      'cn',
      'cnh',
      'cnr',
      'cot',
      'csk',
      'csp',
      'cty',
      'cye',
      'cho',
      'cgp',
      'hsz',
      'pr',
      'popland',
      'huangpu',
      'huangpu-cruise',
    ]);
    if (chinaSkip.has(label)) continue;
    add(id, label);
  }

  // audit-japan-results
  try {
    const audit = JSON.parse(readFileSync(join(__dir, 'audit-japan-results.json'), 'utf8'));
    for (const x of audit) add(x.id, x.label || x.prefix);
  } catch {}

  // japan-work-queue
  try {
    const q = JSON.parse(readFileSync(join(__dir, 'japan-work-queue.json'), 'utf8'));
    for (const x of q) add(x.id, x.cn || x.key);
  } catch {}

  // known excel 8
  const excel8 = [
    ['b6e560d4-d4d3-4726-b08c-f5623499895a', 'HND'],
    ['60557c54-6c11-4b0e-9e04-df85c0d3e78b', 'NRT'],
    ['7c220325-8783-4f58-a1dc-5fbfc4137a5e', 'KIX'],
    ['88b3861b-e907-487b-bacb-5abcfc1a7988', 'ITM'],
    ['09714a30-dc94-4378-a238-ed8a37a5d234', '东京站'],
    ['0de15895-41de-48f8-8653-5c47a947c301', '东京港'],
    ['c36c1517-89cc-4524-bfdb-fce8df1c2e5c', '大阪站'],
    ['9f7d6122-c413-42be-89a8-d08ec789d32c', '东京-横滨港'],
    ['885023cc-f518-433f-916c-ca2a056df00f', '横滨市区-横滨港'],
  ];
  for (const [id, lab] of excel8) add(id, lab);

  return [...map.entries()].map(([id, labels]) => ({ id, label: labels.join('|') }));
}

async function saveThenOrTemp(page) {
  const st = page.getByRole('button', { name: /保存然后|保存然後/ });
  if ((await st.count()) && !(await st.first().isDisabled().catch(() => true))) {
    await st.first().click();
    await sleep(2600);
    return 'saveThen';
  }
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '临时保存' || t === '臨時存儲') && !x.disabled;
    });
    b?.click();
  });
  await sleep(2000);
  return 'temp';
}

async function scanOne(page, { id, label }) {
  const out = { id, label, opts: null, faq: false, cancelExact: false, cancelNew: false, dead: false, fixed: [] };
  // options
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
  await sleep(1800);
  await dismiss(page);
  let body = await page.evaluate(() => (document.body?.innerText || '').slice(0, 100));
  if (/找不到页面|아이코/.test(body)) {
    out.dead = true;
    return out;
  }
  out.opts = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();

  // FAQ
  await page.goto(introUrl(id), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1800);
  await dismiss(page);
  body = await page.evaluate(() => (document.body?.innerText || '').slice(0, 80));
  if (/找不到页面|아이코/.test(body)) {
    out.dead = true;
    return out;
  }
  let faq = await page.evaluate((q) => {
    for (let i = 0; i < 12; i++) {
      const el = document.querySelector(`input[name="faqs.${i}.question"],textarea[name="faqs.${i}.question"]`);
      if (el && (el.value || '').includes(q.slice(0, 10))) return true;
    }
    return false;
  }, FAQ_MIDSTOP_Q);
  out.faq = faq;
  if (doFix && !faq) {
    console.log('  【将要】fix FAQ', label);
    await fillTransferFaqs(page).catch(() => {});
    // ensure add if still missing
    faq = await page.evaluate((q) => {
      for (let i = 0; i < 12; i++) {
        const el = document.querySelector(`input[name="faqs.${i}.question"]`);
        if (el && (el.value || '').includes(q.slice(0, 10))) return true;
      }
      return false;
    }, FAQ_MIDSTOP_Q);
    if (!faq) {
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button,a'))
          .find((e) => /添加问答|添加問答/.test((e.innerText || '').trim()))
          ?.click();
      });
      await sleep(500);
      await fillTransferFaqs(page).catch(() => {});
    }
    await saveThenOrTemp(page);
    await page.goto(introUrl(id), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1600);
    out.faq = await page.evaluate((q) => {
      for (let i = 0; i < 12; i++) {
        const el = document.querySelector(`input[name="faqs.${i}.question"]`);
        if (el && (el.value || '').includes(q.slice(0, 10))) return true;
      }
      return false;
    }, FAQ_MIDSTOP_Q);
    if (out.faq) out.fixed.push('faq');
  }

  // cancel
  await page.goto(regsUrl(id), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(1800);
  await dismiss(page);
  let cancel = await page.evaluate((exact) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    const v = (ta?.value || '').trim();
    return {
      exact: v === exact,
      hasNew: v.includes('예약 확정 후 취소') && v.includes('협력사 확인'),
      empty: !v,
      preview: v.slice(0, 36),
    };
  }, SPEC_CANCEL_KO);
  out.cancelExact = cancel.exact;
  out.cancelNew = cancel.hasNew;
  out.cancelPreview = cancel.preview;
  if (doFix && !cancel.exact && !cancel.hasNew) {
    console.log('  【将要】fix cancel', label);
    await fillSpecCancel(page).catch(() => {});
    await page.locator('textarea[name=specificCancelPolicy]').fill(SPEC_CANCEL_KO).catch(() => {});
    await page.locator('textarea[name=specificCancelPolicy]').press('Tab').catch(() => {});
    await saveThenOrTemp(page);
    await page.goto(regsUrl(id), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1600);
    cancel = await page.evaluate((exact) => {
      const ta = document.querySelector('textarea[name=specificCancelPolicy]');
      const v = (ta?.value || '').trim();
      return {
        exact: v === exact,
        hasNew: v.includes('예약 확정 후 취소') && v.includes('협력사 확인'),
        preview: v.slice(0, 36),
      };
    }, SPEC_CANCEL_KO);
    out.cancelExact = cancel.exact;
    out.cancelNew = cancel.hasNew;
    out.cancelPreview = cancel.preview;
    if (out.cancelExact || out.cancelNew) out.fixed.push('cancel');
  }

  out.pass = out.faq && (out.cancelExact || out.cancelNew) && !out.dead;
  // option count warn only (attractions may be 4, PEK-like 2, some more)
  out.optsWarn = out.opts != null && (out.opts === 0 || out.opts > 8);
  return out;
}

const jobs = collectIds();
console.log('【读回】待扫草稿数', jobs.length);
jobs.forEach((j, i) => console.log(`  ${i + 1}. ${j.label} ${j.id.slice(0, 8)}`));

const { page } = await connectNolPage({
  selfHint: 'batch-scan-jp',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const results = [];
for (let i = 0; i < jobs.length; i++) {
  const j = jobs[i];
  console.log(`\n======== [${i + 1}/${jobs.length}] ${j.label} ========`);
  try {
    const r = await scanOne(page, j);
    const mark = r.dead
      ? 'DEAD'
      : r.pass
        ? r.optsWarn
          ? 'PASS*'
          : 'PASS'
        : 'FAIL';
    console.log(
      `【结果】${mark} opts=${r.opts} faq=${r.faq} cancel=${r.cancelExact || r.cancelNew} fixed=${r.fixed.join(',') || '-'}`,
    );
    results.push(r);
  } catch (e) {
    console.log('【结果】ERR', e.message?.slice(0, 120));
    results.push({ ...j, err: String(e.message).slice(0, 200), pass: false });
  }
  // progress file
  if ((i + 1) % 5 === 0) {
    writeFileSync(join(__dir, 'batch-scan-japan-results.json'), JSON.stringify(results, null, 2));
  }
}

writeFileSync(join(__dir, 'batch-scan-japan-results.json'), JSON.stringify(results, null, 2));
const pass = results.filter((r) => r.pass);
const fail = results.filter((r) => !r.pass && !r.dead && !r.err);
const dead = results.filter((r) => r.dead);
const err = results.filter((r) => r.err);
const optsWarn = results.filter((r) => r.optsWarn);

console.log('\n======== SUMMARY ========');
console.log(`total=${results.length} pass=${pass.length} fail=${fail.length} dead=${dead.length} err=${err.length} optsWarn=${optsWarn.length}`);
if (fail.length) {
  console.log('FAIL:');
  fail.forEach((r) =>
    console.log(`  - ${r.label} ${r.id.slice(0, 8)} faq=${r.faq} cancelExact=${r.cancelExact} cancelNew=${r.cancelNew} opts=${r.opts}`),
  );
}
if (optsWarn.length) {
  console.log('OPTS_WARN:');
  optsWarn.forEach((r) => console.log(`  - ${r.label} opts=${r.opts}`));
}
console.log('未点提交审核');
console.log('wrote batch-scan-japan-results.json');
process.exit(fail.length || err.length ? 2 : 0);
