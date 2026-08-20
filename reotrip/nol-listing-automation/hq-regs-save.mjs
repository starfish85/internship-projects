import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('hq-regs-save');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
console.log('url', page.url());

// re-fill qty if empty visually
await page.locator('#minimumPurchaseQuantityPerSession').fill('1');
await page.locator('#maximumPurchaseQuantityPerSession').fill('10');
await page.locator('#minimumPurchaseDay').fill('3');
await page.locator('#confirmationLeadTimeValue').fill('3');
await page.locator('input[name="windows.0.deadline"]').fill('2');
await page.locator('input[name="windows.0.penalty"]').fill('0');
await sleep(500);

const g = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find(x => /保存然后/.test(x.innerText||''));
  return {
    disabled: b?.disabled,
    min: document.querySelector('#minimumPurchaseQuantityPerSession')?.value,
    max: document.querySelector('#maximumPurchaseQuantityPerSession')?.value,
  };
});
console.log('【gate】', g);
if (g.disabled) failExit('still disabled');

console.log('【将要】保存然后');
await page.getByRole('button', { name: /保存然后|保存然後/ }).first().click();
await sleep(4000);
console.log('【读回】url', page.url());
let ok = page.url().includes('/option');
if (!ok) {
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('a,button,div'))
      .find((e) => /选项管理|選項管理/.test((e.innerText || '')) && e.getAttribute('aria-disabled') !== 'true')
      ?.click(),
  );
  await sleep(2500);
  ok = page.url().includes('/option');
}
console.log('【结果】', ok ? 'PASS → option' : 'FAIL');
process.exit(ok ? 0 : 2);
