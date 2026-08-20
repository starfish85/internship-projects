/**
 * Click only missing Excel products on list to get draft ids.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';
import { writeFileSync, readFileSync } from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIST = 'https://tour.triple.partners/product-management/registration?lang=zh-tw';

const TARGETS = [
  { excel: '东京市区酒店-东京迪士尼', needle: '도쿄 디즈니리조트', extra: '도쿄 시내 호텔' },
  { excel: '大阪市区酒店-大阪环球影城', needle: '유니버설 스튜디오', extra: '오사카 시내' },
  { excel: '大阪市区酒店-大阪港', needle: '오사카항', extra: '오사카 시내 호텔' },
  { excel: '横滨港-新横滨站', needle: '신요코하마역' },
  { excel: '东京-长野', needle: '나가노' },
  { excel: '中部国际机场(NGO)-名古屋市区酒店', needle: '중부 국제공항', extra: '나고야 시내 호텔' },
  { excel: '中部国际机场(NGO)-吉卜力公园', needle: '중부 국제공항', extra: '지브리' },
  { excel: '新千岁机场(CTS)-登别', needle: '노보리베츠' },
];

const { page } = await connectNolPage({
  selfHint: 'collect-miss',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const found = [];
for (const t of TARGETS) {
  console.log('\n【将要】找', t.excel, t.needle);
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await dismiss(page);
  const hit = await page.evaluate(async ({ needle, extra }) => {
    for (let i = 0; i < 50; i++) {
      const els = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer"], div'));
      for (const d of els) {
        const text = (d.innerText || '').replace(/\s+/g, ' ');
        if (!text.includes(needle)) continue;
        if (extra && !text.includes(extra)) continue;
        if (text.length > 400) continue;
        d.scrollIntoView({ block: 'center' });
        return text.slice(0, 120);
      }
      window.scrollBy(0, 800);
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  }, { needle: t.needle, extra: t.extra || '' });

  if (!hit) {
    console.log('【结果】未找到');
    found.push({ ...t, id: null });
    continue;
  }
  console.log('【读回】hit', hit.slice(0, 60));
  const card = page.locator('div[class*="slot___StyledContainer4"]').filter({ hasText: t.needle }).first();
  if (await card.count()) await card.click();
  else await page.getByText(new RegExp(t.needle)).first().click();
  await sleep(2800);
  const m = page.url().match(/id=([0-9a-f-]{36})/i);
  console.log('【结果】id', m?.[1]?.slice(0, 8), page.url().slice(0, 90));
  found.push({ ...t, id: m?.[1] || null, name: hit.split('注册')[0].trim() });
}

// merge into japan-list-ids
const list = JSON.parse(readFileSync(new URL('./japan-list-ids.json', import.meta.url)));
for (const f of found) {
  if (!f.id) continue;
  if (!list.find((x) => x.id === f.id)) list.push({ id: f.id, name: f.name || f.excel, excel: f.excel });
  else {
    const x = list.find((x) => x.id === f.id);
    x.excel = f.excel;
    if (f.name) x.name = f.name;
  }
}
writeFileSync(new URL('./japan-list-ids.json', import.meta.url), JSON.stringify(list, null, 2));
writeFileSync(new URL('./japan-missing-collect.json', import.meta.url), JSON.stringify(found, null, 2));
console.log('\nSUMMARY', JSON.stringify(found, null, 2));
process.exit(0);
