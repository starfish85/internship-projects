import { chromium } from 'playwright';

const index = Number(process.argv[2] || '0');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const edits = page.getByText('옵션 수정하기', { exact: true });
await edits.nth(index).click({ timeout: 10000 });
await page.waitForTimeout(1500);
const data = await page.evaluate(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  const field = (el, i) => {
    const r = el.getBoundingClientRect();
    return { i, tag: el.tagName, type: el.getAttribute('type'), name: el.getAttribute('name'), value: el.value, checked: el.checked, placeholder: el.getAttribute('placeholder'), text: el.innerText?.slice(0, 200), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
  };
  return {
    text: document.body.innerText.slice(0, 20000),
    inputs: Array.from(document.querySelectorAll('input,textarea,select')).filter(visible).map(field).slice(0, 180),
    buttons: Array.from(document.querySelectorAll('button')).filter(visible).map(field).slice(0, 180),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
