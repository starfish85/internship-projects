/**
 * 奈良市区酒店-关西国际机场 属性：私人/主题/语言/POI/1-4 → 保存然后
 * §51 真选中 · §55 逐步 log · §56 POI 真验收
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, assertInnerWidthOk, failExit } from './lib/cdp-session.mjs';
import { clickSaveThenAfterPoiGate, PoiGateError } from './lib/poi-gate.mjs';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dir = dirname(fileURLToPath(import.meta.url));
const DRAFT = process.env.NK_DRAFT || readFileSync(join(__dir, '.nk-draft-id'), 'utf8').trim();

const PROPS = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const PRODUCT_KO =
  '나라 시내 호텔 ↔ 간사이 국제공항(KIX) 단독 차량 편도 이동 서비스';
const INTERNAL = '奈良市区酒店-关西国际机场';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('nk-attrs');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page =
  browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners')) ||
  browser.contexts()[0].pages()[0];
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);
await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
console.log('【视口】', await assertInnerWidthOk(page));

if (!page.url().includes(DRAFT) || !page.url().includes('/properties')) {
  await page.goto(PROPS, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
}
console.log('【读回】url', page.url());

console.log('\n【将要】填 title / managementTitle / 人数 1-4');
await page.locator('input[name=title], #title').first().fill(PRODUCT_KO);
await page.locator('input[name=managementTitle], #managementTitle').first().fill(INTERNAL);
await page.evaluate(() => {
  const yes = Array.from(document.querySelectorAll('input')).find(
    (i) => i.name === 'isPassengerLimit' && (i.value === '1' || i.value === 'true'),
  );
  if (yes && !yes.checked) {
    const lab = document.querySelector(`label[for="${yes.id}"]`) || yes.closest('label');
    (lab || yes).click();
  }
});
await sleep(200);
await page.locator('input[name=requiredNumberOfPeople], #requiredNumberOfPeople').fill('1').catch(() => {});
await page.locator('input[name=availableNumberOfPeople], #availableNumberOfPeople').fill('9').catch(() => {});
const names = await page.evaluate(() => ({
  title: document.querySelector('input[name=title], #title')?.value?.slice(0, 50),
  mgmt: document.querySelector('input[name=managementTitle], #managementTitle')?.value,
  min: document.querySelector('input[name=requiredNumberOfPeople], #requiredNumberOfPeople')?.value,
  max: document.querySelector('input[name=availableNumberOfPeople], #availableNumberOfPeople')?.value,
}));
console.log('【读回】names', names);
if (names.mgmt !== INTERNAL || names.max !== '9') failExit('name/capacity FAIL');

// 私人
console.log('\n【将要】私人的');
let priv = await page.evaluate(() => ({
  checked: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
  id: document.querySelector('input[name=tourTypes][value="0"]')?.id,
}));
if (!priv.checked && priv.id) {
  await page.locator(`label[for="${priv.id}"]`).first().click({ timeout: 8000 });
  await sleep(400);
}
priv = await page.evaluate(() => ({
  checked: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
}));
console.log('【读回】private', priv);
if (!priv.checked) {
  // fallback visible text
  await page.getByText(/^私人/).first().click({ timeout: 5000 }).catch(() => {});
  await sleep(400);
  priv = await page.evaluate(() => ({
    checked: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
  }));
  console.log('【读回】private retry', priv);
}
if (!priv.checked) failExit('private FAIL');
console.log('【结果】PASS 私人的');

async function tickSheet(openRe, variants, tag) {
  console.log(`\n【将要】${tag} → ${variants[0]}`);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);
  await page.getByRole('button', { name: openRe }).first().click({ timeout: 10000 });
  await sleep(1500);
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
      if (!inp?.checked) {
        lab.scrollIntoView({ block: 'center' });
        lab.click();
      }
      return { found: true, w, after: !!document.getElementById(forId)?.checked, forId };
    }, want);
    console.log('【读回】', r);
    if (r.after) {
      hit = r;
      break;
    }
  }
  if (!hit) {
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }
  const conf = page.getByRole('button', { name: /^(已选|已選)$/ });
  if (await conf.count()) await conf.last().click({ timeout: 8000 });
  await sleep(1200);
  console.log('【结果】PASS', tag);
  return true;
}

if (!(await tickSheet(/选择类别（主题）|選擇類別/, ['司机提供车辆', '기사제공차량'], '主题')))
  failExit('theme FAIL');
if (!(await tickSheet(/选择语言|選擇語言|选择你的语言/, ['韩语', '韓語', '한국어'], '语言')))
  failExit('lang FAIL');

const gate = await page.evaluate(() => {
  const body = document.body.innerText;
  return {
    private: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
    mgmt: document.querySelector('input[name=managementTitle], #managementTitle')?.value,
    min: document.querySelector('input[name=requiredNumberOfPeople], #requiredNumberOfPeople')?.value,
    max: document.querySelector('input[name=availableNumberOfPeople], #availableNumberOfPeople')?.value,
    theme: /司机提供车辆|기사제공차량/.test(body),
    lang: /韩语|韓語|한국어/.test(body),
  };
});
console.log('【读回】gate', gate);
if (!gate.private || !gate.theme || !gate.lang || gate.max !== '9')
  failExit('attrs gate FAIL ' + JSON.stringify(gate));

// §56 POI 真验收 → 通过后才点「保存然后」（未过禁止 goto 介绍）
try {
  await clickSaveThenAfterPoiGate(page, {
    profileId: 'KIX',
    productKo: PRODUCT_KO,
    internal: INTERNAL,
    autoFix: true,
    maxRetries: 2,
  });
} catch (e) {
  if (e instanceof PoiGateError) {
    console.log('【结果】FAIL §56', e.step, e.message, e.readback);
    failExit('POI/saveThen gate FAIL: ' + e.message);
  }
  throw e;
}
await page.waitForURL(/introduction|regulations|option/, { timeout: 60000 }).catch(() => {});
await sleep(2500);
console.log('【结果】PASS attrs →', page.url());
process.exit(0);
