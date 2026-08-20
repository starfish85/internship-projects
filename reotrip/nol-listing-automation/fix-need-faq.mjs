/**
 * Fill mid-stop FAQ for audit NEED products; verify cancel exact.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, regsUrl } from './lib/japan-audit-fix.mjs';
import {
  SPEC_CANCEL_KO,
  FAQ_MIDSTOP_Q,
  fillTransferFaqs,
  fillSpecCancel,
} from './lib/transfer-audit-copy.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const JOBS = [
  { id: 'd4d8e295-0e96-4428-9dd3-b213b258050c', label: '东京-羽田HND(alt)' },
  { id: '677cd988-2727-4128-a0ab-57e73048d598', label: '大阪-USJ/铃鹿' },
  { id: '379afe4b-59e6-450e-beb7-17a5f238990b', label: '羽田-迪士尼' },
  { id: 'e8905e3c-69ae-4ef8-81fc-d5d369260e1d', label: '成田-迪士尼' },
  { id: '7b52009f-8d90-4ec5-a087-34ae960dda77', label: '札幌-留寿都' },
];

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
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

async function readFaq(page) {
  return page.evaluate((q) => {
    const pairs = [];
    for (let i = 0; i < 10; i++) {
      const qi = document.querySelector(`input[name="faqs.${i}.question"]`);
      const ai = document.querySelector(`textarea[name="faqs.${i}.answer"]`);
      if (!qi && !ai) continue;
      pairs.push({ i, q: (qi?.value || '').trim(), a: (ai?.value || '').trim().slice(0, 40) });
    }
    return { n: pairs.length, mid: pairs.some((p) => p.q.includes(q.slice(0, 10))), pairs };
  }, FAQ_MIDSTOP_Q);
}

const { page } = await connectNolPage({
  selfHint: 'fix-need-faq',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const results = [];
for (const j of JOBS) {
  console.log(`\n======== ${j.label} ${j.id.slice(0, 8)} ========`);
  try {
    await dismiss(page);
    await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2500);
    await dismiss(page);
    // detect dead page
    const body = await page.evaluate(() => (document.body.innerText || '').slice(0, 80));
    if (/找不到页面|아이코/.test(body)) {
      console.log('【结果】SKIP 页面不存在');
      results.push({ ...j, status: 'SKIP_404' });
      continue;
    }
    let faq = await readFaq(page);
    console.log('【读回】FAQ before', faq.mid, faq.n);
    if (!faq.mid) {
      console.log('【将要】fillTransferFaqs');
      const r = await fillTransferFaqs(page);
      console.log('【读回】fill', r);
      if (!r.ok) {
        await page.evaluate(() => {
          const hit = Array.from(document.querySelectorAll('button,a')).find((e) =>
            /添加问答|添加問答/.test((e.innerText || '').trim()),
          );
          hit?.click();
        });
        await sleep(600);
        await fillTransferFaqs(page);
      }
      await saveThenOrTemp(page);
      await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(2200);
      faq = await readFaq(page);
    }
    console.log('【读回】FAQ after', faq.mid);

    // cancel check + fix
    await page.goto(regsUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2200);
    let cancel = await page.evaluate((exact) => {
      const ta = document.querySelector('textarea[name=specificCancelPolicy]');
      const v = (ta?.value || '').trim();
      return { exact: v === exact, hasNew: v.includes('예약 확정 후 취소'), preview: v.slice(0, 40) };
    }, SPEC_CANCEL_KO);
    console.log('【读回】cancel', cancel);
    if (!cancel.exact && !cancel.hasNew) {
      console.log('【将要】fillSpecCancel');
      await fillSpecCancel(page);
      await page.locator('textarea[name=specificCancelPolicy]').fill(SPEC_CANCEL_KO);
      await page.locator('textarea[name=specificCancelPolicy]').press('Tab');
      await saveThenOrTemp(page);
      await page.goto(regsUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(2000);
      cancel = await page.evaluate((exact) => {
        const ta = document.querySelector('textarea[name=specificCancelPolicy]');
        const v = (ta?.value || '').trim();
        return { exact: v === exact, hasNew: v.includes('예약 확정 후 취소'), preview: v.slice(0, 40) };
      }, SPEC_CANCEL_KO);
      console.log('【读回】cancel after', cancel);
    }
    const pass = faq.mid && (cancel.exact || cancel.hasNew);
    console.log(pass ? `【结果】PASS ${j.label}` : `【结果】NEED ${j.label}`);
    results.push({ label: j.label, id: j.id, faq: faq.mid, cancel, pass });
  } catch (e) {
    console.log('ERR', j.label, e.message);
    results.push({ label: j.label, err: String(e.message).slice(0, 150) });
  }
}
console.log('\nSUMMARY', JSON.stringify(results, null, 2));
console.log('未点提交审核');
process.exit(results.some((r) => r.err || r.pass === false) ? 2 : 0);
