/**
 * Search registration list for 东京市区-横滨港 / 도쿄↔요코하마항
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIST = 'https://tour.triple.partners/product-management/registration?lang=zh-tw';

const { page } = await connectNolPage({
  selfHint: 'find-tky2',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

await dismiss(page);
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(3500);
await dismiss(page);
console.log('【读回】url', page.url());

const bodyHead = await page.evaluate(() => (document.body.innerText || '').slice(0, 500));
console.log('【读回】body head', bodyHead.replace(/\n/g, ' | ').slice(0, 400));

// scroll collect all product names with 요코하마 or 横滨
const found = await page.evaluate(async () => {
  const set = new Set();
  for (let i = 0; i < 20; i++) {
    document.querySelectorAll('div[class*="slot___StyledContainer"], div').forEach((d) => {
      const t = (d.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length > 20 && t.length < 200 && /요코하마|横滨|横浜/.test(t)) {
        set.add(t.slice(0, 140));
      }
    });
    window.scrollBy(0, 900);
    await new Promise((r) => setTimeout(r, 350));
  }
  return [...set];
});
console.log('【读回】横滨相关卡', found.length);
found.forEach((t, i) => console.log(i, t));

// specifically 도쿄 시내 + 요코하마항 (not 요코하마 시내)
const tokyoYoko = found.filter((t) => /도쿄 시내|东京市区/.test(t) && /요코하마/.test(t));
const yokoCity = found.filter((t) => /요코하마 시내|横滨市区/.test(t));
console.log('【读回】东京市区-横滨', tokyoYoko);
console.log('【读回】横滨市区-横滨', yokoCity);

// try click 东京 one if any
if (tokyoYoko.length) {
  const key = tokyoYoko[0].match(/도쿄[^]*?요코하마항[^]*?서비스|东京市区-横滨港/)?.[0] || tokyoYoko[0].slice(0, 40);
  console.log('【将要】点', key);
  const card = page.locator('div[class*="slot___StyledContainer4"]').filter({ hasText: /도쿄 시내 호텔 ↔ 요코하마항|东京市区-横滨港/ }).first();
  if (await card.count()) {
    await card.click();
    await sleep(3000);
    console.log('【读回】resume url', page.url());
    const m = page.url().match(/id=([0-9a-f-]{36})/i);
    console.log('【结果】DRAFT', m?.[1]);
  } else {
    // looser click
    await page.getByText(/도쿄 시내 호텔 ↔ 요코하마항/).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(3000);
    console.log('【读回】url2', page.url());
  }
} else {
  console.log('【结果】未找到 东京市区-横滨港 草稿 — 可能未创建');
}

process.exit(0);
