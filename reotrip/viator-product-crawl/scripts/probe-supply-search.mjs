import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });
fs.mkdirSync('artifacts/screenshots', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const ctrip = pages.find((p) => (p.url() || '').includes('travelagents.trip.com'));
const klook = pages.find((p) => (p.url() || '').includes('klook.klktech.com'));
if (!ctrip || !klook) {
  console.error('missing tabs', { ctrip: !!ctrip, klook: !!klook, urls: pages.map((p) => p.url()) });
  process.exit(1);
}

const snapshot = async (page, name) => {
  const info = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input, textarea')].map((el) => ({
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      value: (el.value || '').slice(0, 80),
      cls: (el.className || '').toString().slice(0, 80),
    }));
    return {
      title: document.title,
      url: location.href,
      text: (document.body?.innerText || '').slice(0, 1800),
      inputs: inputs.slice(0, 25),
    };
  });
  await page.screenshot({ path: `artifacts/screenshots/${name}.png`, fullPage: false });
  return info;
};

console.log('\n===== CTRIP =====');
const cInfo = await snapshot(ctrip, 'ctrip-home');
console.log(JSON.stringify({ url: cInfo.url, title: cInfo.title, inputs: cInfo.inputs }, null, 2));
console.log(cInfo.text.slice(0, 1200));

console.log('\n===== KLOOK =====');
const kInfo = await snapshot(klook, 'klook-home');
console.log(JSON.stringify({ url: kInfo.url, title: kInfo.title, inputs: kInfo.inputs }, null, 2));
console.log(kInfo.text.slice(0, 1200));

fs.writeFileSync('data/probe-supply-home.json', JSON.stringify({ ctrip: cInfo, klook: kInfo }, null, 2));
process.exit(0);
