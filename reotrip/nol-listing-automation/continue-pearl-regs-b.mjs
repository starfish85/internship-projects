/**
 * Include already applied on page. Close modal → resv → voucher → 保存然后
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
await page.bringToFront().catch(() => {});
console.log('START', page.url());

// Close include modal - data already on form, discard dialog view only carefully
// Prefer X / 关闭 — if leave dialog asks, 消除 keeps form; but we need dialog gone
if (await page.locator('[role=dialog]').count()) {
  // Try calling onClose from ActionPopup
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('[role=dialog] button')).find(
      (b) => (b.innerText || '').trim() === '关闭' || b.getAttribute('aria-label') === '关闭',
    );
    const fiberKey = Object.keys(btn || {}).find((k) => k.startsWith('__reactFiber'));
    let fiber = btn?.[fiberKey];
    for (let i = 0; i < 40 && fiber; i++) {
      const name = fiber.type?.name || fiber.type?.displayName || '';
      if (fiber.memoizedProps?.onClose && String(name).includes('ActionPopup')) {
        fiber.memoizedProps.onClose();
        return 'closed via ActionPopup.onClose';
      }
      if (fiber.memoizedProps?.onClose && String(name).includes('Popup')) {
        fiber.memoizedProps.onClose();
        return 'closed via Popup.onClose';
      }
      fiber = fiber.return;
    }
    btn?.click();
    return 'clicked 关闭';
  }).then((r) => console.log('close', r));
  await sleep(800);

  // if leave dialog: 确定 to leave modal (form already has values from parent setField)
  const ok = page.getByRole('button', { name: /^确定$/ });
  if ((await ok.count()) > 0) {
    // Check text of leave dialog
    const leaveText = await page.evaluate(
      () => document.querySelector('[role=dialog]')?.innerText?.slice(0, 200) || '',
    );
    console.log('dialog after close attempt', leaveText.slice(0, 120));
    if (/丢失|離開|离开|변경|discard|丢失/.test(leaveText) || /确定要离开/.test(leaveText)) {
      // Parent form already has data - OK to leave modal
      await ok.last().click();
      console.log('confirmed leave modal');
      await sleep(800);
    }
  }
  // Escape
  if (await page.locator('[role=dialog]').count()) {
    await page.keyboard.press('Escape');
    await sleep(400);
    if (await page.getByRole('button', { name: /^确定$/ }).count()) {
      await page.getByRole('button', { name: /^确定$/ }).last().click();
      await sleep(500);
    }
  }
}
console.log('dialog gone?', (await page.locator('[role=dialog]').count()) === 0);
console.log(
  'include still on page?',
  await page.evaluate(() => /주차비|픽업/.test(document.body.innerText)),
);

// Re-fill basic regs fields
async function fill(sel, val, label) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.fill(String(val));
  console.log('fill', label, val);
  return true;
}
await fill('#minimumPurchaseDay', '3', 'minDay');
await fill('#minimumPurchaseQuantityPerSession', '1', 'minQty');
await fill('#maximumPurchaseQuantityPerSession', '10', 'maxQty');
await page.locator('input[name=bookingConfirmType][value=MANUAL]').click({ force: true }).catch(() => {});
await fill('#confirmationLeadTimeValue', '3', 'confirm');
await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
await page.locator('input[name=isCancelType][value="1"]').click({ force: true }).catch(() => {});
await page.locator('input[name=isPartnerConfirm][value="true"]').click({ force: true }).catch(() => {});
await fill('input[name="windows.0.deadline"]', '2', 'deadline');
await fill('input[name="windows.0.penalty"]', '0', 'penalty');
await page.locator('input[name="range-select.inventory-managed"][value=RIGHT]').click({ force: true }).catch(() => {});

// ——— RESV ———
console.log('\n=== RESV ===');
await page.getByRole('button', { name: /代表预约信息|代表預約信息/ }).first().click({ force: true });
await sleep(2000);
console.log('resv url', page.url());

for (const rid of RESV_IDS) {
  let ok = false;
  for (let a = 0; a < 30; a++) {
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
        if (scrollers[0]) scrollers[0].scrollTop += 140;
        return false;
      }
      el.scrollIntoView({ block: 'center' });
      if (el.checked) return true;
      let n = el;
      for (let i = 0; i < 8; i++) {
        n = n.parentElement;
        if (!n) break;
        const role = n.querySelector('[role=checkbox]');
        if (role) {
          if (role.getAttribute('aria-checked') !== 'true') role.click();
          break;
        }
      }
      if (!el.checked) el.closest('label')?.click();
      if (!el.checked) {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return !!el.checked;
    }, rid);
    if (ok) break;
    await sleep(70);
  }
  console.log(ok ? '✓' : '✗', rid);
}

const selBtn = page.getByRole('button', { name: /^已选$|^已選$/ });
if ((await selBtn.count()) > 0) {
  await selBtn.last().click();
  console.log('已选');
  await sleep(1500);
}

const resvCheck = await page.evaluate(() => ({
  stillRed: /须填写「代表预约信息」/.test(document.body.innerText),
  snippet: (document.body.innerText.match(/代表预约信息[\s\S]{0,180}/) || [''])[0],
}));
console.log('resv', resvCheck);

// ——— VOUCHER ———
console.log('\n=== VOUCHER ===');
const vOpen = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) =>
    /选择凭证|選擇憑證|选择优惠券|代金券|注册凭证|凭证及其使用/.test(x.innerText || ''),
  );
  if (b) {
    b.click();
    return b.innerText.trim().slice(0, 40);
  }
  return null;
});
console.log('open', vOpen);
await sleep(2000);

const vPick = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('div,li,button,label')).filter((d) => {
    const t = (d.innerText || '').replace(/\s+/g, ' ').trim();
    const r = d.getBoundingClientRect();
    return (
      r.width > 100 &&
      r.height > 40 &&
      r.y > 80 &&
      r.y < 800 &&
      t.length > 10 &&
      t.length < 180 &&
      (/예약정보로 확인/.test(t) || (/无需换货|無需換貨/.test(t) && /预约|예약|预订/.test(t)))
    );
  });
  cards.sort((a, b) => a.innerText.length - b.innerText.length);
  if (!cards[0]) return null;
  cards[0].click();
  return cards[0].innerText.replace(/\s+/g, ' ').slice(0, 120);
});
console.log('pick', vPick);
await sleep(1500);

// confirm if needed
const conf = page.getByRole('button', { name: /^已选$|^已選$|^完成$|^确认$|^確認$|^节省$|^節省$/ });
if ((await conf.count()) > 0 && !(await conf.last().isDisabled().catch(() => true))) {
  await conf.last().click().catch(() => {});
  console.log('voucher confirm');
  await sleep(1000);
}

// if still dialog
if (await page.locator('[role=dialog]').count()) {
  await page.keyboard.press('Escape');
  await sleep(500);
}

// ——— FINAL ———
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
  return {
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
    hasInclude: /주차비|픽업/.test(document.body.innerText),
    hasVoucher: /예약정보|无需换货|無需換貨/.test(document.body.innerText),
    resvRed: /须填写「代表预约信息」/.test(document.body.innerText),
  };
});
console.log('\nFINAL', JSON.stringify(final, null, 2));

if (final.saveThenDisabled === false) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).click();
  console.log('✓ 保存然后');
  await sleep(4000);
  console.log('AFTER', page.url());
} else {
  const temp = page.getByRole('button', { name: /临时保存|臨時存儲/ });
  if ((await temp.count()) && !(await temp.first().isDisabled())) {
    await temp.first().click();
    console.log('temp saved');
    await sleep(2000);
  }
  // try stepper 选项管理
  const opt = page.getByText(/选项管理|選項管理/).first();
  if ((await opt.count()) > 0) {
    const disabled = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('a,button,div,[role=tab]')).find((e) =>
        /选项管理|選項管理/.test(e.innerText || ''),
      );
      return el?.getAttribute('aria-disabled');
    });
    console.log('选项管理 aria-disabled', disabled);
    if (disabled !== 'true') {
      await opt.click().catch(() => {});
      await sleep(2000);
      console.log('stepper', page.url());
    }
  }
}

process.exit(0);
