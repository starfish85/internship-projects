import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
await page.evaluate(() => {
  const input = document.querySelector('input[name="tourTypes"][value="0"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked').set;
  setter.call(input, true);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(1000);
const data = await page.evaluate(() => ({
  tourTypes: Array.from(document.querySelectorAll('input[name="tourTypes"]')).map((el) => ({ value: el.value, checked: el.checked })),
  buttons: Array.from(document.querySelectorAll('button')).map((b) => ({ text: b.innerText, disabled: b.disabled, ariaDisabled: b.getAttribute('aria-disabled') })).filter((b) => b.text.includes('保存') || b.text.includes('臨時')),
}));
console.log(JSON.stringify(data, null, 2));
await browser.close();
