/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Continue Pearl regulations from stuck include modal.
 * Flow: include → resv → voucher → 保存然后
 * Never 提交审核 / 批准
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const INCLUDE_TRANSPORT = '상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량 이동 및 주차비 포함';
const INCLUDE_PICKUP = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE =
  '가이드, 팁, 동방명주탑 티켓, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

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
  'KAKAO_TALK_ID-required',
  'MESSAGING_APP_ID-required',
  'NUMBER_OF_PEOPLE-required',
  'NUMBER_OF_SUITCASES-required',
];

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
if (!page) throw new Error('no partner page');
await page.bringToFront().catch(() => {});
console.log('START', page.url());

async function dismissLeave() {
  const elim = page.getByRole('button', { name: /^消除$/ });
  if ((await elim.count()) > 0) {
    await elim.last().click().catch(() => {});
    console.log('  dismissed leave with 消除');
    await sleep(400);
    return true;
  }
  return false;
}

async function hasDialog() {
  return (await page.locator('[role=dialog]').count()) > 0;
}

function setNative(el, val) {
  // called inside page.evaluate
}

async function setInputValue(sel, val) {
  return page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const proto =
        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc?.set) desc.set.call(el, val);
      else el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value === val || (el.value && el.value.length > 0);
    },
    { sel, val },
  );
}

// ——— A. Include modal ———
console.log('\n=== INCLUDE ===');
if (page.url().includes('option-attribute') || (await hasDialog())) {
  // close first to reset
  const closeBtn = page.locator('[role=dialog] button').filter({ hasText: /^关闭$/ });
  if ((await closeBtn.count()) > 0) {
    await closeBtn.click();
    await sleep(600);
    // if leave confirm: 确定 discard to clean reopen
    const okBtn = page.getByRole('button', { name: /^确定$/ });
    if ((await okBtn.count()) > 0) {
      await okBtn.last().click();
      console.log('  discarded dirty include modal');
      await sleep(800);
    } else {
      await dismissLeave();
    }
  }
  // X button
  if (await hasDialog()) {
    await page.locator('[role=dialog] button[aria-label="关闭"]').click().catch(() => {});
    await sleep(500);
    const okBtn = page.getByRole('button', { name: /^确定$/ });
    if ((await okBtn.count()) > 0) await okBtn.last().click();
    await sleep(500);
  }
}

// clear hash if stuck
if (page.url().includes('option-attribute')) {
  await page.evaluate(() => {
    history.replaceState(null, '', location.pathname + location.search);
  });
  await sleep(300);
}

// Open 撰写
await page.getByRole('button', { name: /撰写|撰寫/ }).first().click();
console.log('  opened 撰写');
await sleep(1500);

// Check TRANSPORTATION + PICK_UP once only if unchecked
await page.evaluate(() => {
  for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP']) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (!el.checked) {
      const lab = el.closest('label') || el.parentElement;
      lab?.click();
    }
  }
});
await sleep(600);

// Verify checked
const checked = await page.evaluate(() => ({
  tr: document.getElementById('inclusions_TRANSPORTATION')?.checked,
  pu: document.getElementById('inclusions_PICK_UP')?.checked,
}));
console.log('  checked', checked);

// Fill descriptions — playwright fill first, then native backup
for (const [sel, val] of [
  ['#inclusions_TRANSPORTATION_description', INCLUDE_TRANSPORT],
  ['#inclusions_PICK_UP_description', INCLUDE_PICKUP],
  ['#exclusions', EXCLUDE],
]) {
  const loc = page.locator(sel);
  if ((await loc.count()) === 0) {
    console.log('  missing', sel);
    continue;
  }
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ force: true });
  await loc.fill(val);
  const v = await loc.inputValue();
  console.log('  filled', sel, 'len', v.length);
  if (v.length < 5) {
    await setInputValue(sel, val);
    console.log('  native fallback', sel);
  }
}
await sleep(400);

