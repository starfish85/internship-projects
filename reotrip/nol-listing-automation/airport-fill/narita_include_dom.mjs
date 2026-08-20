import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const data = await page.evaluate(() => Array.from(document.querySelectorAll('input[type="checkbox"], textarea')).map((el, i) => {
  const r = el.getBoundingClientRect();
  let parent = el.parentElement;
  const chainText = [];
  for (let d = 0; parent && d < 4; d += 1, parent = parent.parentElement) {
    chainText.push((parent.innerText || parent.textContent || '').slice(0, 240));
  }
  return {
    i,
    tag: el.tagName,
    type: el.getAttribute('type'),
    value: el.value,
    checked: el.checked,
    placeholder: el.getAttribute('placeholder'),
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    chainText,
  };
}));
console.log(JSON.stringify(data, null, 2));
await browser.close();
