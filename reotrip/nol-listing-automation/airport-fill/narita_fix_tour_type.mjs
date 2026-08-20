import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
await page.getByText('私人的', { exact: true }).click({ force: true });
await page.waitForTimeout(1000);
const data = await page.evaluate(() => ({
  tourTypes: Array.from(document.querySelectorAll('input[name="tourTypes"]')).map((el) => ({ value: el.value, checked: el.checked })),
  buttons: Array.from(document.querySelectorAll('button')).map((b) => ({ text: b.innerText, disabled: b.disabled, ariaDisabled: b.getAttribute('aria-disabled') })).filter((b) => b.text.includes('保存') || b.text.includes('臨時')),
  text: document.body.innerText.slice(0, 9000),
}));
console.log(JSON.stringify(data, null, 2));
await browser.close();