// Scroll save into view and real mouse click
const saveBox = await page.locator('[role=dialog] button').filter({ hasText: /^保存$/ }).boundingBox();
console.log('  save box', saveBox);
if (saveBox) {
  // move + down + up + click for realism
  await page.mouse.move(saveBox.x + saveBox.width / 2, saveBox.y + saveBox.height / 2);
  await page.mouse.down();
  await sleep(50);
  await page.mouse.up();
  console.log('  mouse up/down 保存');
} else {
  await page.locator('[role=dialog] button').filter({ hasText: /^保存$/ }).click({ force: true });
}
await sleep(2000);

let stillOpen = await hasDialog();
console.log('  dialog after save?', stillOpen, page.url());

if (stillOpen) {
  // Try focusing save and pressing Enter/Space
  await page.locator('[role=dialog] button').filter({ hasText: /^保存$/ }).focus();
  await page.keyboard.press('Enter');
  await sleep(1500);
  stillOpen = await hasDialog();
  console.log('  after Enter?', stillOpen);
}

if (stillOpen) {
  // Walk React props for onClick and call with more complete event
  const r = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('[role=dialog] button')).find(
      (b) => (b.innerText || '').trim() === '保存',
    );
    if (!btn) return 'no-btn';
    const propsKey = Object.keys(btn).find((k) => k.startsWith('__reactProps'));
    const props = propsKey ? btn[propsKey] : null;
    if (!props?.onClick) return { keys: Object.keys(btn), propsKey };
    try {
      const ev = {
        preventDefault() {},
        stopPropagation() {},
        nativeEvent: { stopImmediatePropagation() {} },
        target: btn,
        currentTarget: btn,
        type: 'click',
        bubbles: true,
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
        persist() {},
      };
      const ret = props.onClick(ev);
      return { called: true, ret: String(ret), type: typeof ret };
    } catch (e) {
      return { err: e.message };
    }
  });
  console.log('  react onClick', r);
  if (r?.ret && r.type === 'object') {
    // promise?
    await sleep(2000);
  }
  await sleep(1500);
  stillOpen = await hasDialog();
  console.log('  after react onClick?', stillOpen);
}

// If still open, try 运输 only (uncheck pickup) — playbook sometimes uses 运输+其他
if (stillOpen) {
  console.log('  try TRANSPORTATION + ETC pattern');
  await page.evaluate(() => {
    const pu = document.getElementById('inclusions_PICK_UP');
    if (pu?.checked) (pu.closest('label') || pu).click();
    const etc = document.getElementById('inclusions_ETC');
    if (etc && !etc.checked) (etc.closest('label') || etc).click();
  });
  await sleep(500);
  // fill etc description if appears
  const etcDesc = page.locator('#inclusions_ETC_description');
  if ((await etcDesc.count()) > 0) {
    await etcDesc.fill(INCLUDE_PICKUP);
    console.log('  filled ETC desc');
  }
  // ensure transport still filled
  await page.locator('#inclusions_TRANSPORTATION_description').fill(INCLUDE_TRANSPORT);
  await page.locator('#exclusions').fill(EXCLUDE);
  await sleep(300);
  const box = await page.locator('[role=dialog] button').filter({ hasText: /^保存$/ }).boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(2000);
  stillOpen = await hasDialog();
  console.log('  after ETC pattern?', stillOpen);
}

// Last resort: close modal, continue with resv/voucher — include may be optional soft?
if (stillOpen) {
  console.log('  WARN: include modal still open — force close with 关闭+确定');
  await page.locator('[role=dialog] button').filter({ hasText: /^关闭$/ }).click().catch(() => {});
  await sleep(500);
  const okBtn = page.getByRole('button', { name: /^确定$/ });
  if ((await okBtn.count()) > 0) await okBtn.last().click();
  await sleep(800);
  await dismissLeave();
  // strip hash
  await page.evaluate(() => history.replaceState(null, '', location.pathname + location.search));
}

const includeOnPage = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    hasTr: t.includes('동방명주탑') && t.includes('주차비'),
    hasPu: t.includes('픽업/샌딩'),
  };
});
console.log('  include on page', includeOnPage);

