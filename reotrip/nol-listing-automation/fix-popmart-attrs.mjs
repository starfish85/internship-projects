/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Fix Pop Mart attrs: private already ok; theme, lang, POI → 保存然后
 * draft 3851a9dd-61bb-4b8c-ad7a-e6616eb3f611
 */
import { chromium } from 'playwright';

const DRAFT = '3851a9dd-61bb-4b8c-ad7a-e6616eb3f611';
const PRODUCT_KO = '베이징 시내 호텔 ↔ 베이징 팝마트 단독 차량 편도 이동 서비스';
const INTERNAL = '北京市区酒店-北京泡泡马特';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
await page.bringToFront();
await page.goto(
  `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`,
  { waitUntil: 'domcontentloaded' },
);
await sleep(3000);

await page.locator('input[name=title], #title').first().fill(PRODUCT_KO);
await page.locator('input[name=managementTitle], #managementTitle').first().fill(INTERNAL);
await page.locator('input[name=requiredNumberOfPeople]').fill('1').catch(() => {});
await page.locator('input[name=availableNumberOfPeople]').fill('6').catch(() => {});

// passenger + private
await page.evaluate(() => {
  const yes = Array.from(document.querySelectorAll('input[name=isPassengerLimit]')).find((i) => i.value === '1');
  if (yes && !yes.checked) (yes.closest('label') || yes).click();
});
await sleep(200);
const priv = await page.evaluate(() => {
  const inp = document.querySelector('input[name=tourTypes][value="0"]');
  if (inp?.checked) return true;
  const lab = Array.from(document.querySelectorAll('label')).find((e) => /^私人/.test((e.innerText || '').trim()));
  if (lab) {
    const r = lab.getBoundingClientRect();
    return { x: r.x + 12, y: r.y + r.height / 2 };
  }
  return false;
});
if (priv && typeof priv === 'object') {
  await page.mouse.click(priv.x, priv.y);
  await sleep(300);
}
console.log('private', await page.evaluate(() => document.querySelector('input[name=tourTypes][value="0"]')?.checked));

// theme modal
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => /选择类别|選擇類別/.test(b.innerText || ''))
    ?.click();
});
await sleep(1500);
const themeClick = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('[role=checkbox], label, div'));
  for (const el of items) {
    const t = (el.innerText || '').trim();
    if (!(t.includes('司机提供车辆') || t.includes('기사제공차량'))) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height > 100) continue;
    const cb = el.getAttribute('role') === 'checkbox' ? el : el.querySelector?.('[role=checkbox]');
    if (cb) {
      if (cb.getAttribute('aria-checked') !== 'true') {
        return { x: r.x + 10, y: r.y + r.height / 2, mode: 'cb' };
      }
      return { already: true };
    }
    return { x: r.x + 10, y: r.y + r.height / 2, mode: 'el' };
  }
  return null;
});
console.log('themeClick', themeClick);
if (themeClick?.x) {
  await page.mouse.click(themeClick.x, themeClick.y);
  await sleep(400);
}
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => /^(已选|已選)$/.test((b.innerText || '').trim()))
    ?.click();
});
await sleep(1000);

// language
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => /选择语言|選擇語言|进度语言|進度語言/.test(b.innerText || ''))
    ?.click();
});
await sleep(1200);
const langClick = await page.evaluate(() => {
  for (const el of document.querySelectorAll('[role=checkbox], label, div, span')) {
    const t = (el.innerText || '').trim();
    if (!(t === '韩语' || t === '韓語' || t === '한국어')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 5 || r.x < 0) continue;
    return { x: r.x + 8, y: r.y + r.height / 2 };
  }
  return null;
});
console.log('langClick', langClick);
if (langClick) {
  await page.mouse.click(langClick.x, langClick.y);
  await sleep(400);
}
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => /^(已选|已選)$/.test((b.innerText || '').trim()))
    ?.click();
});
await sleep(1000);

