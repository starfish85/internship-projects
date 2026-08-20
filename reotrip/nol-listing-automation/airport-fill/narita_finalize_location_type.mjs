import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const dataBefore = await page.evaluate(() => Array.from(document.querySelectorAll('input, textarea, select, button')).map((el, i) => {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return {
    i,
    tag: el.tagName,
    type: el.getAttribute('type'),
    name: el.getAttribute('name'),
    value: el.value,
    checked: el.checked,
    placeholder: el.getAttribute('placeholder'),
    text: el.innerText?.slice(0, 120),
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden',
  };
}).filter((x) => x.visible).slice(-80));
console.log('BEFORE');
console.log(JSON.stringify(dataBefore, null, 2));
// Try to select "where used" and provide a clean Korean display name.
const useLoc = page.getByText('在哪裡使用', { exact: true });
await useLoc.click({ force: true });
await page.waitForTimeout(500);
const visibleInputs = await page.locator('input:visible').count();
for (let i = 0; i < visibleInputs; i += 1) {
  const input = page.locator('input:visible').nth(i);
  const box = await input.boundingBox();
  const placeholder = await input.getAttribute('placeholder').catch(() => null);
  if (box && box.y > 500 && (!placeholder || placeholder.includes('地點') || placeholder.includes('名稱'))) {
    await input.fill('나리타 국제공항').catch(() => {});
  }
}
const addButtons = page.getByText('添加', { exact: true });
const count = await addButtons.count();
await addButtons.nth(count - 1).click({ force: true });
await page.waitForTimeout(2000);
console.log('AFTER');
console.log((await page.locator('body').innerText()).slice(0, 12000));
await browser.close();