// ——— B. Basic fields re-ensure ———
console.log('\n=== BASIC REGS FIELDS ===');
async function fill(sel, val, label) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.fill(String(val));
  console.log('  ', label, val);
  return true;
}
await fill('#minimumPurchaseDay', '3', 'minDay');
await fill('#minimumPurchaseQuantityPerSession', '1', 'minQty');
await fill('#maximumPurchaseQuantityPerSession', '10', 'maxQty');
await page.locator('input[name=bookingConfirmType][value=MANUAL]').click({ force: true }).catch(() => {});
await fill('#confirmationLeadTimeValue', '3', 'confirmDays');
await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
await page.locator('input[name=isCancelType][value="1"]').click({ force: true }).catch(() => {});
await page.locator('input[name=isPartnerConfirm][value="true"]').click({ force: true }).catch(() => {});
await fill('input[name="windows.0.deadline"]', '2', 'deadline');
await fill('input[name="windows.0.penalty"]', '0', 'penalty');

// inventory no
await page.locator('input[name="range-select.inventory-managed"][value=RIGHT]').click({ force: true }).catch(() => {});

// Retry include if not on page
if (!includeOnPage.hasTr) {
  console.log('\n=== RETRY INCLUDE ===');
  await page.getByRole('button', { name: /撰写/ }).first().click();
  await sleep(1200);
  await page.evaluate(() => {
    for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP']) {
      const el = document.getElementById(id);
      if (el && !el.checked) (el.closest('label') || el).click();
    }
  });
  await sleep(400);
  if (await page.locator('#inclusions_TRANSPORTATION_description').count())
    await page.locator('#inclusions_TRANSPORTATION_description').fill(INCLUDE_TRANSPORT);
  if (await page.locator('#inclusions_PICK_UP_description').count())
    await page.locator('#inclusions_PICK_UP_description').fill(INCLUDE_PICKUP);
  if (await page.locator('#exclusions').count()) await page.locator('#exclusions').fill(EXCLUDE);

  // Click dark save by evaluating getBoundingClientRect of last footer button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role=dialog] button'));
    const save = btns.find((b) => (b.innerText || '').trim() === '保存');
    if (save) {
      save.focus();
      save.click();
    }
  });
  await sleep(2500);
  console.log('  retry dialog?', await hasDialog(), page.url());
  if (await hasDialog()) {
    // screenshot for debug
    await page.screenshot({ path: '/Users/mac/nol/nol-listing-automation/pearl-include-stuck.png' });
  }
}

// ——— C. Representative reservation ———
console.log('\n=== RESV ===');
await dismissLeave();
// close any leftover dialog
if (await hasDialog()) {
  await page.keyboard.press('Escape');
  await sleep(400);
  await dismissLeave();
  const okBtn = page.getByRole('button', { name: /^确定$/ });
  if ((await okBtn.count()) > 0) await okBtn.last().click().catch(() => {});
  await sleep(400);
}

await page.getByRole('button', { name: /代表预约信息|代表預約信息/ }).first().click({ force: true });
console.log('  opened resv');
await sleep(2000);

for (const rid of RESV_IDS) {
  let ok = false;
  for (let a = 0; a < 25; a++) {
    ok = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) {
        const scrollers = Array.from(document.querySelectorAll('*')).filter((e) => {
          const s = getComputedStyle(e);
          return (
            (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
            e.scrollHeight > e.clientHeight + 50 &&
            e.clientHeight > 80
          );
        });
        scrollers.sort((a, b) => b.clientHeight - a.clientHeight);
        if (scrollers[0]) scrollers[0].scrollTop += 120;
        return false;
      }
      el.scrollIntoView({ block: 'center' });
      if (el.checked) return true;
      // click visible role=checkbox near
      let n = el;
      for (let i = 0; i < 8; i++) {
        n = n.parentElement;
        if (!n) break;
        const role = n.querySelector('[role=checkbox]');
        if (role) {
          const aria = role.getAttribute('aria-checked');
          if (aria !== 'true') role.click();
          break;
        }
      }
      if (!el.checked) {
        const lab = el.closest('label');
        lab?.click();
      }
      if (!el.checked) {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return !!el.checked || el.getAttribute('aria-checked') === 'true';
    }, rid);
    if (ok) break;
    await sleep(80);
  }
  console.log(ok ? '  ✓' : '  ✗', rid);
}
await sleep(400);

