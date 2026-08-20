/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Fix Oriental Pearl attributes carefully:
 * - theme 司机提供车辆
 * - language 韩语
 * - POI 东方明珠
 * Rules: click checkbox ONCE only if unchecked; never double-click.
 */
import { chromium } from 'playwright';

const DRAFT = 'f8d81d72-908a-457d-9716-d200cf823c6f';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findPartnerPage(browser) {
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      if (p.url().includes('triple.partners')) return p;
    }
  }
  throw new Error('No partner page found');
}

async function dumpHard(page) {
  return page.evaluate(() => {
    const t = document.body.innerText;
    const hard = t.match(/请选择[^\n]{0,40}|請選擇[^\n]{0,40}|请至少[^\n]{0,40}|必須[^\n]{0,40}/g) || [];
    const saveThen = Array.from(document.querySelectorAll('button')).find((b) =>
      /保存然后|保存然後|저장 후/.test(b.innerText || ''),
    );
    return {
      hard: [...new Set(hard)],
      saveThen: saveThen
        ? { text: saveThen.innerText.trim(), disabled: saveThen.disabled }
        : null,
      url: location.href,
    };
  });
}

/** Find a checkbox row by label text; return {el, checked, label} */
async function findCheckboxByLabel(page, patterns) {
  return page.evaluate((pats) => {
    const re = new RegExp(pats.join('|'));
    // Prefer role=checkbox
    const candidates = [
      ...document.querySelectorAll('[role="checkbox"]'),
      ...document.querySelectorAll('input[type="checkbox"]'),
      ...document.querySelectorAll('label'),
    ];
    for (const el of candidates) {
      const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      const parentText = (el.closest('label,li,div')?.innerText || '').replace(/\s+/g, ' ').trim();
      const hit = re.test(text) || re.test(parentText);
      if (!hit) continue;
      let box = el;
      if (el.tagName === 'LABEL') {
        box =
          el.querySelector('[role="checkbox"], input[type="checkbox"]') ||
          document.getElementById(el.getAttribute('for') || '') ||
          el;
      }
      const checked =
        box.getAttribute?.('aria-checked') === 'true' ||
        box.checked === true ||
        parentText.includes('✓');
      const rect = (box.getBoundingClientRect?.() || el.getBoundingClientRect());
      return {
        tag: box.tagName,
        role: box.getAttribute?.('role'),
        text: (text || parentText).slice(0, 60),
        checked,
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
        offscreen: rect.x < -100 || rect.y < -100,
      };
    }
    return null;
  }, patterns);
}

