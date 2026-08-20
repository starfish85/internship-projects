/**
 * Pop Mart regulations — ELEMENT LOCATORS ONLY (no page.mouse x,y).
 * Hidden checkboxes: locator('#id').click({ force: true })
 * Confirm: getByRole('button', { name: /已选/ })
 */
import { chromium } from 'playwright';

const DRAFT = '3851a9dd-61bb-4b8c-ad7a-e6616eb3f611';
const BASE = 'https://tour.triple.partners/product-management/registration';
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

/** Human labels in sheet (for getByText fallback) — still element, not coordinates */
const RESV_TEXT = {
  'CELLPHONE-required': /电话号码|電話號碼|휴대폰/,
  'EMAIL-required': /电子邮箱|電子郵箱|이메일/,
  'ENGLISH_LAST_NAME-required': /英文姓氏/,
  'ENGLISH_FIRST_NAME-required': /英文名字/,
  'DEPARTURE_DATE_TIME-required': /出发日期及时间|出發日期及時間/,
  'HOTEL_NAME-required': /^酒店$|^飯店$|호텔명/,
  'HOTEL_ADDRESS-required': /酒店地址|飯店地址/,
  'PICKUP_AREA-required': /上车地点|上車地點/,
  'PICKUP_TIME-required': /接驳时间|接駁時間|픽업 시간/,
  'SENDING_AREA-required': /下车地点|下車地點/,
  'KAKAO_TALK_ID-required': /Kakaotalk|카카오/,
  'MESSAGING_APP_ID-required': /信使账号|信使帳號|메신저/,
  'NUMBER_OF_PEOPLE-required': /人数|人數|인원/,
  'NUMBER_OF_SUITCASES-required': /行李|캐리어|수하물|行李箱/,
};

async function sheetOpen(page) {
  const sheet = page.locator('[role=dialog]').filter({ hasText: /选择代表预订信息|選擇代表預訂信息|必填/ });
  return (await sheet.count()) > 0;
}

async function openResv(page) {
  if (await sheetOpen(page)) return;
  await page.getByRole('button', { name: /代表预约信息|代表預約信息/ }).first().click();
  await sleep(1500);
  // wait for any of the known inputs
  await page.locator('#CELLPHONE-required').waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
}

