/**
 * 虹桥站 draft 属性：主题+语言真选中 → 保存然后
 * DRAFT 4128217a-55af-44c6-bbdc-f028eddd7535
 * §43/§51/§53/§54
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, assertAllowedViewport, assertInnerWidthOk, failExit } from './lib/cdp-session.mjs';

const DRAFT = '4128217a-55af-44c6-bbdc-f028eddd7535';
const PROPS = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('hq-fix-theme-lang');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const pages = browser.contexts().flatMap((c) => c.pages());
console.log('【tabs】', pages.map((p) => p.url().slice(0, 100)));
let page = pages.find((p) => p.url().includes('tour.triple.partners'))
  || pages.find((p) => /triple\.partners|partners/i.test(p.url()))
  || pages[0];
if (!page) failExit('no page');
await page.bringToFront().catch(() => {});
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);

// §52 once
await page.setViewportSize({ width: 1440, height: 900 });
const geom = await assertInnerWidthOk(page);
console.log('【视口】', geom);

console.log('【将要】goto properties', DRAFT);
await page.goto(PROPS, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(3000);
console.log('【读回】url', page.url());
if (!page.url().includes(DRAFT)) failExit('not on draft');

async function gate() {
  return page.evaluate(() => {
    const body = document.body.innerText;
    const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      /保存然后|保存然後/.test(b.innerText || ''),
    );
    const themeBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      /选择类别（主题）|選擇類別/.test(b.innerText || ''),
    );
    const langBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      /选择语言|選擇語言|選擇你的语言|选择你的语言/.test(b.innerText || ''),
    );
    return {
      private: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
      mgmt: document.querySelector('input[name=managementTitle], #managementTitle')?.value || '',
      min: document.querySelector('input[name=requiredNumberOfPeople], #requiredNumberOfPeople')?.value || '',
      max: document.querySelector('input[name=availableNumberOfPeople], #availableNumberOfPeople')?.value || '',
      themeBtn: (themeBtn?.innerText || '').replace(/\s+/g, ' ').slice(0, 100),
      langBtn: (langBtn?.innerText || '').replace(/\s+/g, ' ').slice(0, 100),
      themeHas: /司机提供车辆|기사제공차량/.test(body),
      langSnippet: (() => {
        const i = body.search(/选择语言|選擇語言|进度语言|進度語言/);
        return i >= 0 ? body.slice(i, i + 80).replace(/\s+/g, ' ') : null;
      })(),
      themeRed: /请选择类别|請選擇類別|须选择类别/.test(body),
      langRed: /请选择语言|請選擇語言|须选择语言|须选择你的语言/.test(body),
      poiRed: /请添加地区|請添加地區|须添加地区/.test(body),
      saveDisabled: saveBtn ? !!saveBtn.disabled : null,
      title: document.title,
      h1: document.body.innerText.slice(0, 80),
    };
  });
}

console.log('【点前 gate】', await gate());

async function tickSheet(openRe, itemExact, tag) {
  console.log(`\n【将要】${tag} sheet → 「${itemExact}」`);
  const openBtn = page.getByRole('button', { name: openRe }).first();
  const nOpen = await openBtn.count();
  console.log('【元素定位】open button', openRe.toString(), 'count', nOpen);
  if (nOpen) {
    await openBtn.click({ timeout: 10000 });
  } else {
    await page.evaluate((src) => {
      const re = new RegExp(src);
      const b = Array.from(document.querySelectorAll('button')).find((x) => re.test(x.innerText || ''));
      b?.click();
    }, openRe.source);
  }
  await sleep(2000);

  const dump = await page.evaluate((want) => {
    const cbs = Array.from(document.querySelectorAll('[role=checkbox]')).map((cb) => {
      const lab = cb.closest('label') || cb.parentElement;
      const t = (lab?.innerText || cb.getAttribute('aria-label') || '').trim().split('\n')[0];
      const r = cb.getBoundingClientRect();
      return {
        t: t.slice(0, 50),
        aria: cb.getAttribute('aria-checked'),
        visible: r.width > 0 && r.height > 0,
        y: Math.round(r.y),
      };
    });
    const visible = cbs.filter((c) => c.visible);
    return {
      dialog: !!document.querySelector('[role=dialog]'),
      allCount: cbs.length,
      visibleCount: visible.length,
      hit: visible.filter((c) => c.t === want || c.t.includes(want) || /기사|韩语|韓語|한국어|司机/.test(c.t)),
      sample: visible.slice(0, 30),
    };
  }, itemExact);
  console.log('【DOM dump】', JSON.stringify(dump).slice(0, 1500));

  const variants = tag === '主题'
    ? ['司机提供车辆', '기사제공차량', itemExact]
    : ['韩语', '韓語', '한국어', itemExact];

  let ok = false;
  for (const want of variants) {
    const byRole = page.getByRole('checkbox', { name: want, exact: true });
    const n = await byRole.count();
    console.log('【定位】checkbox exact', JSON.stringify(want), n);
    if (!n) continue;
    const aria = await byRole.first().getAttribute('aria-checked');
    console.log('【点前】aria', aria);
    if (aria !== 'true') {
      await byRole.first().scrollIntoViewIfNeeded().catch(() => {});
      await byRole.first().click({ timeout: 8000 });
      await sleep(500);
    }
    const aria2 = await byRole.first().getAttribute('aria-checked');
    console.log('【读回】aria', aria2);
    if (aria2 === 'true') {
      ok = true;
      break;
    }
  }

  if (!ok) {
    const ev = await page.evaluate((wants) => {
      for (const want of wants) {
        for (const cb of document.querySelectorAll('[role=checkbox], input[type=checkbox]')) {
          const lab = cb.closest('label') || cb.parentElement;
          const t = (lab?.innerText || cb.getAttribute('aria-label') || '').trim().split('\n')[0].trim();
          if (t !== want) continue;
          const r = cb.getBoundingClientRect();
          if (r.width <= 0) continue;
          const on = cb.getAttribute('aria-checked') === 'true' || cb.checked;
          if (!on) {
            (lab || cb).scrollIntoView({ block: 'center' });
            (lab || cb).click();
          }
          return {
            want: t,
            on: cb.getAttribute('aria-checked') === 'true' || !!cb.checked,
          };
        }
      }
      // partial includes for theme
      for (const cb of document.querySelectorAll('[role=checkbox]')) {
        const lab = cb.closest('label') || cb.parentElement;
        const t = (lab?.innerText || '').trim().split('\n')[0].trim();
        if (!/司机提供车辆|기사제공차량/.test(t) && !/^(韩语|韓語|한국어)$/.test(t)) continue;
        if (cb.getBoundingClientRect().width <= 0) continue;
        if (cb.getAttribute('aria-checked') !== 'true') {
          (lab || cb).click();
        }
        return {
          want: t,
          on: cb.getAttribute('aria-checked') === 'true' || !!cb.checked,
        };
      }
      return { want: null, on: false };
    }, variants);
    console.log('【读回】evaluate', ev);
    ok = !!(ev && ev.on);
  }

  const verified = await page.evaluate((wants) => {
    for (const want of wants) {
      for (const cb of document.querySelectorAll('[role=checkbox], input[type=checkbox]')) {
        const lab = cb.closest('label') || cb.parentElement;
        const t = (lab?.innerText || cb.getAttribute('aria-label') || '').trim().split('\n')[0].trim();
        if (t === want || (want === '司机提供车辆' && /기사제공차량|司机提供车辆/.test(t))) {
          return { t, on: cb.getAttribute('aria-checked') === 'true' || !!cb.checked };
        }
        if (want === '韩语' && /^(韩语|韓語|한국어)$/.test(t)) {
          return { t, on: cb.getAttribute('aria-checked') === 'true' || !!cb.checked };
        }
      }
    }
    return { t: null, on: false };
  }, variants);
  console.log('【读回】真选中?', verified);

  if (!verified.on) {
    console.log('【结果】FAIL 未选中', tag);
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(500);
    return false;
  }

  const conf = page.getByRole('button', { name: /^(已选|已選)$/ });
  console.log('【将要】已选 count', await conf.count());
  if (await conf.count()) {
    await conf.last().click({ timeout: 8000 });
  } else {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /^(已选|已選)$/.test((b.innerText || '').trim()))
        ?.click();
    });
  }
  await sleep(1500);
  console.log('【结果】PASS sheet', tag);
  return true;
}

const themeOk = await tickSheet(/选择类别（主题）|選擇類別（主題）|選擇類別/, '司机提供车辆', '主题');
if (!themeOk) failExit('主题 FAIL');

const langOk = await tickSheet(/选择语言|選擇語言|选择你的语言|選擇你的语言/, '韩语', '语言');
if (!langOk) failExit('语言 FAIL');

await sleep(800);
const g2 = await gate();
console.log('【读回 gate】', g2);

if (g2.saveDisabled) {
  const reds = await page.evaluate(() => {
    const body = document.body.innerText;
    const lines = body.split('\n').filter((l) =>
      /请选择|请添加|须|必須|必填|类别|语言|私人|地区|人数|红/.test(l) && l.length < 80,
    );
    return lines.slice(0, 25);
  });
  console.log('【失败】保存然后仍灰', reds);
  failExit('saveDisabled');
}

console.log('\n【将要】点 保存然后');
const saveThen = page.getByRole('button', { name: /保存然后|保存然後/ }).first();
console.log('【元素定位】保存然后 count', await saveThen.count(), 'disabled', await saveThen.isDisabled().catch(() => null));
await saveThen.click({ timeout: 10000 });
await sleep(3500);
console.log('【读回】url after save', page.url());
const onIntro = page.url().includes('/introduction');
console.log('【结果】', onIntro ? 'PASS → introduction' : 'FAIL still not intro');
process.exit(onIntro ? 0 : 2);
