/**
 * 虹桥站 属性页完整补齐 → 保存然后
 * DRAFT 4128217a…  UI文案「私人」非「私人的」; 主题/语言用 label[for] + native checkbox
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, assertInnerWidthOk, failExit } from './lib/cdp-session.mjs';

const DRAFT = '4128217a-55af-44c6-bbdc-f028eddd7535';
const PROPS = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const PRODUCT_KO = '상하이 시내 호텔 ↔ 상하이 훙차오역 단독 차량 편도 이동 서비스';
const INTERNAL = '上海市区酒店-上海虹桥站';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('hq-fix-attrs');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const pages = browser.contexts().flatMap((c) => c.pages());
let page = pages.find((p) => p.url().includes('tour.triple.partners')) || pages[0];
if (!page) failExit('no page');
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);
await page.setViewportSize({ width: 1440, height: 900 });
console.log('【视口】', await assertInnerWidthOk(page));
await page.keyboard.press('Escape').catch(() => {});
await sleep(300);
if (!page.url().includes(DRAFT) || !page.url().includes('/properties')) {
  await page.goto(PROPS, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
}
console.log('【读回】url', page.url());

async function gate() {
  return page.evaluate(() => {
    const body = document.body.innerText;
    const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      /保存然后|保存然後/.test(b.innerText || ''),
    );
    const themeArea = (() => {
      const i = body.indexOf('选择类别');
      return i >= 0 ? body.slice(i, i + 100).replace(/\s+/g, ' ') : null;
    })();
    const langArea = (() => {
      const i = body.indexOf('进度语言');
      return i >= 0 ? body.slice(i, i + 100).replace(/\s+/g, ' ') : null;
    })();
    return {
      private: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
      title: (document.querySelector('input[name=title], #title')?.value || '').slice(0, 35),
      mgmt: document.querySelector('input[name=managementTitle], #managementTitle')?.value || '',
      min: document.querySelector('input[name=requiredNumberOfPeople], #requiredNumberOfPeople')?.value || '',
      max: document.querySelector('input[name=availableNumberOfPeople], #availableNumberOfPeople')?.value || '',
      themeArea,
      langArea,
      themeOk: /司机提供车辆|기사제공차량/.test(themeArea || ''),
      langOk: /韩语|韓語|한국어/.test(langArea || '') && !/请至少为产品选择一种语言/.test(langArea || ''),
      poiArea: (() => {
        const i = body.indexOf('地区和地点');
        return i >= 0 ? body.slice(i, i + 160).replace(/\s+/g, ' ') : null;
      })(),
      poiOk: /虹桥|훙차오|Hongqiao/i.test(body) && !/请选择产品的地区和位置/.test(
        (() => {
          const i = body.indexOf('地区和地点');
          return i >= 0 ? body.slice(i, i + 200) : '';
        })(),
      ),
      saveDisabled: saveBtn ? !!saveBtn.disabled : null,
    };
  });
}

console.log('【点前】', await gate());

// titles + pax
console.log('\n【将要】title/mgmt/人数');
await page.locator('input[name=title], #title').first().fill(PRODUCT_KO);
await page.locator('input[name=managementTitle], #managementTitle').first().fill(INTERNAL);
// 是否限制人数 → 是
await page.evaluate(() => {
  // radio/checkbox for isPassengerLimit value 1
  const yes = Array.from(document.querySelectorAll('input')).find(
    (i) => i.name === 'isPassengerLimit' && (i.value === '1' || i.value === 'true'),
  );
  if (yes && !yes.checked) {
    const lab = document.querySelector(`label[for="${yes.id}"]`) || yes.closest('label');
    (lab || yes).click();
  }
  // also click visible text 是 near 是否限制人数
  if (!yes?.checked) {
    const area = Array.from(document.querySelectorAll('div,label')).find((e) =>
      /是否限制人数/.test(e.innerText || '') && (e.innerText || '').length < 80,
    );
    // skip
  }
});
await sleep(200);
const minLoc = page.locator('input[name=requiredNumberOfPeople], #requiredNumberOfPeople').first();
const maxLoc = page.locator('input[name=availableNumberOfPeople], #availableNumberOfPeople').first();
if (await minLoc.count()) await minLoc.fill('1');
if (await maxLoc.count()) await maxLoc.fill('4');
// if empty, maybe need 是 first via text
if (!(await maxLoc.inputValue().catch(() => ''))) {
  console.log('【将要】点 是否限制人数=是');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    // find 是 near passenger limit
    for (const l of labels) {
      const t = (l.innerText || '').trim();
      if (t === '是' || t === '有') {
        const forId = l.getAttribute('for') || '';
        if (/Passenger|passenger|Limit|limit|人数/.test(forId) || true) {
          // check nearby context
        }
      }
    }
    // click radio with value true near 是否限制人数 section
    const section = Array.from(document.querySelectorAll('div')).find((d) =>
      (d.innerText || '').startsWith('是否限制人数'),
    );
    if (section) {
      const yesLab = Array.from(section.querySelectorAll('label')).find((l) =>
        /^(是|有|YES)$/i.test((l.innerText || '').trim()),
      );
      yesLab?.click();
    }
  });
  await sleep(400);
  await minLoc.fill('1').catch(() => {});
  await maxLoc.fill('4').catch(() => {});
}
console.log('【读回】', await page.evaluate(() => ({
  mgmt: document.querySelector('input[name=managementTitle], #managementTitle')?.value,
  min: document.querySelector('input[name=requiredNumberOfPeople], #requiredNumberOfPeople')?.value,
  max: document.querySelector('input[name=availableNumberOfPeople], #availableNumberOfPeople')?.value,
})));

// 私人 — label text starts with 私人 (not 私人的)
console.log('\n【将要】私人 (tourTypes=0)');
let priv = await page.evaluate(() => ({
  checked: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
  id: document.querySelector('input[name=tourTypes][value="0"]')?.id,
}));
console.log('【点前】', priv);
if (!priv.checked) {
  console.log('【元素定位】label[for=tourTypes_0] 文案「私人」');
  // use for=id if known
  if (priv.id) {
    const lab = page.locator(`label[for="${priv.id}"]`);
    console.log('label for count', await lab.count());
    if (await lab.count()) {
      await lab.first().scrollIntoViewIfNeeded();
      await lab.first().click({ timeout: 8000 });
    }
  }
  await sleep(400);
  priv = await page.evaluate(() => ({
    checked: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
  }));
  console.log('【读回1】', priv);
}
if (!priv.checked) {
  // evaluate click label
  await page.evaluate(() => {
    const inp = document.querySelector('input[name=tourTypes][value="0"]');
    const lab = inp?.id
      ? document.querySelector(`label[for="${inp.id}"]`)
      : Array.from(document.querySelectorAll('label')).find((l) =>
          /^私人/.test((l.innerText || '').trim()),
        );
    lab?.scrollIntoView({ block: 'center' });
    lab?.click();
  });
  await sleep(400);
  priv = await page.evaluate(() => ({
    checked: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
  }));
  console.log('【读回2】', priv);
}
if (!priv.checked) failExit('私人未真选中');
console.log('【结果】PASS 私人');

async function tickSheet(openRe, variants, tag) {
  console.log(`\n【将要】${tag} → ${variants[0]}`);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);
  const openBtn = page.getByRole('button', { name: openRe }).first();
  console.log('【元素定位】open count', await openBtn.count());
  await openBtn.click({ timeout: 10000 });
  await sleep(1500);

  const labs = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('[role=dialog] label, [class*="PopupContainer"] label'),
    ).map((l) => (l.innerText || '').trim().split('\n')[0]),
  );
  console.log('【DOM】sheet labels', labs);

  let hit = null;
  for (const want of variants) {
    const r = await page.evaluate((w) => {
      const dialog =
        document.querySelector('[role=dialog]') ||
        document.querySelector('[class*="PopupContainer"]');
      if (!dialog) return { err: 'no dialog' };
      const lab = Array.from(dialog.querySelectorAll('label')).find(
        (l) => (l.innerText || '').trim().split('\n')[0].trim() === w,
      );
      if (!lab) return { found: false, w };
      const forId = lab.getAttribute('for');
      const inp = forId ? document.getElementById(forId) : lab.querySelector('input');
      const before = !!inp?.checked;
      if (!before) {
        lab.scrollIntoView({ block: 'center' });
        lab.click();
      }
      return {
        found: true,
        w,
        before,
        after: !!document.getElementById(forId)?.checked,
        forId,
        value: inp?.value,
      };
    }, want);
    console.log('【读回】', r);
    if (r.after) {
      hit = r;
      break;
    }
    // Playwright
    const pl = page
      .locator('[role=dialog] label, [class*="PopupContainer"] label')
      .filter({ hasText: new RegExp(`^${want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
    if (await pl.count()) {
      await pl.first().click({ timeout: 8000 });
      await sleep(400);
      const after = await page.evaluate((w) => {
        const lab = Array.from(document.querySelectorAll('label')).find(
          (l) => (l.innerText || '').trim().split('\n')[0] === w,
        );
        const inp = lab?.getAttribute('for')
          ? document.getElementById(lab.getAttribute('for'))
          : null;
        return { w, checked: !!inp?.checked };
      }, want);
      console.log('【读回 pw】', after);
      if (after.checked) {
        hit = after;
        break;
      }
    }
  }
  if (!hit) {
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }
  const conf = page.getByRole('button', { name: /^(已选|已選)$/ });
  console.log('【将要】已选', await conf.count());
  if (await conf.count()) await conf.last().click({ timeout: 8000 });
  await sleep(1200);
  console.log('【结果】PASS', tag);
  return true;
}

if (!(await tickSheet(/选择类别（主题）|選擇類別/, ['司机提供车辆', '기사제공차량'], '主题')))
  failExit('主题 FAIL');
if (!(await tickSheet(/选择语言|選擇語言|选择你的语言/, ['韩语', '韓語', '한국어'], '语言')))
  failExit('语言 FAIL');

// POI
let g = await gate();
console.log('\n【中 gate】', g);
if (!g.poiOk) {
  console.log('【将要】POI 上海虹桥站 排除机场');
  // if existing wrong/empty poi card, may need add
  await page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ }).first().click();
  await sleep(1500);
  const search = page
    .locator(
      'input[placeholder*="검색"], input[placeholder*="관광지"], input[placeholder*="搜索"], input[placeholder*="Search"]',
    )
    .first();
  await search.waitFor({ state: 'visible', timeout: 12000 });
  await search.fill('上海虹桥站');
  await page.keyboard.press('Enter');
  await sleep(2800);
  const pick = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ');
      const r = el.getBoundingClientRect();
      return (
        r.width > 280 &&
        r.height > 40 &&
        r.height < 200 &&
        r.y > 80 &&
        /虹桥|Hongqiao|훙차오/i.test(t) &&
        /站|Station|역|铁路|高铁/i.test(t) &&
        !/机场|Airport|浦东|Pudong/i.test(t)
      );
    });
    cards.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (!cards[0]) return null;
    cards[0].click();
    return cards[0].innerText.slice(0, 140);
  });
  console.log('【读回】pick', pick);
  if (!pick) failExit('POI 无结果');
  await sleep(1000);
  await page.getByRole('button', { name: /添加地点|添加地點/ }).first().click().catch(() => {});
  await sleep(800);
  await page.evaluate(() => {
    const radio = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
    if (radio && !radio.checked) (radio.closest('label') || radio).click();
    Array.from(document.querySelectorAll('label,div,span'))
      .find((e) => /^(旅游地|旅遊地)$/.test((e.innerText || '').trim()))
      ?.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => (x.innerText || '').trim() === '添加' && !x.disabled)
      ?.click();
  });
  await sleep(1500);
}

g = await gate();
console.log('【读回 gate】', g);
if (!g.private) failExit('private lost');
if (!g.themeOk) failExit('theme not on page');
if (!g.langOk) failExit('lang not on page');
if (g.saveDisabled) {
  console.log('【失败】保存然后仍灰', g);
  failExit('saveDisabled');
}

console.log('\n【将要】保存然后');
const saveThen = page.getByRole('button', { name: /保存然后|保存然後/ }).first();
console.log('【元素定位】disabled', await saveThen.isDisabled());
await saveThen.click({ timeout: 10000 });
await sleep(4000);
console.log('【读回】url', page.url());
const ok = page.url().includes('/introduction');
console.log('【结果】', ok ? 'PASS → introduction' : 'FAIL');
process.exit(ok ? 0 : 2);
