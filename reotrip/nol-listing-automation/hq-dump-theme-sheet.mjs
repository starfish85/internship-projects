import { chromium } from 'playwright';
import { killPeerCdpScripts, assertInnerWidthOk, failExit } from './lib/cdp-session.mjs';

const DRAFT = '4128217a-55af-44c6-bbdc-f028eddd7535';
const PROPS = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('hq-dump');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const pages = browser.contexts().flatMap((c) => c.pages());
let page = pages.find((p) => p.url().includes('tour.triple.partners')) || pages[0];
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);
if (!page.url().includes('/properties') || !page.url().includes(DRAFT)) {
  await page.goto(PROPS, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
}
await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
console.log('url', page.url(), await assertInnerWidthOk(page));

// Escape any open sheet
await page.keyboard.press('Escape').catch(() => {});
await sleep(400);

console.log('【将要】开主题 sheet');
await page.getByRole('button', { name: /选择类别（主题）|選擇類別/ }).first().click();
await sleep(2000);

const dump = await page.evaluate(() => {
  const dialog = document.querySelector('[role=dialog]') || document.querySelector('[class*="ActionSheet"]') || document.querySelector('[class*="BottomSheet"]') || document.querySelector('[class*="Drawer"]');
  const root = dialog || document.body;
  const inputs = Array.from(root.querySelectorAll('input')).map((i) => ({
    type: i.type,
    name: i.name,
    value: i.value,
    checked: i.checked,
    id: i.id,
    role: i.getAttribute('role'),
    aria: i.getAttribute('aria-checked'),
    cls: (i.className || '').toString().slice(0, 60),
  }));
  const labels = Array.from(root.querySelectorAll('label')).map((l) => ({
    for: l.getAttribute('for'),
    t: (l.innerText || '').trim().slice(0, 60),
  })).slice(0, 40);
  const allText = (root.innerText || '').slice(0, 2000);
  const roles = Array.from(root.querySelectorAll('[role]')).reduce((a, el) => {
    const r = el.getAttribute('role');
    a[r] = (a[r] || 0) + 1;
    return a;
  }, {});
  // find items with 司机 / 기사
  const hits = Array.from(root.querySelectorAll('div,li,span,label,button,p')).filter((e) => {
    const t = (e.innerText || '').trim();
    return /司机|기사|车辆|제공/.test(t) && t.length < 40;
  }).map((e) => ({
    tag: e.tagName,
    role: e.getAttribute('role'),
    t: e.innerText.trim().slice(0, 50),
    cls: (e.className || '').toString().slice(0, 80),
  })).slice(0, 20);
  return {
    hasDialog: !!dialog,
    dialogCls: dialog ? (dialog.className || '').toString().slice(0, 100) : null,
    roles,
    inputs: inputs.slice(0, 30),
    labels: labels.slice(0, 30),
    hits,
    allText,
  };
});
console.log(JSON.stringify(dump, null, 2));
process.exit(0);
