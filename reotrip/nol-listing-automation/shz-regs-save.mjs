import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('shz-regs-save');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
console.log('url', page.url());

async function reactFill(sel, val) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) return;
  await loc.click({ timeout: 5000 }).catch(() => {});
  await loc.fill('');
  await loc.type(String(val), { delay: 20 });
  await page.evaluate(({ s, v }) => {
    const el = document.querySelector(s);
    if (!el) return;
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    desc?.set?.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { s: sel, v: String(val) });
}

await reactFill('#minimumPurchaseQuantityPerSession', '1');
await reactFill('#maximumPurchaseQuantityPerSession', '10');
await reactFill('#minimumPurchaseDay', '3');
await reactFill('#confirmationLeadTimeValue', '3');
await reactFill('input[name="windows.0.deadline"]', '2');
await reactFill('input[name="windows.0.penalty"]', '0');
await page.getByText('人工确认（预订确认后处理）').first().click().catch(() => {});
await page.getByText(/是（手动取消）/).first().click().catch(() => {});
await sleep(500);

// 临时保存 often ungreys 保存然后
await page.getByRole('button', { name: /^临时保存$/ }).first().click().catch(() => {});
await sleep(2000);
const dis = await page.getByRole('button', { name: /保存然后/ }).first().isDisabled().catch(() => true);
console.log('【读回】saveDisabled', dis);
if (dis) failExit('still disabled');
await page.getByRole('button', { name: /保存然后/ }).first().click();
await sleep(4000);
console.log('url', page.url());
let ok = page.url().includes('/option');
if (!ok) {
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('a,button,div'))
      .find((e) => /选项管理|選項管理/.test(e.innerText || '') && e.getAttribute('aria-disabled') !== 'true')
      ?.click(),
  );
  await sleep(2500);
  ok = page.url().includes('/option');
}
console.log(ok ? 'PASS option' : 'FAIL');
process.exit(ok ? 0 : 2);
