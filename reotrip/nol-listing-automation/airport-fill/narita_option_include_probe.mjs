import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
await page.evaluate(() => {
  const scroller = Array.from(document.querySelectorAll('div')).find((el) =>
    String(el.className).includes('action-popup__ScrollContainer')
  );
  if (scroller) scroller.scrollTop = 1220;
});
await page.waitForTimeout(500);
await page.mouse.click(978, 228);
await page.waitForTimeout(1500);
const data = await page.evaluate(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  const f = (el, i) => {
    const r = el.getBoundingClientRect();
    return { i, tag: el.tagName, type: el.getAttribute('type'), value: el.value, checked: el.checked, placeholder: el.getAttribute('placeholder'), text: el.innerText?.slice(0, 240), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
  };
  return {
    text: document.body.innerText.slice(0, 18000),
    inputs: Array.from(document.querySelectorAll('input,textarea,select')).filter(visible).map(f).slice(0, 160),
    buttons: Array.from(document.querySelectorAll('button')).filter(visible).map(f).slice(0, 160),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
