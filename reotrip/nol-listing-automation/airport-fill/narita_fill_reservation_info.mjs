import { chromium } from 'playwright';

const requiredIds = [
  'CELLPHONE-required',
  'EMAIL-required',
  'ENGLISH_LAST_NAME-required',
  'ENGLISH_FIRST_NAME-required',
  'AIRLINE_CODE-required',
  'DEPARTURE_FLIGHT_NUMBER-required',
  'DEPARTURE_DATE_TIME-required',
  'ARRIVAL_FLIGHT_NUMBER-required',
  'ARRIVAL_DATE_TIME-required',
  'HOTEL_NAME-required',
  'HOTEL_ADDRESS-required',
  'PICKUP_AREA-required',
  'PICKUP_TIME-required',
  'SENDING_AREA-required',
  'BOOKED_TIME-required',
  'KAKAO_TALK_ID-required',
  'MESSAGING_APP_ID-required',
  'NUMBER_OF_PEOPLE-required',
  'NUMBER_OF_SUITCASES-required',
];

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();

if ((await page.getByText('已選', { exact: true }).count()) === 0) {
  await page.getByRole('button', { name: '代表預約信息', exact: true }).click();
  await page.waitForTimeout(1000);
}

await page.evaluate((ids) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked').set;
  for (const input of document.querySelectorAll('input[type="checkbox"][id$="-required"], input[type="checkbox"][id$="-optional"]')) {
    const shouldCheck = ids.includes(input.id);
    if (input.checked !== shouldCheck) {
      setter.call(input, shouldCheck);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}, requiredIds);

await page.waitForTimeout(500);
const selected = await page.evaluate(() => Array.from(document.querySelectorAll('input[type="checkbox"]'))
  .filter((input) => input.checked)
  .map((input) => input.id));
console.log(JSON.stringify({ selected }, null, 2));

const done = page.getByText('已選', { exact: true });
await done.nth((await done.count()) - 1).click();
await page.waitForTimeout(1500);
console.log((await page.locator('body').innerText()).slice(0, 9000));
await browser.close();
