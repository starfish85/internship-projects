import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
const DRAFT = '4128217a-55af-44c6-bbdc-f028eddd7535';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('hq-dump');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await page.getByRole('button', { name: /修改选项/ }).nth(0).click();
await sleep(2500);
await page.locator('#name').waitFor({ state: 'visible', timeout: 15000 });
console.log('name', await page.locator('#name').inputValue());

// open set time
const setBtn = page.getByRole('button', { name: /^设置时间$/ });
console.log('设置时间 count', await setBtn.count());
if (await setBtn.count()) await setBtn.click();
await sleep(2000);

const dump1 = await page.evaluate(() => {
  const d = document.querySelector('[role=dialog]') || document.body;
  const btns = Array.from(document.querySelectorAll('button')).map(b => ({
    t: (b.innerText||'').trim().slice(0,40),
    d: b.disabled,
    w: Math.round(b.getBoundingClientRect().width),
    y: Math.round(b.getBoundingClientRect().y),
  })).filter(b => b.t && b.w > 0 && b.y > 0 && b.y < 1000).slice(0, 50);
  return {
    dialogText: (document.querySelector('[role=dialog]')?.innerText || '').slice(0, 800),
    btns,
  };
});
console.log('AFTER OPEN', JSON.stringify(dump1, null, 2));

// click 重复 小时 添加
const rep = page.getByRole('button', { name: /重复/ });
console.log('重复 buttons', await rep.count());
for (let i = 0; i < await rep.count(); i++) {
  console.log('rep', i, await rep.nth(i).innerText(), 'dis', await rep.nth(i).isDisabled());
}
if (await rep.count()) {
  await rep.first().click();
  await sleep(1500);
}
const dump2 = await page.evaluate(() => {
  const text = (document.querySelector('[role=dialog]')?.innerText || document.body.innerText).slice(0, 1200);
  const btns = Array.from(document.querySelectorAll('button')).map(b => ({
    t: (b.innerText||'').trim().slice(0,40),
    d: b.disabled,
    role: b.getAttribute('role'),
    w: Math.round(b.getBoundingClientRect().width),
    y: Math.round(b.getBoundingClientRect().y),
  })).filter(b => b.t && b.w > 0 && b.y > 50 && b.y < 950);
  const selects = btns.filter(b => /选择|選擇|^\d{2}:\d{2}$|分钟|分鐘/.test(b.t));
  return { text, selects, btns: btns.slice(0, 40) };
});
console.log('AFTER REP', JSON.stringify(dump2, null, 2));
process.exit(0);