// POI
const hasPoi = await page.evaluate(() =>
  /泡泡|Pop\s*Mart|POP\s*LAND|팝마트|PopMart/i.test(document.body.innerText),
);
console.log('hasPoi', hasPoi);
if (!hasPoi) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /添加地区和地点|添加地區和地點/.test(b.innerText || ''))
      ?.click();
  });
  await sleep(1800);
  // search input
  const inputs = page.locator('input:visible');
  const n = await inputs.count();
  let filled = false;
  for (let i = 0; i < n; i++) {
    const ph = (await inputs.nth(i).getAttribute('placeholder')) || '';
    if (/검색|搜索|搜尋|관광|地点|地區/i.test(ph) || i === 0) {
      await inputs.nth(i).fill('Pop Mart Beijing');
      filled = true;
      break;
    }
  }
  if (!filled && n > 0) await inputs.first().fill('Pop Mart Beijing');
  await page.keyboard.press('Enter');
  await sleep(2500);

  let pick = await page.evaluate(() => {
    for (const el of document.querySelectorAll('div,li')) {
      const t = (el.innerText || '').replace(/\s+/g, ' ');
      const r = el.getBoundingClientRect();
      if (r.width < 250 || r.height < 45 || r.height > 180 || r.y < 100) continue;
      if (/Pop|泡泡|POP|Mart|玛特|马特/i.test(t) && /北京|Beijing|China|中国|朝阳/i.test(t)) {
        return { t: t.slice(0, 120), x: r.x + 40, y: r.y + 25 };
      }
    }
    return null;
  });
  if (!pick) {
    // retry Chinese
    const inputs2 = page.locator('input:visible');
    if ((await inputs2.count()) > 0) {
      await inputs2.first().fill('北京泡泡玛特');
      await page.keyboard.press('Enter');
      await sleep(2500);
    }
    pick = await page.evaluate(() => {
      for (const el of document.querySelectorAll('div,li')) {
        const t = (el.innerText || '').replace(/\s+/g, ' ');
        const r = el.getBoundingClientRect();
        if (r.width < 250 || r.height < 45 || r.height > 180 || r.y < 100) continue;
        if (/泡泡|Pop|Mart|POP/i.test(t)) {
          return { t: t.slice(0, 120), x: r.x + 40, y: r.y + 25 };
        }
      }
      return null;
    });
  }
  console.log('POI pick', pick);
  if (pick) {
    await page.mouse.click(pick.x, pick.y);
    await sleep(1200);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /添加地点|添加地點/.test(b.innerText || ''))
        ?.click();
    });
    await sleep(1000);
    // type TRAVEL_PLACE
    const typeBox = await page.evaluate(() => {
      for (const el of document.querySelectorAll('label, div, span')) {
        const t = (el.innerText || '').trim();
        if (t === '旅游地' || t === '旅遊地' || t.includes('TRAVEL')) {
          const r = el.getBoundingClientRect();
          if (r.width > 20 && r.height < 60) return { x: r.x + 10, y: r.y + r.height / 2 };
        }
      }
      const radio = document.querySelector('input[value="TRAVEL_PLACE"]');
      if (radio) {
        const lab = radio.closest('label') || radio;
        const r = lab.getBoundingClientRect();
        return { x: r.x + 10, y: r.y + r.height / 2 };
      }
      return null;
    });
    console.log('type', typeBox);
    if (typeBox) {
      await page.mouse.click(typeBox.x, typeBox.y);
      await sleep(400);
    }
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '添加' && !b.disabled)
        ?.click();
    });
    await sleep(1500);
  }
}

const st = await page.evaluate(() => {
  const save = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  return {
    private: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
    theme: /司机提供车辆|기사제공차량/.test(document.body.innerText),
    lang: /韩语|韓語|한국어/.test(document.body.innerText),
    poi: /泡泡|Pop|POP|팝마트|Mart/i.test(document.body.innerText),
    saveDisabled: !!save?.disabled,
    saveText: save?.innerText,
  };
});
console.log('STATE', st);

if (!st.saveDisabled) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /保存然后|保存然後/.test(b.innerText || '') && !b.disabled)
      ?.click();
  });
  await sleep(4500);
  console.log('URL after', page.url());
} else {
  const reds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('p,span,div'))
      .map((e) => (e.innerText || '').trim())
      .filter((t) => t.length > 2 && t.length < 60 && /請|请|必须|必須|選擇|选择/.test(t))
      .slice(0, 15),
  );
  console.log('blockers', reds);
}
process.exit(st.saveDisabled ? 2 : 0);
