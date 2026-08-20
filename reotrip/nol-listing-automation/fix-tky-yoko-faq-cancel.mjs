/**
 * Fix FAQ mid-stop + SPEC_CANCEL for 东京市区-横滨港, with save readback.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, regsUrl } from './lib/japan-audit-fix.mjs';
import {
  SPEC_CANCEL_KO,
  FAQ_MIDSTOP_Q,
  FAQ_MIDSTOP_A,
  fillTransferFaqs,
  fillSpecCancel,
} from './lib/transfer-audit-copy.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = '9f7d6122-c413-42be-89a8-d08ec789d32c';
const introUrl = `https://tour.triple.partners/product-management/registration/introduction?id=${ID}&status=UNPUBLISHED&lang=zh-tw`;

async function clickSaveThenOrTemp(page) {
  await dismiss(page);
  const st = page.getByRole('button', { name: /保存然后|保存然後/ });
  if ((await st.count()) && !(await st.first().isDisabled().catch(() => true))) {
    console.log('【将要】点 保存然后');
    await st.first().click();
    await sleep(2800);
    return 'saveThen';
  }
  const temp = page.getByRole('button', { name: /^临时保存$|^臨時存儲$/ });
  if (await temp.count()) {
    const dis = await temp.first().isDisabled().catch(() => true);
    console.log('【读回】临时保存 disabled=', dis);
    if (!dis) {
      console.log('【将要】点 临时保存');
      await temp.first().click();
      await sleep(2500);
      return 'temp';
    }
  }
  // force evaluate enable-less click
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '临时保存' || t === '臨時存儲') && !x.disabled;
    });
    b?.click();
  });
  await sleep(2000);
  return 'evalTemp';
}

const { page } = await connectNolPage({
  selfHint: 'fix-tky-faq',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

// ---- FAQ ----
console.log('【将要】打开介绍页填 FAQ');
await dismiss(page);
await page.goto(introUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(3000);
await dismiss(page);

// scroll to FAQ section
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await sleep(500);
await page.getByText(/常见问题|常見問題|FAQ|자주 묻는/).first().scrollIntoViewIfNeeded().catch(() => {});
await sleep(500);

const dumpBefore = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input,textarea')).map((el) => ({
    name: el.name || el.id || '',
    ph: (el.placeholder || '').slice(0, 30),
    v: (el.value || '').slice(0, 40),
  }));
  return {
    faqNamed: inputs.filter((x) => /faq/i.test(x.name)),
    addBtns: Array.from(document.querySelectorAll('button,a,div,span'))
      .map((e) => (e.innerText || '').trim())
      .filter((t) => t && t.length < 25 && /添加|问答|問答|FAQ|질문/.test(t))
      .slice(0, 15),
  };
});
console.log('【读回】FAQ UI', JSON.stringify(dumpBefore, null, 2));

const fillR = await fillTransferFaqs(page);
console.log('【读回】fillTransferFaqs', fillR);

// if still no, click add and fill manually
let mid = await page.evaluate(
  (q) =>
    Array.from(document.querySelectorAll('input,textarea')).some((el) =>
      (el.value || '').includes(q.slice(0, 10)),
    ),
  FAQ_MIDSTOP_Q,
);
if (!mid) {
  console.log('【将要】点添加问答 + 手填');
  await page.evaluate(() => {
    const hit = Array.from(document.querySelectorAll('button,a,div,span')).find((e) => {
      const t = (e.innerText || '').replace(/\s+/g, ' ').trim();
      return /添加问答|添加問答|添加 FAQ|追加/.test(t) && t.length < 20;
    });
    hit?.click();
  });
  await sleep(800);
  // maybe need multiple adds if other FAQs exist empty
  for (let i = 0; i < 3; i++) {
    const has = await page.locator(`input[name="faqs.${i}.question"]`).count();
    if (!has) {
      await page.evaluate(() => {
        const hit = Array.from(document.querySelectorAll('button,a')).find((e) =>
          /添加问答|添加問答/.test((e.innerText || '').trim()),
        );
        hit?.click();
      });
      await sleep(500);
    }
  }
  // find last empty q or first
  const idx = await page.evaluate(() => {
    for (let i = 0; i < 8; i++) {
      const q = document.querySelector(`input[name="faqs.${i}.question"]`);
      if (q && !(q.value || '').trim()) return i;
    }
    // overwrite 0 if none empty
    if (document.querySelector('input[name="faqs.0.question"]')) return 0;
    return -1;
  });
  console.log('【读回】FAQ index', idx);
  if (idx >= 0) {
    await page.locator(`input[name="faqs.${idx}.question"]`).fill(FAQ_MIDSTOP_Q);
    await page.locator(`textarea[name="faqs.${idx}.answer"]`).fill(FAQ_MIDSTOP_A);
  }
  mid = await page.evaluate(
    (q) =>
      Array.from(document.querySelectorAll('input,textarea')).some((el) =>
        (el.value || '').includes(q.slice(0, 10)),
      ),
    FAQ_MIDSTOP_Q,
  );
}
console.log('【读回】mid before save', mid);
const save1 = await clickSaveThenOrTemp(page);
console.log('【读回】save', save1);

// re-open intro verify
await page.goto(introUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
const faqAfter = await page.evaluate((q) => {
  const pairs = [];
  for (let i = 0; i < 10; i++) {
    const qi = document.querySelector(`input[name="faqs.${i}.question"]`);
    const ai = document.querySelector(`textarea[name="faqs.${i}.answer"]`);
    if (!qi && !ai) continue;
    pairs.push({ i, q: (qi?.value || '').trim(), a: (ai?.value || '').trim().slice(0, 50) });
  }
  return { pairs, mid: pairs.some((p) => p.q.includes(q.slice(0, 10))) };
}, FAQ_MIDSTOP_Q);
console.log('【读回】FAQ after', faqAfter);

// ---- CANCEL ----
console.log('【将要】法规页 SPEC_CANCEL');
await page.goto(regsUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await dismiss(page);
await page.locator('textarea[name=specificCancelPolicy]').scrollIntoViewIfNeeded().catch(() => {});
const fillC = await fillSpecCancel(page, SPEC_CANCEL_KO);
console.log('【读回】fillSpecCancel', fillC);
// extra plain fill + tab
await page.locator('textarea[name=specificCancelPolicy]').fill(SPEC_CANCEL_KO);
await page.locator('textarea[name=specificCancelPolicy]').press('Tab');
await sleep(400);
const pre = await page.locator('textarea[name=specificCancelPolicy]').inputValue();
console.log('【读回】cancel pre-save', pre.slice(0, 60), 'exact', pre === SPEC_CANCEL_KO);
const save2 = await clickSaveThenOrTemp(page);
console.log('【读回】save cancel', save2);

await page.goto(regsUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
const afterC = await page.locator('textarea[name=specificCancelPolicy]').inputValue().catch(() => '');
const cancelOk = afterC === SPEC_CANCEL_KO || (afterC.includes('예약 확정 후 취소') && afterC.includes('협력사 확인'));
console.log('【读回】cancel after', afterC.slice(0, 70), 'ok=', cancelOk);

const pass = faqAfter.mid && cancelOk;
console.log(pass ? '【结果】PASS FAQ+条款' : `【结果】FAIL faq=${faqAfter.mid} cancel=${cancelOk}`);
console.log('未点提交审核');
process.exit(pass ? 0 : 2);
