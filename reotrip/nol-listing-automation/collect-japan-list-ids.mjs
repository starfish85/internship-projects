/**
 * Collect all draft product cards from registration list + extract id by clicking each unique name.
 * Writes japan-list-ids.json
 * usage: node collect-japan-list-ids.mjs [--max N] [--japan-only]
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIST = 'https://tour.triple.partners/product-management/registration?lang=zh-tw';
const maxArg = process.argv.find((a) => a.startsWith('--max='));
const MAX = maxArg ? Number(maxArg.split('=')[1]) : 120;
const JAPAN_ONLY = process.argv.includes('--japan-only');

// Japan-ish product name heuristics (KO product titles)
function isJapanName(t) {
  if (/北京|上海|杭州|广州|深圳|成都|西安|南京|武汉|青岛|天津|重庆|苏州|厦门|国内|豫园|金茂|杜莎|泡泡|虹桥|浦东|首都机场|大兴/.test(t))
    return false;
  if (/베이징|상하이|항저우|광저우|선전|푸동|훙차오|다싱|수도공항/.test(t)) return false;
  // Japan signals
  return /도쿄|오사카|교토|요코하마|나고야|삿포로|홋카이도|후쿠오카|나리타|하네다|간사이|이타미|오사카역|도쿄역|디즈니|유니버설|스카이트리|해리포터|하코네|고베|신치토세|CTS|NRT|HND|KIX|ITM|항|공항|역|크루즈|포트/.test(
    t,
  );
}

const { page } = await connectNolPage({
  selfHint: 'collect-jp-ids',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

console.log('【将要】打开产品注册列表');
await dismiss(page);
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(3500);
await dismiss(page);
console.log('【读回】url', page.url());

// scroll collect unique product titles
const names = await page.evaluate(async () => {
  const set = new Map(); // name -> first snippet
  for (let i = 0; i < 40; i++) {
    // prefer slot cards
    const cards = document.querySelectorAll('div[class*="slot___StyledContainer"]');
    const nodes = cards.length
      ? cards
      : Array.from(document.querySelectorAll('div')).filter((d) => {
          const t = (d.innerText || '').trim();
          return t.length > 25 && t.length < 250 && /단독 차량|편도 이동 서비스|注册/.test(t);
        });
    for (const d of nodes) {
      const raw = (d.innerText || '').replace(/\s+/g, ' ').trim();
      // extract product title line
      const m =
        raw.match(/([\uac00-\ud7afA-Za-z0-9()（）\s↔\-–—]+단독 차량[^\n]{0,40})/) ||
        raw.match(/([\uac00-\ud7af][^|]{10,80}서비스)/);
      const name = (m?.[1] || raw.split('注册')[0] || raw).trim().slice(0, 100);
      if (name.length > 15 && !set.has(name)) set.set(name, raw.slice(0, 160));
    }
    window.scrollBy(0, 900);
    await new Promise((r) => setTimeout(r, 280));
  }
  window.scrollTo(0, 0);
  return [...set.entries()].map(([name, snip]) => ({ name, snip }));
});

console.log('【读回】列表卡数', names.length);
const targets = JAPAN_ONLY ? names.filter((x) => isJapanName(x.name)) : names.filter((x) => isJapanName(x.name));
console.log('【读回】日本启发式', targets.length);
targets.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));

// load existing ids to skip re-click when name already mapped
const existing = existsSync(join(__dir, 'japan-list-ids.json'))
  ? JSON.parse(readFileSync(join(__dir, 'japan-list-ids.json'), 'utf8'))
  : [];
const byName = new Map(existing.map((x) => [x.name, x]));

const results = [...existing];
let clicked = 0;

for (const t of targets) {
  if (clicked >= MAX) break;
  if (byName.has(t.name) && byName.get(t.name).id) {
    console.log('skip known', t.name.slice(0, 40));
    continue;
  }

  console.log(`\n【将要】点卡取 id ${t.name.slice(0, 50)}`);
  // scroll to find card again
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await dismiss(page);

  // scroll until text visible
  const found = await page.evaluate(async (needle) => {
    for (let i = 0; i < 45; i++) {
      const hit = Array.from(document.querySelectorAll('div')).find((d) => {
        const t = (d.innerText || '').replace(/\s+/g, ' ');
        return t.includes(needle.slice(0, 30)) && t.length < 400;
      });
      if (hit) {
        hit.scrollIntoView({ block: 'center' });
        return true;
      }
      window.scrollBy(0, 700);
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  }, t.name);

  if (!found) {
    console.log('【结果】FAIL 列表未找到');
    results.push({ name: t.name, id: null, err: 'not_found' });
    continue;
  }

  // click card container
  const card = page.locator('div[class*="slot___StyledContainer4"]').filter({ hasText: t.name.slice(0, 25) }).first();
  if (await card.count()) {
    await card.click({ timeout: 8000 }).catch(async () => {
      await page.getByText(t.name.slice(0, 30)).first().click({ timeout: 5000 });
    });
  } else {
    await page.getByText(t.name.slice(0, 30)).first().click({ timeout: 8000 }).catch(() => {});
  }
  await sleep(2800);

  const url = page.url();
  const m = url.match(/id=([0-9a-f-]{36})/i);
  const id = m?.[1] || null;
  console.log('【读回】url', url.slice(0, 100), 'id=', id?.slice(0, 8));
  const row = { name: t.name, id, url: url.slice(0, 160), japan: true };
  results.push(row);
  byName.set(t.name, row);
  clicked++;

  // save partial
  if (clicked % 3 === 0) {
    writeFileSync(join(__dir, 'japan-list-ids.json'), JSON.stringify(results, null, 2));
  }

  // back to list via goto (faster than back)
}

// dedupe by id
const dedup = [];
const seenId = new Set();
const seenName = new Set();
for (const r of results) {
  const key = r.id || r.name;
  if (r.id && seenId.has(r.id)) continue;
  if (!r.id && seenName.has(r.name)) continue;
  if (r.id) seenId.add(r.id);
  seenName.add(r.name);
  dedup.push(r);
}

writeFileSync(join(__dir, 'japan-list-ids.json'), JSON.stringify(dedup, null, 2));
console.log('\n【结果】采集', dedup.length, 'withId', dedup.filter((x) => x.id).length, 'clicked_new', clicked);
console.log('wrote japan-list-ids.json');
console.log('未点提交审核');
process.exit(0);
