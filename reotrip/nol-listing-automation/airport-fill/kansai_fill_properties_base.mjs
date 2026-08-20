import { chromium } from 'playwright';

const id = '7c220325-8783-4f58-a1dc-5fbfc4137a5e';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
if (!page) throw new Error('NOL registration page not found');

await page.bringToFront();
await page.setViewportSize({ width: 1280, height: 900 });
if (!page.url().includes('/properties')) {
  await page.goto(`https://tour.triple.partners/product-management/registration/properties?id=${id}&status=UNPUBLISHED&lang=zh-tw`);
  await page.waitForLoadState('domcontentloaded');
}

await page.locator('input[name="managementTitle"]').fill('大阪市区-关西机场(KIX)');
await page.locator('input[name="productDateRule"][value="FIXED_DATE_RULE"]').check({ force: true });
await page.locator('input[name="useType"][value="USE_DATE"]').check({ force: true });
await page.locator('input[name="isPassengerLimit"][value="1"]').check({ force: true });
await page.waitForTimeout(700);

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
const telInputs = page.locator('input[type="tel"]:visible');
if (await telInputs.count() >= 2) {
  await telInputs.nth(0).fill('1').catch(() => {});
  await telInputs.nth(1).fill('9').catch(() => {});
}

console.log(JSON.stringify({
  url: page.url(),
  snapshot: await page.evaluate(() => Array.from(document.querySelectorAll('input')).map((el) => ({
    name: el.name,
    value: el.value,
    checked: el.checked,
    type: el.type,
  })).filter((x) => ['managementTitle', 'isPassengerLimit', 'minPassengerCount', 'maxPassengerCount', 'minimumPassengerCount', 'maximumPassengerCount'].includes(x.name) || x.type === 'tel')),
  text: (await page.locator('body').innerText()).slice(0, 9000),
}, null, 2));

await browser.close();
