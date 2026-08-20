import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('hq-regs-fix2');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
console.log('url', page.url());

// dump purchase qty area HTML-ish
const area = await page.evaluate(() => {
  const body = document.body.innerText;
  const i = body.indexOf('产品最小');
  return {
    snip: i >= 0 ? body.slice(i, i + 200) : null,
    min: {
      val: document.querySelector('#minimumPurchaseQuantityPerSession')?.value,
      name: document.querySelector('#minimumPurchaseQuantityPerSession')?.name,
    },
    max: {
      val: document.querySelector('#maximumPurchaseQuantityPerSession')?.value,
      name: document.querySelector('#maximumPurchaseQuantityPerSession')?.name,
    },
    // any empty required-looking inputs
    emptyTels: Array.from(document.querySelectorAll('input[type=tel],input[type=text]'))
      .filter(i => !i.disabled && !i.value && i.offsetParent)
      .map(i => ({ name: i.name, id: i.id, ph: i.placeholder }))
      .slice(0, 20),
    redLines: body.split('\n').filter(l => /请|须|必須|紅色|错误|无效/.test(l) && l.length < 80).slice(0, 20),
  };
});
console.log(JSON.stringify(area, null, 2));

// React-style fill for qty fields
async function reactFill(sel, val) {
  const loc = page.locator(sel).first();
  await loc.click({ timeout: 5000 });
  await loc.fill('');
  await loc.type(String(val), { delay: 30 });
  await loc.blur().catch(() => {});
  // also dispatch
  await page.evaluate(({ s, v }) => {
    const el = document.querySelector(s);
    if (!el) return;
    const proto = HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc?.set?.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const pk = Object.keys(el).find(k => k.startsWith('__reactProps'));
    el[pk]?.onChange?.({ target: { value: v }, currentTarget: { value: v } });
  }, { s: sel, v: String(val) });
}

console.log('\n【将要】react fill 购买数量 1-10');
await reactFill('#minimumPurchaseQuantityPerSession', '1');
await reactFill('#maximumPurchaseQuantityPerSession', '10');
await reactFill('#minimumPurchaseDay', '3');
await reactFill('#confirmationLeadTimeValue', '3');
await reactFill('input[name="windows.0.deadline"]', '2');
await reactFill('input[name="windows.0.penalty"]', '0');

// ensure MANUAL / cancel radios via label text
await page.getByText('人工确认（预订确认后处理）').first().click().catch(() => {});
await page.getByText('可以').first().click().catch(() => {});
await page.getByText(/是（手动取消）/).first().click().catch(() => {});
await sleep(800);

const g = await page.evaluate(() => {
  const body = document.body.innerText;
  const i = body.indexOf('产品最小');
  const b = Array.from(document.querySelectorAll('button')).find(x => /保存然后/.test(x.innerText||''));
  return {
    snip: i >= 0 ? body.slice(i, i + 120).replace(/\s+/g,' ') : null,
    min: document.querySelector('#minimumPurchaseQuantityPerSession')?.value,
    max: document.querySelector('#maximumPurchaseQuantityPerSession')?.value,
    disabled: b?.disabled,
    // formik errors sometimes in data
  };
});
console.log('【读回】', g);

if (g.disabled) {
  // try temporary save to see toast/errors
  console.log('【将要】试 临时保存 看提示');
  const tmp = page.getByRole('button', { name: /^临时保存$/ });
  if (await tmp.count()) {
    await tmp.first().click().catch(() => {});
    await sleep(2000);
    const toast = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('after temp', toast.slice(0, 300));
  }
  const g2 = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => /保存然后/.test(x.innerText||''));
    return { disabled: b?.disabled };
  });
  console.log('after temp gate', g2);
  if (g2.disabled) failExit('still disabled');
}

console.log('【将要】保存然后');
await page.getByRole('button', { name: /保存然后/ }).first().click();
await sleep(4000);
console.log('url', page.url());
process.exit(page.url().includes('/option') ? 0 : 2);
