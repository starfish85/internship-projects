import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
if (!page.url().includes('/properties')) {
  await page.goto('https://tour.triple.partners/product-management/registration/properties?id=60557c54-6c11-4b0e-9e04-df85c0d3e78b&status=UNPUBLISHED&lang=zh-tw');
  await page.waitForLoadState('domcontentloaded');
}
await page.getByText('添加地區和地點', { exact: true }).click();
await page.waitForTimeout(1500);
const data = await page.evaluate(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  const summarize = (el, i) => {
    const r = el.getBoundingClientRect();
    return {
      i,
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      placeholder: el.getAttribute('placeholder'),
      aria: el.getAttribute('aria-label'),
      value: el.value,
      text: el.innerText?.slice(0, 200),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  };
  return {
    text: document.body.innerText.slice(0, 12000),
    inputs: Array.from(document.querySelectorAll('input, textarea, select')).filter(visible).map(summarize).slice(0, 80),
    buttons: Array.from(document.querySelectorAll('button')).filter(visible).map(summarize).slice(0, 80),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