async function tickResv(page) {
  await openResv(page);
  const sheet = page.locator('[role=dialog]').filter({ hasText: /必填|选择代表/ }).last();

  // Scroll sheet content via locator (element), not mouse wheel xy
  const content = sheet.locator('[class*="action-sheet-body__Content"], [class*="Content"]').first();
  if ((await content.count()) > 0) {
    await content.evaluate((el) => {
      el.scrollTop = 0;
    });
  }

  let ok = 0;
  for (const id of RESV_IDS) {
    const inp = page.locator(`#${id}`);
    const n = await inp.count();
    if (n === 0) {
      // scroll content and retry
      if ((await content.count()) > 0) {
        await content.evaluate((el) => {
          el.scrollTop += 200;
        });
        await sleep(100);
      }
    }
    const exists = (await inp.count()) > 0;
    if (!exists) {
      // fallback: click visible text row inside sheet
      const re = RESV_TEXT[id];
      if (re && (await sheet.count()) > 0) {
        const row = sheet.getByText(re).first();
        if ((await row.count()) > 0) {
          await row.scrollIntoViewIfNeeded().catch(() => {});
          await row.click({ force: true, timeout: 4000 }).catch(() => {});
          console.log('  text-click', id);
        } else {
          console.log('  MISSING', id);
          continue;
        }
      } else {
        console.log('  MISSING', id);
        continue;
      }
    } else {
      const on =
        (await inp.isChecked().catch(() => false)) ||
        (await inp.getAttribute('aria-checked')) === 'true';
      if (on) {
        ok++;
        console.log('  already', id);
        continue;
      }
      // Off-screen inputs (x≈-9999): Playwright force click still fails viewport check.
      // Use element DOM click / React-safe native click — still element-based, not mouse(x,y).
      await inp.evaluate((el) => {
        el.scrollIntoView?.({ block: 'nearest' });
        el.click();
      });
      await sleep(80);
      let after =
        (await inp.isChecked().catch(() => false)) ||
        (await inp.getAttribute('aria-checked')) === 'true';
      if (!after) {
        // Visible row text inside sheet (element locator)
        const re = RESV_TEXT[id];
        if (re && (await sheet.count()) > 0) {
          const row = sheet.getByText(re).first();
          if ((await row.count()) > 0) {
            await row.evaluate((el) => {
              // climb to clickable row
              let n = el;
              for (let i = 0; i < 6 && n; i++) {
                if (n.onclick || n.getAttribute?.('role') === 'checkbox' || n.tagName === 'LABEL') {
                  n.click();
                  return;
                }
                n = n.parentElement;
              }
              el.click();
            });
            await sleep(80);
          }
        }
        after =
          (await inp.isChecked().catch(() => false)) ||
          (await inp.getAttribute('aria-checked')) === 'true';
      }
      if (!after) {
        // last: set checked + dispatch events on the element itself
        await inp.evaluate((el) => {
          el.checked = true;
          el.setAttribute('aria-checked', 'true');
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.click();
        });
        await sleep(80);
        after =
          (await inp.isChecked().catch(() => false)) ||
          (await inp.getAttribute('aria-checked')) === 'true';
      }
      console.log('  tick', id, after ? 'OK' : 'FAIL');
      if (after) ok++;
    }
  }
  console.log('checked ok', ok, '/', RESV_IDS.length);

  // 已选 — element role
  const confirm = page.getByRole('button', { name: /^(已选|已選)$/ });
  await confirm.last().click({ force: true, timeout: 10000 });
  await sleep(1500);
  console.log('sheet still open?', await sheetOpen(page));
}

async function fillQty(page) {
  const map = [
    ['#minimumPurchaseDay', '3'],
    ['#minimumPurchaseQuantityPerSession', '1'],
    ['#maximumPurchaseQuantityPerSession', '10'],
    ['#confirmationLeadTimeValue', '3'],
    ['input[name="windows.0.deadline"]', '2'],
    ['input[name="windows.0.penalty"]', '0'],
  ];
  for (const [sel, v] of map) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) await el.fill(v).catch(() => {});
  }
  for (const [sel, want] of [
    ['input[name=bookingConfirmType][value=MANUAL]', true],
    ['input[name=isCancelType][value="1"]', true],
    ['input[name=isPartnerConfirm][value="true"]', true],
  ]) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) continue;
    const on = await el.isChecked().catch(() => false);
    if (!on) await el.click({ force: true });
  }
  await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
}

async function ensureInclude(page) {
  const body = await page.locator('body').innerText();
  if (/편도 전용|픽업\/샌딩|주차비/.test(body)) {
    console.log('include OK');
    return;
  }
  await page.getByRole('button', { name: /撰写|撰寫/ }).first().click();
  await sleep(1000);
  const tr = '베이징 시내 호텔 ↔ 베이징 팝마트 편도 전용 차량 이동 및 주차비 포함';
  const pu = '픽업/샌딩 서비스 및 주차비 포함';
  const ex =
    '가이드, 팁, 베이징 팝마트 티켓, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';
  await page.evaluate(
    ({ tr, pu, ex }) => {
      for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP']) {
        const el = document.getElementById(id);
        if (el && !el.checked) (el.closest('label') || el).click();
      }
      const set = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
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
      const fiberKey = Object.keys(btn || {}).find((k) => k.startsWith('__reactFiber'));
      let fiber = btn?.[fiberKey];
      for (let i = 0; i < 50 && fiber; i++) {
        const name = String(fiber.type?.name || fiber.type?.displayName || '');
        if (name.includes('AttributeFormPopup') && fiber.memoizedProps?.onSave) {
          fiber.memoizedProps.onSave(values);
          return;
        }
        fiber = fiber.return;
      }
      btn?.click();
    },
    { tr, pu, ex },
  );
  await sleep(800);
  await page.getByRole('button', { name: /^(关闭|關閉)$/ }).click().catch(() => {});
}

