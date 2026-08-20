/**
 * Finish Pearl regulations: basics + resv + voucher → 保存然后
 * Include already on page.
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

// dismiss any dialog
if (await page.locator('[role=dialog]').count()) {
  await page.keyboard.press('Escape');
  await sleep(400);
}

async function fill(sel, val, label) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) {
    console.log('miss', label, sel);
    return false;
  }
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ force: true });
  await loc.fill('');
  await loc.fill(String(val));
  await loc.blur().catch(() => {});
  console.log('✓', label, '=', val, '->', await loc.inputValue());
  return true;
}

console.log('\n1) basics');
await fill('#minimumPurchaseDay', '3', 'minDay');
await fill('#minimumPurchaseQuantityPerSession', '1', 'minQty');
await fill('#maximumPurchaseQuantityPerSession', '10', 'maxQty');

// inventory 不设置
await page.locator('label').filter({ hasText: /不设置库存|不設置庫存/ }).click().catch(() => {});
await page.locator('input[name="range-select.inventory-managed"][value=RIGHT]').click({ force: true }).catch(() => {});

// MANUAL confirm + 3 DAYS
await page.locator('input[name=bookingConfirmType][value=MANUAL]').click({ force: true }).catch(() => {});
await page.getByText(/人工确认|手動確認|手动确认/).first().click().catch(() => {});
await fill('#confirmationLeadTimeValue', '3', 'confirmVal');
const typeSel = page.locator('select[name=confirmationLeadTimeType]');
if (await typeSel.count()) {
  // options may be MINUTES/HOURS/DAYS
  const opts = await typeSel.locator('option').allTextContents();
  console.log('confirm type options', opts);
  await typeSel.selectOption({ value: 'DAYS' }).catch(async () => {
    await typeSel.selectOption({ label: /天|日|DAYS|영업일/i }).catch(() => {});
  });
  console.log('confirm type', await typeSel.inputValue());
}

// cancel
await page.locator('input[name=isCancelType][value="1"]').click({ force: true }).catch(() => {});
await page.getByText(/^可取消$|^가능$/).first().click().catch(() => {});
await page.locator('input[name=isPartnerConfirm][value="true"]').click({ force: true }).catch(() => {});
await page.getByText(/是（手动取消）|是\(手动取消\)|手动取消/).first().click().catch(() => {});
await fill('input[name="windows.0.deadline"]', '2', 'deadline');
await fill('input[name="windows.0.penalty"]', '0', 'penalty');

console.log('\n2) resv');
await page.getByRole('button', { name: /代表预约信息|代表預約信息/ }).click({ force: true, timeout: 15000 });
await sleep(2000);
console.log('resv opened', page.url());

for (const rid of RESV_IDS) {
  let ok = false;
  for (let a = 0; a < 35; a++) {
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
        if (scrollers[0]) scrollers[0].scrollTop += 150;
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
        el.click();
      }
      if (!el.checked) {
        el.checked = true;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return !!el.checked;
    }, rid);
    if (ok) break;
    await sleep(60);
  }
  console.log(ok ? '✓' : '✗', rid);
}

await sleep(300);
const yixuan = page.getByRole('button', { name: /^已选$|^已選$/ });
if (await yixuan.count()) {
  await yixuan.last().click();
  console.log('已选');
  await sleep(1500);
}

console.log(
  'resv red?',
  await page.evaluate(() => /须填写「代表预约信息」/.test(document.body.innerText)),
);
console.log(
  'resv snip',
  await page.evaluate(
    () => (document.body.innerText.match(/代表预约信息[\s\S]{0,200}/) || [''])[0].slice(0, 200),
  ),
);

console.log('\n3) voucher');
const vBtn = page.getByRole('button', { name: /选择凭证|選擇憑證|选择优惠券|凭证及其使用|代金券/ });
if (await vBtn.count()) {
  await vBtn.first().click();
  console.log('opened voucher');
} else {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /凭证|优惠券|代金券/.test(b.innerText || ''))
      ?.click();
  });
}
await sleep(2500);

// pick template card
const picked = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('div,li,button,label')).filter((d) => {
    const t = (d.innerText || '').replace(/\s+/g, ' ').trim();
    const r = d.getBoundingClientRect();
    return (
      r.width > 120 &&
      r.height > 50 &&
      r.y > 100 &&
      r.y < 850 &&
      t.length > 8 &&
      t.length < 200 &&
      (/예약정보로 확인/.test(t) ||
        (/无需换货|無需換貨/.test(t) && /预约|예약|预订|確認|确认/.test(t)))
    );
  });
  cards.sort((a, b) => a.innerText.length - b.innerText.length);
  if (!cards.length) {
    // any template card
    const any = Array.from(document.querySelectorAll('div')).filter((d) => {
      const t = (d.innerText || '').trim();
      const r = d.getBoundingClientRect();
      return r.width > 200 && r.height > 60 && r.y > 150 && t.length > 5 && t.length < 100 && /seat|인승|确认|確認|정보/.test(t);
    });
    any.sort((a, b) => a.innerText.length - b.innerText.length);
    if (any[0]) {
      any[0].click();
      return 'fallback:' + any[0].innerText.slice(0, 80);
    }
    return null;
  }
  cards[0].click();
  return cards[0].innerText.replace(/\s+/g, ' ').slice(0, 120);
});
console.log('picked', picked);
await sleep(1500);

// confirm
for (const re of [/^已选$/, /^已選$/, /^完成$/, /^确认$/, /^確認$/, /^节省$/, /^節省$/]) {
  const b = page.getByRole('button', { name: re });
  if ((await b.count()) && !(await b.last().isDisabled().catch(() => true))) {
    await b.last().click();
    console.log('confirm', re);
    await sleep(1000);
    break;
  }
}

if (await page.locator('[role=dialog]').count()) {
  await page.keyboard.press('Escape');
  await sleep(500);
}

// Re-fill basics once more (page may reset)
console.log('\n4) re-fill basics');
await fill('#minimumPurchaseDay', '3', 'minDay');
await fill('#minimumPurchaseQuantityPerSession', '1', 'minQty');
await fill('#maximumPurchaseQuantityPerSession', '10', 'maxQty');
await fill('#confirmationLeadTimeValue', '3', 'confirmVal');
await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
await page.locator('input[name=bookingConfirmType][value=MANUAL]').click({ force: true }).catch(() => {});
await page.locator('input[name=isCancelType][value="1"]').click({ force: true }).catch(() => {});
await page.locator('input[name=isPartnerConfirm][value="true"]').click({ force: true }).catch(() => {});
await fill('input[name="windows.0.deadline"]', '2', 'deadline');
await fill('input[name="windows.0.penalty"]', '0', 'penalty');

await sleep(500);
const final = await page.evaluate(() => {
  const redMsgs = [];
  document.querySelectorAll('p, span, div').forEach((el) => {
    if (el.children.length > 2) return;
    const cs = getComputedStyle(el);
    const m = cs.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const txt = (el.innerText || '').trim();
    if (!txt || txt.length > 90) return;
    if (m && +m[1] > 180 && +m[2] < 100 && +m[3] < 100) redMsgs.push(txt);
  });
  const saveThen = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  const temp = Array.from(document.querySelectorAll('button')).find((b) =>
    /临时保存|臨時存儲/.test(b.innerText || ''),
  );
  // form values
  const vals = {
    minDay: document.querySelector('#minimumPurchaseDay')?.value,
    minQty: document.querySelector('#minimumPurchaseQuantityPerSession')?.value,
    maxQty: document.querySelector('#maximumPurchaseQuantityPerSession')?.value,
    confirm: document.querySelector('#confirmationLeadTimeValue')?.value,
    confirmType: document.querySelector('select[name=confirmationLeadTimeType]')?.value,
    deadline: document.querySelector('input[name="windows.0.deadline"]')?.value,
    penalty: document.querySelector('input[name="windows.0.penalty"]')?.value,
    manual: document.querySelector('input[name=bookingConfirmType][value=MANUAL]')?.checked,
    cancel: document.querySelector('input[name=isCancelType][value="1"]')?.checked,
    partner: document.querySelector('input[name=isPartnerConfirm][value="true"]')?.checked,
  };
  return {
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
    tempDisabled: temp?.disabled ?? 'missing',
    vals,
    hasInclude: /주차비|픽업/.test(document.body.innerText),
    hasVoucher: /예약정보|无需换货|無需換貨|凭证/.test(document.body.innerText),
  };
});
console.log('\nFINAL', JSON.stringify(final, null, 2));

if (final.saveThenDisabled === false) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).click();
  console.log('✓ 保存然后');
  await sleep(4000);
  console.log('AFTER', page.url());
} else if (final.tempDisabled === false) {
  await page.getByRole('button', { name: /临时保存|臨時存儲/ }).click();
  console.log('temp saved');
  await sleep(2500);
} else {
  console.log('both disabled — dump formik errors');
  const errs = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.innerText || '').includes('代表预约'),
    );
    const fk = Object.keys(el || {}).find((k) => k.startsWith('__reactFiber'));
    let f = el?.[fk];
    for (let i = 0; i < 80 && f; i++) {
      if (f.memoizedProps?.value?.errors) {
        return {
          errors: f.memoizedProps.value.errors,
          valuesSnippet: {
            minQty: f.memoizedProps.value.values?.minimumPurchaseQuantityPerSession,
            windows: f.memoizedProps.value.values?.windows,
            confirm: f.memoizedProps.value.values?.confirmationLeadTimeValue,
            confirmType: f.memoizedProps.value.values?.confirmationLeadTimeType,
            voucher: f.memoizedProps.value.values?.voucherRuleId,
            perBooking: f.memoizedProps.value.values?.perBooking,
            booking: f.memoizedProps.value.values?.booking,
          },
        };
      }
      f = f.return;
    }
    return null;
  });
  console.log(JSON.stringify(errs, null, 2));
}

process.exit(0);
