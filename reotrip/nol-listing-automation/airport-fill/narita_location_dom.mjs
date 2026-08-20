import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const data = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let target = null;
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if ((el.textContent || '').trim() === '나리타 국제공항') {
      target = el;
      break;
    }
  }
  const chain = [];
  let el = target;
  for (let depth = 0; el && depth < 8; depth += 1, el = el.parentElement) {
    const r = el.getBoundingClientRect();
    chain.push({
      depth,
      tag: el.tagName,
      className: el.className,
      role: el.getAttribute('role'),
      aria: el.getAttribute('aria-label'),
      text: (el.innerText || el.textContent || '').slice(0, 500),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      onclick: !!el.onclick,
      cursor: getComputedStyle(el).cursor,
    });
  }
  return chain;
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