async function ensureVoucher(page) {
  // close resv sheet if still open
  if (await sheetOpen(page)) {
    await page.getByRole('button', { name: /^(已选|已選)$/ }).last().click({ force: true }).catch(() => {});
    await sleep(800);
  }
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);

  const open = page.getByRole('button', { name: /选择凭证及其使用方式|選擇憑證|注册凭证|註冊憑證/ });
  if ((await open.count()) > 0) await open.first().click();
  else await page.getByRole('button', { name: /凭证|憑證|바우처|voucher/i }).first().click();
  await sleep(1500);

  const dlg = page.locator('[role=dialog]').last();
  // pick template card by text element
  const card = dlg
    .getByText(/예약정보로 확인|无需换货|無需換貨/)
    .first()
    .or(page.getByText(/예약정보로 확인|无需换货|無需換貨/).first());
  if ((await card.count()) > 0) {
    await card.click({ force: true });
    console.log('voucher card text click');
  } else {
    // any radio/option in dialog
    const opt = dlg.locator('[role=radio], label, button, div').filter({ hasText: /예약|换货|換貨|voucher/i });
    console.log('voucher alt count', await opt.count());
    if ((await opt.count()) > 0) await opt.first().click({ force: true });
  }
  await sleep(500);
  const done = page.getByRole('button', { name: /^(已选|已選|完成|确定|確定)$/ });
  if ((await done.count()) > 0) await done.last().click({ force: true });
  await sleep(1000);
  console.log('voucher after', /예약정보|无需换货|無需換貨/.test(await page.locator('body').innerText()));
}

async function saveThen(page) {
  const btn = page.locator('button').filter({ hasText: /^(保存然后|保存然後)$/ });
  const n = await btn.count();
  for (let i = 0; i < n; i++) {
    const b = btn.nth(i);
    const dis = await b.isDisabled();
    console.log('saveThen', i, 'disabled', dis);
    if (!dis) {
      await b.click();
      await sleep(4000);
      console.log('URL after', page.url());
      return !page.url().includes('/regulations') || (await b.isDisabled());
    }
  }
  const err = await page.evaluate(() =>
    document.body.innerText
      .split('\n')
      .filter((l) => /必须|必須|请选择|請選擇|须填写|您必須|红色|未填写/.test(l))
      .slice(0, 15),
  );
  console.log('blocked', err);
  return false;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page =
    browser.contexts()[0].pages().find((p) => p.url().includes('product-management')) ||
    browser.contexts()[0].pages()[0];
  page.setDefaultTimeout(15000);

  // if sheet left open from inspect, finish it first
  if (await sheetOpen(page)) {
    console.log('sheet already open — tick + 已选');
    await tickResv(page);
  } else if (!page.url().includes('/regulations')) {
    await page.goto(`${BASE}/regulations?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2500);
  }
  console.log('URL', page.url());

  await fillQty(page);
  await ensureInclude(page);
  await tickResv(page);
  await ensureVoucher(page);

  let ok = await saveThen(page);
  if (!ok) {
    console.log('retry once');
    await tickResv(page);
    await ensureVoucher(page);
    ok = await saveThen(page);
  }

  const final = {
    url: page.url(),
    saveDisabled: await page
      .locator('button')
      .filter({ hasText: /^(保存然后|保存然後)$/ })
      .first()
      .isDisabled()
      .catch(() => null),
    bodyHasVoucher: /예약정보|无需换货|無需換貨/.test(await page.locator('body').innerText()),
  };
  console.log('FINAL', final);
  process.exit(ok || page.url().includes('/option') ? 0 : 2);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
