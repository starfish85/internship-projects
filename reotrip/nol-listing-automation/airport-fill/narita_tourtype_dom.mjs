import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const data = await page.evaluate(() => Array.from(document.querySelectorAll('input[name="tourTypes"]')).map((input, i) => {
  const chain = [];
  let el = input;
  for (let d = 0; el && d < 6; d += 1, el = el.parentElement) {
    const r = el.getBoundingClientRect();
    chain.push({
      d,
      tag: el.tagName,
      className: el.className,
      text: (el.innerText || el.textContent || '').slice(0, 600),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      onclick: !!el.onclick,
    });
  }
  return { i, value: input.value, checked: input.checked, chain };
}));
console.log(JSON.stringify(data, null, 2));
await browser.close();
