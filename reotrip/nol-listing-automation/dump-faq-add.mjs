import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
killPeerCdpScripts('dump-faq2');
const id = '9dcef924-c7d9-41ea-8fe0-27a31dfe1064';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tour.triple.partners'));
await page.bringToFront();
await page.goto(`https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForTimeout(2500);
// scroll to FAQ
await page.getByText('常见问题').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
// click 添加问答
const add = page.getByText('添加问答');
console.log('add count', await add.count());
await add.first().click();
await page.waitForTimeout(800);
const after = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
    name: el.name, id: el.id, ph: el.placeholder||'', v:(el.value||'').slice(0,40),
    y: Math.round(el.getBoundingClientRect().y),
  })).filter(x => /faq|question|answer|问题|回答|질문/i.test(JSON.stringify(x)) || (x.y>1000 && x.ph));
});
console.log(JSON.stringify(after, null, 2));
// dump all new inputs near FAQ
const all = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('input, textarea')).filter(el => {
    const r = el.getBoundingClientRect();
    return r.y > 500 && r.width > 50 && el.type !== 'radio' && el.type !== 'checkbox' && el.type !== 'file' && el.type !== 'hidden';
  }).map(el => ({name:el.name,id:el.id,ph:el.placeholder,tag:el.tagName,v:(el.value||'').slice(0,30),y:Math.round(el.getBoundingClientRect().y)}));
});
console.log('near', JSON.stringify(all, null, 2));
process.exit(0);
