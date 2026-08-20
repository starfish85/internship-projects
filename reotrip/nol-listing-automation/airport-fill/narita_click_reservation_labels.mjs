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

for (const id of requiredIds) {
  for (let guard = 0; guard < 12; guard += 1) {
    if (await page.locator(`#${id}`).count()) break;
    await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('div')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 500 && r.height > 300 && r.x > 200 && r.y >= 0 && el.scrollHeight > el.clientHeight;
      });
      const scroller = candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      if (scroller) scroller.scrollTop += 360;
    });
    await page.waitForTimeout(160);
  }
  const input = page.locator(`#${id}`);
  if (!(await input.count())) {
    console.log(`missing ${id}`);
    continue;
  }
  if (!(await input.evaluate((el) => el.checked))) {
    const label = page.locator(`label[for="${id}"]`);
    if (await label.count()) await label.click({ force: true });
    else await input.click({ force: true });
    await page.waitForTimeout(80);
  }
}

const selected = await page.evaluate(() => Array.from(document.querySelectorAll('input[type="checkbox"]'))
  .filter((input) => input.checked)
  .map((input) => input.id));
console.log(JSON.stringify({ selected }, null, 2));

const done = page.getByText('已選', { exact: true });
await done.nth((await done.count()) - 1).click();
await page.waitForTimeout(1500);
console.log((await page.locator('body').innerText()).slice(0, 9000));
await browser.close();
