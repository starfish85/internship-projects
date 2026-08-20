import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import { SPEC_CANCEL_KO } from './lib/transfer-audit-copy.mjs';

killPeerCdpScripts('dbg-cancel');
const id = '9dcef924-c7d9-41ea-8fe0-27a31dfe1064';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
await sleep(2500);
await page.getByText(/^消除$/).first().click({timeout:500}).catch(()=>{});

const before = await page.locator('textarea[name=specificCancelPolicy]').inputValue();
console.log('BEFORE', before.slice(0,80));

// Playwright fill + type + blur (Formik)
const ta = page.locator('textarea[name=specificCancelPolicy]');
await ta.click();
await ta.fill('');
await ta.fill(SPEC_CANCEL_KO);
await ta.press('Tab');
await sleep(300);
console.log('MID', (await ta.inputValue()).slice(0,80));

// check formik values if accessible
const formik = await page.evaluate(() => {
  // try find react fiber formik
  const el = document.querySelector('textarea[name=specificCancelPolicy]');
  let n = el;
  for (let i=0;i<20 && n;i++) {
    const keys = Object.keys(n);
    const fk = keys.find(k=>k.startsWith('__reactFiber')||k.startsWith('__reactInternalInstance'));
    if (fk) {
      let fiber = n[fk];
      for (let d=0;d<40 && fiber;d++) {
        const st = fiber.memoizedProps || fiber.pendingProps;
        if (st && st.values && st.values.specificCancelPolicy !== undefined) {
          return { found: true, v: String(st.values.specificCancelPolicy||'').slice(0,80), setFieldValue: typeof st.setFieldValue };
        }
        if (st && st.form && st.form.values) {
          return { found: true, via: 'form', v: String(st.form.values.specificCancelPolicy||'').slice(0,80) };
        }
        fiber = fiber.return;
      }
    }
    n = n.parentElement;
  }
  return { found: false };
});
console.log('FORMIK', formik);

const btn = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
console.log('enabled', await btn.isEnabled(), 'disabled attr', await btn.getAttribute('disabled'));
// list footer buttons
const foot = await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter(b=>{
  const t=(b.innerText||'').trim();
  return /保存|临时|臨時|下|提交|批准/.test(t);
}).map(b=>({t:(b.innerText||'').trim().slice(0,24), d:b.disabled})));
console.log('FOOT', foot);

await btn.click();
await sleep(3500);
console.log('url', page.url());
// leave dialog?
const leave = await page.getByText(/有变化|確定要離開|确定要离开/).count();
console.log('leave dialog count', leave);
if (leave) {
  // means not saved - click 消除 and try temp save?
  console.log('LEAVE DIALOG - save failed');
}

await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
await sleep(2500);
const after = await page.locator('textarea[name=specificCancelPolicy]').inputValue();
console.log('AFTER', after.slice(0,100));
console.log('OK', after.includes('예약 확정 후 취소'));
process.exit(0);
