import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const search = page.locator('input[placeholder="관광지/숙소/주소로 검색"]');
await search.fill('나리타공항');
await page.locator('button[aria-label="search"]').click();
await page.waitForTimeout(2500);
const data = await page.evaluate(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  return {
    text: document.body.innerText.slice(0, 16000),
    buttons: Array.from(document.querySelectorAll('button')).filter(visible).map((b, i) => {
      const r = b.getBoundingClientRect();
      return { i, text: b.innerText?.slice(0, 200), aria: b.getAttribute('aria-label'), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    }).slice(0, 120),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
