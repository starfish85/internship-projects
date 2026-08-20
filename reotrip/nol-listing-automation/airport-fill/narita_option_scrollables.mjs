import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const data = await page.evaluate(() => Array.from(document.querySelectorAll('div')).map((el, i) => {
  const r = el.getBoundingClientRect();
  return {
    i,
    className: el.className,
    text: (el.innerText || '').slice(0, 120),
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
  };
}).filter((x) => x.scrollHeight > x.clientHeight + 100 && x.rect.w > 200 && x.rect.h > 100).slice(0, 40));
console.log(JSON.stringify(data, null, 2));
await browser.close();
