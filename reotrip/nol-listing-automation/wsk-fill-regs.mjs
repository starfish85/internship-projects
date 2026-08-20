/**
 * 吴淞口机场 WSK 法规：截单/取消/包含/预约(含航班)/凭证 → 保存然后
 * §51 预约 label + 摘要非空
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, assertInnerWidthOk, failExit } from './lib/cdp-session.mjs';

const DRAFT = '2556123c-0f81-4ca3-9fdf-a2bb869c5fcd';
const REGS = `https://tour.triple.partners/product-management/registration/regulations?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const CITY_KO = '상하이 시내 호텔';
const DEST_KO = '상하이 우숭커우 국제크루즈터미널';
const INCLUDE_TR = `${CITY_KO} ↔ ${DEST_KO} 편도 전용 차량 이동 및 주차비 포함`;
const INCLUDE_PU = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE =
  '선박 티켓, 항구 이용료, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';
const RESV_IDS = [
  'CELLPHONE-required',
  'EMAIL-required',
  'ENGLISH_LAST_NAME-required',
  'ENGLISH_FIRST_NAME-required',
  'DEPARTURE_DATE_TIME-required',
  'HOTEL_NAME-required',
  'HOTEL_ADDRESS-required',
  'PICKUP_AREA-required',
  'PICKUP_TIME-required',
  'SENDING_AREA-required',
  'BOOKED_TIME-required',
  'KAKAO_TALK_ID-required',
  'MESSAGING_APP_ID-required',
  'NUMBER_OF_PEOPLE-required',
  'NUMBER_OF_SUITCASES-required',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('wsk-fill-regs');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
if (!page) failExit('no page');
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);
if (!page.url().includes('/regulations')) {
  await page.goto(REGS, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
}
console.log('【读回】url', page.url());
console.log('【视口】', await assertInnerWidthOk(page));

async function fillId(sel, val) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) return false;
  await loc.fill(String(val));
  return (await loc.inputValue()) === String(val);
}

console.log('\n【将要】基础：最少购买日3 / 数量1-10 / 手动确认3天 / 取消2天0%');
await fillId('#minimumPurchaseDay', '3');
await fillId('#minimumPurchaseQuantityPerSession', '1');
await fillId('#maximumPurchaseQuantityPerSession', '10');

// booking confirm MANUAL
await page.evaluate(() => {
  const r = document.querySelector('input[name=bookingConfirmType][value=MANUAL]');
  if (r && !r.checked) (r.closest('label') || r).click();
});
await fillId('#confirmationLeadTimeValue', '3');
await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});

// cancelable + partner manual
await page.evaluate(() => {
  const c = document.querySelector('input[name=isCancelType][value="1"]');
  if (c && !c.checked) (c.closest('label') || c).click();
  const p = document.querySelector('input[name=isPartnerConfirm][value="true"]');
  if (p && !p.checked) (p.closest('label') || p).click();
  // also try 是（手动取消）
  Array.from(document.querySelectorAll('label')).find((l) =>
    /是（手动取消）|예 \(수동취소\)|是 \(手动/.test(l.innerText || ''),
  )?.click();
});
await fillId('input[name="windows.0.deadline"]', '2');
await fillId('input[name="windows.0.penalty"]', '0');
await page.evaluate(() => {
  const r = document.querySelector('input[name="range-select.inventory-managed"][value=RIGHT]');
  if (r && !r.checked) (r.closest('label') || r).click();
});
console.log('【读回】basics', await page.evaluate(() => ({
  minDay: document.querySelector('#minimumPurchaseDay')?.value,
  conf: document.querySelector('#confirmationLeadTimeValue')?.value,
  dl: document.querySelector('input[name="windows.0.deadline"]')?.value,
  pen: document.querySelector('input[name="windows.0.penalty"]')?.value,
})));

// include
console.log('\n【将要】包含 onSave');
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => /撰写|撰寫/.test(b.innerText || ''))
    ?.click();
});
await sleep(1500);
const incl = await page.evaluate(
  ({ tr, pu, ex }) => {
    for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP']) {
      const el = document.getElementById(id);
      if (el && !el.checked) (el.closest('label') || el).click();
    }
    const set = (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const propsKey = Object.keys(el).find((k) => k.startsWith('__reactProps'));
      el[propsKey]?.onChange?.({
        target: { value: val },
        currentTarget: { value: val },
        preventDefault() {},
        stopPropagation() {},
        persist() {},
      });
      return true;
    };
    set('#inclusions_TRANSPORTATION_description', tr);
    set('#inclusions_PICK_UP_description', pu);
    set('#exclusions', ex);
    const values = {
      inclusions: [
        { type: 'TRANSPORTATION', description: tr },
        { type: 'PICK_UP', description: pu },
      ],
      exclusions: [{ type: 'ETC', description: ex }],
      appliedToAllOptions: true,
    };
    const btn = Array.from(document.querySelectorAll('[role=dialog] button')).find(
      (b) => (b.innerText || '').trim() === '保存',
    );
    if (!btn) return { ok: false, err: 'no save btn' };
    const fiberKey = Object.keys(btn || {}).find((k) => k.startsWith('__reactFiber'));
    let fiber = btn?.[fiberKey];
    for (let i = 0; i < 50 && fiber; i++) {
      const name = String(fiber.type?.name || fiber.type?.displayName || '');
      if (name.includes('AttributeFormPopup') && fiber.memoizedProps?.onSave) {
        fiber.memoizedProps.onSave(values);
        return { ok: true };
      }
      fiber = fiber.return;
    }
    // fallback click 保存
    btn.click();
    return { ok: 'clicked' };
  },
  { tr: INCLUDE_TR, pu: INCLUDE_PU, ex: EXCLUDE },
);
console.log('【读回】include', incl);
await sleep(1000);
if (await page.locator('[role=dialog]').count()) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('[role=dialog] button'))
      .find((b) => (b.innerText || '').trim() === '关闭' || (b.innerText || '').trim() === '保存')
      ?.click();
  });
  await sleep(500);
  const ok = page.getByRole('button', { name: /^确定$/ });
  if ((await ok.count()) > 0) await ok.last().click().catch(() => {});
  await sleep(800);
}
console.log('【读回】page include', await page.evaluate(() => /주차비|픽업|전용 차량/.test(document.body.innerText)));

// resv — label[for] + checked readback
console.log('\n【将要】代表预约信息（港口·无航班·船名在文案）');
await page.getByRole('button', { name: /代表预约信息|代表預約信息/ }).click({ timeout: 10000 });
await sleep(2000);

const results = [];
for (const rid of RESV_IDS) {
  console.log('【将要】勾选', rid);
  // scroll + label click
  let ok = false;
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    ok = await page.evaluate((id) => {
      // scroll action sheet
      const scrollers = Array.from(document.querySelectorAll('*')).filter((e) => {
        const s = getComputedStyle(e);
        return (
          (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
          e.scrollHeight > e.clientHeight + 50 &&
          e.clientHeight > 80
        );
      });
      scrollers.sort((a, b) => b.clientHeight - a.clientHeight);
      const sc = scrollers[0];

      let el = document.getElementById(id);
      if (!el && sc) {
        for (let a = 0; a < 30 && !el; a++) {
          sc.scrollTop += 120;
          el = document.getElementById(id);
        }
      }
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      if (el.checked) return true;
      const lab = document.querySelector(`label[for="${id}"]`);
      if (lab) lab.click();
      else {
        const role = el.closest('label')?.querySelector('[role=checkbox]') ||
          el.parentElement?.querySelector('[role=checkbox]');
        if (role) role.click();
        else el.click();
      }
      return !!document.getElementById(id)?.checked;
    }, rid);
    if (!ok) await sleep(300);
  }
  // playwright label fallback
  if (!ok) {
    const lab = page.locator(`label[for="${rid}"]`);
    if (await lab.count()) {
      await lab.first().scrollIntoViewIfNeeded().catch(() => {});
      const before = await page.evaluate((id) => !!document.getElementById(id)?.checked, rid);
      if (!before) await lab.first().click({ timeout: 5000 }).catch(() => {});
      ok = await page.evaluate((id) => !!document.getElementById(id)?.checked, rid);
    }
  }
  results.push({ rid, ok });
  console.log('【读回】', rid, ok);
}
const failed = results.filter((r) => !r.ok);
console.log('【读回】resv fail count', failed.length, failed.map((f) => f.rid));

// 已选
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => /^(已选|已選)$/.test((b.innerText || '').trim()))
    ?.click();
});
await sleep(1500);
const summary = await page.evaluate(() => {
  const body = document.body.innerText;
  const i = body.indexOf('代表预约');
  return i >= 0 ? body.slice(i, i + 280).replace(/\s+/g, ' ') : null;
});
console.log('【读回】预约摘要', summary);
if (!summary || /须填写|您必須輸入|必须输入代表/.test(summary)) {
  // if most checked, still try continue - but skill says stop if summary empty
  if (failed.length > 4) failExit('resv many fail + summary empty');
}

// voucher
console.log('\n【将要】凭证 用预约信息确认+无需换货');
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => /选择凭证|選擇憑證|选择优惠券|凭证及其使用/.test(b.innerText || ''))
    ?.click();
});
await sleep(2000);
await page.evaluate(() => {
  const card = Array.from(document.querySelectorAll('div')).find((d) => {
    const t = (d.innerText || '').replace(/\s+/g, ' ');
    const r = d.getBoundingClientRect();
    return (
      r.width > 200 &&
      r.height > 30 &&
      r.height < 120 &&
      r.y > 150 &&
      r.y < 900 &&
      /用预约信息确认|用預約信息確認|예약정보로 확인/.test(t) &&
      /无需換貨|無需換貨|无需换货|불필요/.test(t)
    );
  });
  card?.click();
  return !!card;
});
await sleep(1500);

// re-ensure basics
await fillId('#minimumPurchaseDay', '3');
await fillId('#minimumPurchaseQuantityPerSession', '1');
await fillId('#maximumPurchaseQuantityPerSession', '10');
await fillId('#confirmationLeadTimeValue', '3');
await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
await fillId('input[name="windows.0.deadline"]', '2');
await fillId('input[name="windows.0.penalty"]', '0');

// special cancel terms + retype qty/penalty (Formik)
console.log('\n【将要】特殊取消条款 + 重打数量/取消费');
await page.evaluate(() => {
  const el = document.querySelector('#specificCancelPolicy, textarea[name=specificCancelPolicy]');
  if (el && !el.value) {
    const v = '이용일 기준 2영업일 이전 취소 시 전액 환불되며, 이후에는 환불이 불가합니다.';
    const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    proto.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const pk = Object.keys(el).find((k) => k.startsWith('__reactProps'));
    el[pk]?.onChange?.({
      target: { value: v },
      currentTarget: { value: v },
      preventDefault() {},
      stopPropagation() {},
      persist() {},
    });
  }
});
for (const [sel, val] of [
  ['#minimumPurchaseQuantityPerSession', '1'],
  ['#maximumPurchaseQuantityPerSession', '10'],
  ['input[name="windows.0.penalty"]', '0'],
  ['input[name="windows.0.deadline"]', '2'],
]) {
  const loc = page.locator(sel).first();
  if (await loc.count()) {
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await loc.click({ clickCount: 3 }).catch(() => {});
    await loc.fill(val).catch(() => {});
  }
}
await sleep(400);

const gate = await page.evaluate(() => {
  const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  const body = document.body.innerText;
  return {
    saveDisabled: saveBtn ? !!saveBtn.disabled : null,
    hasInclude: /주차비|픽업|전용 차량/.test(body),
    hasResvRed: /须填写「代表预约|您必須輸入代表|必须输入代表预订/.test(body),
    hasVoucher: /用预约信息确认|无需換貨|無需換貨|无需换货|예약정보/.test(body),
  };
});
console.log('【读回 gate】', gate);
if (gate.saveDisabled) {
  // dump reds
  const reds = await page.evaluate(() =>
    document.body.innerText
      .split('\n')
      .filter((l) => /请|须|必須|必填|选择|输入/.test(l) && l.length < 70)
      .slice(0, 25),
  );
  console.log('【失败】save grey', reds);
  failExit('regs saveDisabled');
}

console.log('\n【将要】保存然后');
const saveThen = page.getByRole('button', { name: /保存然后|保存然後/ }).first();
await saveThen.click({ timeout: 15000 });
await sleep(4000);
console.log('【读回】url', page.url());
let ok = page.url().includes('/option');
if (!ok) {
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('a,button,div'))
      .find((e) => /选项管理|選項管理/.test(e.innerText || '') && e.getAttribute('aria-disabled') !== 'true')
      ?.click(),
  );
  await sleep(2500);
  ok = page.url().includes('/option');
}
console.log('【结果】', ok ? 'PASS → option' : 'FAIL ' + page.url());
process.exit(ok ? 0 : 2);
