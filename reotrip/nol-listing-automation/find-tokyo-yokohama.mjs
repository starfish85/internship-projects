/**
 * Find 东京市区-横滨港 draft (도쿄 시내 ↔ 요코하마항) on product list.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIST =
  'https://tour.triple.partners/product-management/products?status=UNPUBLISHED&lang=zh-tw';

const { page } = await connectNolPage({
  selfHint: 'find-tky-yoko',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

await dismiss(page);
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(3000);
await dismiss(page);

// dump search inputs
const inputs = await page.evaluate(() =>
  Array.from(document.querySelectorAll('input'))
    .map((i) => ({
      ph: i.placeholder || '',
      name: i.name || '',
      type: i.type,
      y: Math.round(i.getBoundingClientRect().y),
    }))
    .filter((x) => x.y > 0 && x.y < 400)
    .slice(0, 20),
);
console.log('inputs', inputs);

// try fill first text-like search
const search = page.locator('input').filter({ hasNot: page.locator('[type=checkbox],[type=radio],[type=hidden]') });
// simpler: get all visible text inputs near top
await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('input')).find((i) => {
    const r = i.getBoundingClientRect();
    const t = i.type || 'text';
    return r.y > 40 && r.y < 200 && r.width > 100 && (t === 'text' || t === 'search' || !t);
  });
  if (el) {
    el.focus();
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

for (const kw of ['요코하마항', '横滨港', '요코하마', '도쿄항', '하네다']) {
  console.log('【将要】搜', kw);
  const filled = await page.evaluate((q) => {
    const el = Array.from(document.querySelectorAll('input')).find((i) => {
      const r = i.getBoundingClientRect();
      const t = i.type || 'text';
      return r.y > 40 && r.y < 250 && r.width > 120 && t !== 'checkbox' && t !== 'radio' && t !== 'hidden';
    });
    if (!el) return false;
    el.focus();
    el.value = q;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, kw);
  if (filled) {
    await page.keyboard.press('Enter');
    await sleep(2500);
  } else {
    console.log('no search box');
  }
  const body = await page.evaluate(() => {
    const t = document.body.innerText || '';
    // product name lines
    const lines = t
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && s.length < 100 && /단독 차량|시내|공항|항|역/.test(s));
    return [...new Set(lines)].slice(0, 30);
  });
  console.log('【读回】lines', body.filter((l) => /요코하마|横滨|横浜|항|하네다|도쿄/.test(l)).slice(0, 15));

  // click first matching card if 도쿄+요코하마
  const hit = body.find((l) => /도쿄/.test(l) && /요코하마/.test(l));
  if (hit) {
    console.log('【将要】点卡', hit);
    await page.getByText(hit.slice(0, 30)).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(2500);
    console.log('【读回】url', page.url());
    break;
  }
}

// also try without search - scroll list body for 요코하마
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2000);
const all = await page.evaluate(async () => {
  const found = new Set();
  for (let i = 0; i < 15; i++) {
    document.querySelectorAll('div').forEach((d) => {
      const t = (d.innerText || '').trim();
      if (t.length > 20 && t.length < 150 && /요코하마|横滨/.test(t) && /단독|호텔|항/.test(t)) {
        found.add(t.split('\n')[0].slice(0, 100));
      }
    });
    window.scrollBy(0, 800);
    await new Promise((r) => setTimeout(r, 400));
  }
  return [...found];
});
console.log('【读回】scroll found', all);
console.log('【结果】done');
process.exit(0);