/** Click a visible element that matches text, once */
async function clickTextOnce(page, patterns, opts = {}) {
  const { exact = false, role } = opts;
  for (const pat of patterns) {
    let loc;
    if (role) {
      loc = page.getByRole(role, { name: new RegExp(pat) });
    } else {
      loc = page.getByText(new RegExp(pat));
    }
    const n = await loc.count();
    if (n === 0) continue;
    const target = loc.first();
    try {
      await target.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      const box = await target.boundingBox();
      if (!box || box.x < -100) {
        // try mouse on center of next visible parent
        await target.click({ force: true, timeout: 5000 });
      } else {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      console.log(`  ✓ clicked text: ${pat}`);
      return true;
    } catch (e) {
      console.log(`  ! click failed ${pat}: ${e.message.slice(0, 80)}`);
    }
  }
  return false;
}

/**
 * Ensure checkbox for label is checked — click AT MOST once.
 * Click the visible label text, not the offscreen input.
 */
async function ensureCheckedOnce(page, labelPatterns) {
  const info = await findCheckboxByLabel(page, labelPatterns);
  console.log('  checkbox state:', JSON.stringify(info));
  if (info?.checked) {
    console.log('  already checked — skip click');
    return true;
  }
  // Click visible label text once
  const ok = await clickTextOnce(page, labelPatterns);
  await sleep(400);
  const after = await findCheckboxByLabel(page, labelPatterns);
  console.log('  after click:', JSON.stringify(after));
  if (after?.checked) return true;

  // Fallback: role=checkbox with nearby text via locator
  for (const pat of labelPatterns) {
    const row = page.locator(`text=${pat}`).first();
    if ((await row.count()) === 0) continue;
    const box = await row.boundingBox();
    if (box && box.x > 0) {
      // click slightly left of text (checkbox area) OR center of text
      await page.mouse.click(box.x + Math.min(20, box.width / 2), box.y + box.height / 2);
      console.log(`  ✓ mouse on label row: ${pat}`);
      await sleep(400);
      const a2 = await findCheckboxByLabel(page, labelPatterns);
      console.log('  after mouse:', JSON.stringify(a2));
      return !!a2?.checked;
    }
  }
  return false;
}

async function clickConfirmSelected(page) {
  // 已选 / 已選 / 선택완료 / 저장
  const patterns = ['^已选$', '^已選$', '已选', '已選', '선택 완료', '선택완료', '^저장$'];
  for (const pat of patterns) {
    const btn = page.getByRole('button', { name: new RegExp(pat) });
    if ((await btn.count()) === 0) continue;
    const b = btn.last();
    if (await b.isDisabled().catch(() => true)) {
      console.log(`  confirm button disabled: ${pat}`);
      continue;
    }
    await b.click({ timeout: 5000 });
    console.log(`  ✓ confirmed: ${pat}`);
    await sleep(600);
    return true;
  }
  // fallback text
  return clickTextOnce(page, ['^已选$', '^已選$'], { role: 'button' });
}

async function selectTheme(page) {
  console.log('\n=== 1) 主题：司机提供车辆 ===');
  // If popup not open, open it
  const url = page.url();
  if (!url.includes('categories.popup')) {
    const opened = await clickTextOnce(page, ['选择类别（主题）', '選擇類別（主題）', '선택 카테고리']);
    if (!opened) {
      // try button near 类别
      await page.locator('button, a, [role=button]').filter({ hasText: /选择类别|選擇類別|카테고리/ }).first().click({ timeout: 5000 }).catch(() => {});
    }
    await sleep(800);
  }

  // Single ensure check
  const ok = await ensureCheckedOnce(page, ['司机提供车辆', '기사제공차량', '司機提供車輛']);
  if (!ok) {
    console.log('  WARN: could not check theme');
  }
  await sleep(300);
  // Confirm once only
  await clickConfirmSelected(page);
  await sleep(800);
  // Verify no hard error for theme
  const hard = await dumpHard(page);
  console.log('  after theme:', JSON.stringify(hard.hard));
  const still = hard.hard.some((h) => /类别|類別|主题|主題|카테고리/.test(h) && /请选择|請選擇/.test(h));
  console.log(still ? '  ❌ theme still missing' : '  ✅ theme OK or error gone');
  return !still;
}

async function selectLanguage(page) {
  console.log('\n=== 2) 语言：韩语 ===');
  // open language popup if needed
  const opened = await clickTextOnce(page, ['选择语言', '選擇語言', '언어 선택', '选择你的语言', '選擇你的语言']);
  if (!opened) {
    await page.locator('button, a, [role=button]').filter({ hasText: /选择语言|選擇語言|언어/ }).first().click({ timeout: 5000 }).catch(() => {});
  }
  await sleep(800);

  const ok = await ensureCheckedOnce(page, ['^韩语$', '^韓語$', '한국어', '韩语', '韓語']);
  if (!ok) console.log('  WARN: language check failed');
  await sleep(300);
  await clickConfirmSelected(page);
  await sleep(800);
  const hard = await dumpHard(page);
  console.log('  after lang:', JSON.stringify(hard.hard));
  const still = hard.hard.some((h) => /语言|語言|언어/.test(h) && /请|請|至少/.test(h));
  console.log(still ? '  ❌ language still missing' : '  ✅ language OK or error gone');
  return !still;
}

async function selectPOI(page) {
  console.log('\n=== 3) POI：东方明珠 ===');
  // open region modal
  const openBtn = page.locator('button, a, [role=button]').filter({ hasText: /添加地区和地点|添加地區和地點|지역.*장소|添加地区/ });
  if ((await openBtn.count()) > 0) {
    await openBtn.first().click({ timeout: 5000 });
    console.log('  opened 添加地区和地点');
  } else {
    await clickTextOnce(page, ['添加地区和地点', '添加地區和地點']);
  }
  await sleep(1000);

  // Find search input
  const inputs = page.locator('input[type="text"], input[type="search"], input:not([type])');
  const count = await inputs.count();
  console.log(`  inputs in modal: ${count}`);
  let search = null;
  for (let i = 0; i < count; i++) {
    const el = inputs.nth(i);
    const ph = ((await el.getAttribute('placeholder')) || '') + ((await el.getAttribute('aria-label')) || '');
    const vis = await el.isVisible().catch(() => false);
    if (!vis) continue;
    if (/搜索|搜尋|검색|search|장소|地点|地区/i.test(ph) || true) {
      // take first visible text input in dialog
      search = el;
      console.log(`  search input idx=${i} ph=${ph}`);
      break;
    }
  }
  if (!search) {
    search = page.locator('[role="dialog"] input, [class*="Modal"] input, [class*="popup"] input').first();
  }

  // Type 东方明珠 or Korean
  const queries = ['동방명주', '东方明珠', 'Oriental Pearl'];
  let found = false;
  for (const q of queries) {
    try {
      await search.click({ timeout: 3000 });
      await search.fill('');
      await search.fill(q);
      await sleep(300);
      await page.keyboard.press('Enter');
      console.log(`  searched: ${q}`);
      await sleep(1500);

      // pick result that is attraction, not product title
      const resultPatterns = [
        /동방명주/,
        /东方明珠塔?/,
        /東方明珠/,
        /Oriental Pearl/i,
      ];
      for (const re of resultPatterns) {
        const r = page.getByText(re).first();
        if ((await r.count()) === 0) continue;
        const box = await r.boundingBox();
        if (!box || box.y < 50) continue;
        await r.click({ timeout: 4000 });
        console.log(`  ✓ picked result matching ${re}`);
        found = true;
        await sleep(800);
        break;
      }
      if (found) break;
    } catch (e) {
      console.log(`  search fail ${q}: ${e.message.slice(0, 60)}`);
    }
  }

  if (!found) {
    // dump modal text for debug
    const modalText = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]') || document.body;
      return (d.innerText || '').slice(0, 1500);
    });
    console.log('  modal dump:\n', modalText);
  }

  // After pick: may need 添加地点 → 旅游地 → 添加
  await sleep(500);
  // click 添加地点 if present
  await clickTextOnce(page, ['添加地点', '添加地點', '장소 추가']);
  await sleep(600);

  // location type 旅游地
  const typeOk = await ensureCheckedOnce(page, ['旅游地', '旅遊地', '여행지', 'TRAVEL']).catch(() => false);
  // or radio / select
  if (!typeOk) {
    await clickTextOnce(page, ['旅游地', '旅遊地', '여행지']);
  }
  await sleep(400);

  // final 添加
  const addBtn = page.getByRole('button', { name: /^(添加|新增|추가)$/ });
  if ((await addBtn.count()) > 0 && !(await addBtn.last().isDisabled().catch(() => true))) {
    await addBtn.last().click();
    console.log('  ✓ 添加');
  } else {
    await clickTextOnce(page, ['^添加$', '^新增$', '^추가$'], { role: 'button' });
  }
  await sleep(1000);

  const hard = await dumpHard(page);
  console.log('  after POI:', JSON.stringify(hard.hard));
  const still = hard.hard.some((h) => /地区|地區|地点|地點|위치/.test(h));
  console.log(still ? '  ❌ POI still missing' : '  ✅ POI OK or error gone');
  return !still;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = await findPartnerPage(browser);
  console.log('URL:', page.url());

  // Bring page to front
  await page.bringToFront().catch(() => {});

  let hard0 = await dumpHard(page);
  console.log('BEFORE:', JSON.stringify(hard0, null, 2));

  // Close any stray if we need clean open - if categories popup open, proceed with theme
  await selectTheme(page);
  await selectLanguage(page);
  await selectPOI(page);

  // Also ensure 私人的 if missing
  console.log('\n=== 4) 私人的 check ===');
  const privateInfo = await findCheckboxByLabel(page, ['私人的', '私人', '프라이빗']);
  console.log('  private:', JSON.stringify(privateInfo));
  if (privateInfo && !privateInfo.checked) {
    await ensureCheckedOnce(page, ['私人的', '^私人$']);
  }

  const final = await dumpHard(page);
  console.log('\n=== FINAL ===');
  console.log(JSON.stringify(final, null, 2));

  // Body snippet for chips
  const chips = await page.evaluate(() => {
    const lines = document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (/司机|기사|韩语|韓語|한국어|东方明珠|東方明珠|동방|私人|运输|保存/.test(lines[i])) {
        out.push(lines.slice(i, i + 2).join(' | '));
      }
    }
    return out.slice(0, 25);
  });
  console.log('CHIPS/LINES:', chips);

  // Do NOT close browser — CDP shared
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