// Confirm 已选
const selected = page.getByRole('button', { name: /^已选$|^已選$/ });
if ((await selected.count()) > 0) {
  await selected.last().click();
  console.log('  confirmed 已选');
  await sleep(1500);
}

const resvSummary = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    stillRed: /须填写「代表预约信息」/.test(t),
    hasPhone: /电话|電話|手机/.test(t),
    snippet: (t.match(/代表预约信息[\s\S]{0,200}/) || [''])[0].slice(0, 200),
  };
});
console.log('  resv summary', resvSummary);

// ——— D. Voucher ———
console.log('\n=== VOUCHER ===');
const vOpen = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) =>
    /选择优惠券|選擇優惠券|代金券|选择凭证|選擇憑證|注册凭证|登錄憑證|凭证使用/.test(x.innerText || ''),
  );
  if (b) {
    b.click();
    return (b.innerText || '').trim().slice(0, 40);
  }
  return null;
});
console.log('  open voucher', vOpen);
await sleep(2000);

const vPick = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('div,li,button,label')).filter((d) => {
    const t = (d.innerText || '').replace(/\s+/g, ' ').trim();
    const r = d.getBoundingClientRect();
    return (
      r.width > 80 &&
      r.height > 30 &&
      r.y > 50 &&
      t.length < 200 &&
      (/예약정보로 확인/.test(t) || (/无需换货|無需換貨/.test(t) && /预约|預訂|예약/.test(t)))
    );
  });
  cards.sort((a, b) => a.innerText.length - b.innerText.length);
  if (cards[0]) {
    cards[0].click();
    return cards[0].innerText.replace(/\s+/g, ' ').slice(0, 100);
  }
  return null;
});
console.log('  pick', vPick);
await sleep(800);

// If template list needs 已选
const confV = page.getByRole('button', { name: /^已选$|^已選$|^完成$|^节省$|^節省$|^确认$|^確認$/ });
if ((await confV.count()) > 0 && !(await confV.last().isDisabled().catch(() => true))) {
  await confV.last().click();
  console.log('  voucher confirm');
  await sleep(1000);
}

// Wait for card selection to stick (some UIs auto-close)
await sleep(1000);

// ——— E. Final gate ———
console.log('\n=== FINAL GATE ===');
const final = await page.evaluate(() => {
  const redMsgs = [];
  document.querySelectorAll('p, span, div').forEach((el) => {
    if (el.children.length > 2) return;
    const cs = getComputedStyle(el);
    const m = cs.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const txt = (el.innerText || '').trim();
    if (!txt || txt.length > 80) return;
    if (m && +m[1] > 180 && +m[2] < 100 && +m[3] < 100) redMsgs.push(txt);
  });
  const saveThen = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  const temp = Array.from(document.querySelectorAll('button')).find((b) =>
    /临时保存|臨時存儲/.test(b.innerText || ''),
  );
  return {
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
    tempDisabled: temp?.disabled ?? 'missing',
    url: location.href,
    hasInclude: /주차비|픽업/.test(document.body.innerText),
    hasVoucher: /예약정보|无需换货|無需換貨/.test(document.body.innerText),
  };
});
console.log(JSON.stringify(final, null, 2));

if (final.saveThenDisabled === false) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).click();
  console.log('✓ 保存然后');
  await sleep(4000);
  console.log('AFTER', page.url());
} else {
  // temp save progress
  const temp = page.getByRole('button', { name: /临时保存|臨時存儲/ });
  if ((await temp.count()) && !(await temp.first().isDisabled())) {
    await temp.first().click();
    console.log('temp saved (regs incomplete)');
    await sleep(2000);
  }
}

process.exit(0);
