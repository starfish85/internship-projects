import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
if (!page) throw new Error('NOL registration page not found');
await page.bringToFront();
await page.goto('https://tour.triple.partners/product-management/registration/properties?id=60557c54-6c11-4b0e-9e04-df85c0d3e78b&status=UNPUBLISHED&lang=zh-tw');
await page.waitForLoadState('domcontentloaded');
await page.locator('input[name="managementTitle"]').fill('东京市区-成田机场(NRT)');
const yesLimit = page.locator('input[name="isPassengerLimit"][value="1"]');
await yesLimit.check({ force: true });
await page.waitForTimeout(800);
const passengerInputs = await page.locator('input').evaluateAll((inputs) => inputs.map((el, i) => ({
  i,
  name: el.getAttribute('name'),
  type: el.getAttribute('type'),
  value: el.value,
  placeholder: el.getAttribute('placeholder'),
  visible: (() => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  })(),
})));
console.log('passenger candidates', JSON.stringify(passengerInputs.filter((item) => item.visible), null, 2));
for (const selector of [
  'input[name="minPassengerCount"]',
  'input[name="minimumPassengerCount"]',
  'input[name="minPassenger"]',
]) {
  if (await page.locator(selector).count()) await page.locator(selector).fill('1').catch(() => {});
}
for (const selector of [
  'input[name="maxPassengerCount"]',
  'input[name="maximumPassengerCount"]',
  'input[name="maxPassenger"]',
]) {
  if (await page.locator(selector).count()) await page.locator(selector).fill('9').catch(() => {});
}
const visibleTel = page.locator('input[type="tel"]');
if (await visibleTel.count() >= 2) {
  await visibleTel.nth(0).fill('1').catch(() => {});
  await visibleTel.nth(1).fill('9').catch(() => {});
}
const snapshot = await page.evaluate(() => Array.from(document.querySelectorAll('input, textarea, select')).map((el, i) => ({
  i,
  tag: el.tagName,
  type: el.getAttribute('type'),
  name: el.getAttribute('name'),
  value: el.value,
  checked: el.checked,
  placeholder: el.getAttribute('placeholder'),
  text: el.innerText?.slice(0, 80),
  rect: (() => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  })(),
})).filter((item) => item.rect.w > 0 && item.rect.h > 0));
console.log(JSON.stringify(snapshot, null, 2));
await browser.close();
