import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('hq-save-then');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
if (!page) failExit('no page');
await page.bringToFront();
page.setDefaultTimeout(30000);
console.log('【读回】url', page.url());

// verify theme in sheet briefly
const g = await page.evaluate(() => {
  const body = document.body.innerText;
  const saveBtn = Array.from(document.querySelectorAll('button')).find((b) => /保存然后/.test(b.innerText || ''));
  // look for selected theme chips anywhere
  const themeHit = /司机提供车辆|기사제공차량/.test(body);
  return {
    private: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
    themeHit,
    lang: /进度语言[\s\S]{0,30}韩语/.test(body),
    poi: /훙차오|虹桥|Hongqiao/i.test(body),
    saveDisabled: saveBtn?.disabled ?? null,
    redTheme: /请选择类别（主题）。/.test(body),
  };
});
console.log('【gate】', g);
if (g.saveDisabled) failExit('still disabled');
if (!g.private) failExit('private false');

// reopen theme to confirm selected
console.log('【将要】重开主题 sheet 验收');
await page.getByRole('button', { name: /选择类别（主题）/ }).first().click();
await sleep(1200);
const themeChecked = await page.evaluate(() => {
  const dialog = document.querySelector('[role=dialog], [class*="PopupContainer"]');
  const lab = Array.from(dialog?.querySelectorAll('label') || []).find(
    (l) => (l.innerText || '').trim().split('\n')[0] === '司机提供车辆',
  );
  const inp = lab?.getAttribute('for') ? document.getElementById(lab.getAttribute('for')) : null;
  return { checked: !!inp?.checked, text: lab?.innerText?.slice(0, 20) };
});
console.log('【读回】主题 checked', themeChecked);
await page.getByRole('button', { name: /^(已选|已選)$/ }).last().click().catch(() => {});
await sleep(800);

if (!themeChecked.checked) {
  // re-tick
  await page.getByRole('button', { name: /选择类别（主题）/ }).first().click();
  await sleep(1000);
  await page.evaluate(() => {
    const dialog = document.querySelector('[role=dialog], [class*="PopupContainer"]');
    const lab = Array.from(dialog?.querySelectorAll('label') || []).find(
      (l) => (l.innerText || '').trim().split('\n')[0] === '司机提供车辆',
    );
    lab?.click();
  });
  await sleep(400);
  await page.getByRole('button', { name: /^(已选|已選)$/ }).last().click();
  await sleep(800);
}

console.log('\n【将要】保存然后');
const saveThen = page.getByRole('button', { name: /保存然后|保存然後/ }).first();
console.log('【元素定位】disabled', await saveThen.isDisabled());
if (await saveThen.isDisabled()) failExit('disabled');
await saveThen.click({ timeout: 10000 });
await sleep(4000);
console.log('【读回】url', page.url());
const ok = page.url().includes('/introduction');
console.log('【结果】', ok ? 'PASS → introduction' : 'FAIL');
process.exit(ok ? 0 : 2);
