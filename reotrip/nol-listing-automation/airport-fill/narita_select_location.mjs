import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(500);
await page.getByText('나리타 국제공항', { exact: true }).click({ timeout: 10000 });
await page.waitForTimeout(1500);
const data = await page.evaluate(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  return {
    text: document.body.innerText.slice(0, 18000),
    buttons: Array.from(document.querySelectorAll('button')).filter(visible).map((b, i) => {
      const r = b.getBoundingClientRect();
      return { i, text: b.innerText?.slice(0, 200), aria: b.getAttribute('aria-label'), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    }).slice(0, 140),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
