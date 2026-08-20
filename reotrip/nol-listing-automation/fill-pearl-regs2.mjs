/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Fill Pearl regulations carefully with Playwright fill only.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const INCLUDE_TRANSPORT = '상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량 이동 및 주차비 포함';
const INCLUDE_PICKUP = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE =
  '가이드, 팁, 동방명주탑 티켓, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
console.log('URL', page.url());
await page.bringToFront().catch(() => {});

async function fill(sel, val, label) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) {
    console.log('  miss', label, sel);
    return false;
  }
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ force: true }).catch(() => {});
  await loc.fill(String(val));
  console.log('  fill', label, '=', val);
  return true;
}

async function clickText(re, once = true) {
  const loc = page.getByText(re);
  if ((await loc.count()) === 0) return false;
  await loc.first().scrollIntoViewIfNeeded().catch(() => {});
  await loc.first().click({ force: true });
  return true;
}

async function clickBtn(re) {
  const loc = page.getByRole('button', { name: re });
  if ((await loc.count()) === 0) return false;
  const b = loc.last();
  if (await b.isDisabled().catch(() => true)) return false;
  const t = await b.innerText();
  if (/批准|提交审核|승인 요청/.test(t)) return false;
  await b.click();
  console.log('  btn', t.trim().slice(0, 30));
  return true;
}

// ——— 1 basic ———
console.log('1) basic qty / days');
await fill('#minimumPurchaseDay, input[name=minimumPurchaseDay]', '3', 'minDay');
await fill(
  '#minimumPurchaseQuantityPerSession, input[name=minimumPurchaseQuantityPerSession]',
  '1',
  'minQty',
);
await fill(
  '#maximumPurchaseQuantityPerSession, input[name=maximumPurchaseQuantityPerSession]',
  '10',
  'maxQty',
);

// inventory: 不设置库存 (RIGHT)
await page.locator('input[name="range-select.inventory-managed"][value=RIGHT]').click({ force: true }).catch(async () => {
  await clickText(/不设置库存|不設置庫存/);
});
console.log('  inventory no-manage');

// ——— 2 confirmation MANUAL 3 DAYS ———
console.log('2) confirm MANUAL 3 DAYS');
await page.locator('input[name=bookingConfirmType][value=MANUAL]').click({ force: true }).catch(() => {});
// click visible label
await clickText(/手动确认|手動確認|직접 확인|수동/);
await fill('#confirmationLeadTimeValue, input[name=confirmationLeadTimeValue]', '3', 'confirmVal');
// select DAYS
const sel = page.locator('select[name=confirmationLeadTimeType]');
if ((await sel.count()) > 0) {
  await sel.selectOption({ label: /天|日|DAYS|영업일/i }).catch(async () => {
    // try values
    for (const v of ['DAYS', 'DAY', 'BUSINESS_DAYS', 'BUSINESS_DAY']) {
      try {
        await sel.selectOption(v);
        console.log('  select type', v);
        break;
      } catch {}
    }
  });
  const v = await sel.inputValue();
  console.log('  confirm type value', v);
  // if still MINUTES, try option by text
  if (v === 'MINUTES') {
    await sel.evaluate((el) => {
      for (const o of el.options) {
        if (/天|日|DAY|영업/.test(o.text)) {
          el.value = o.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return o.value + ':' + o.text;
        }
      }
      return null;
    }).then((r) => console.log('  forced option', r));
  }
}

// ——— 3 cancel ———
console.log('3) cancel');
await page.locator('input[name=isCancelType][value="1"]').click({ force: true }).catch(() => {});
await clickText(/^可取消$|^가능$/);
// partner manual cancel true
await page.locator('input[name=isPartnerConfirm][value="true"]').click({ force: true }).catch(() => {});
await clickText(/是（手动取消）|是\(手动取消\)|예 \(수동취소\)|手动取消/);
await fill('input[name="windows.0.deadline"]', '2', 'deadline');
await fill('input[name="windows.0.penalty"]', '0', 'penalty');

// ——— 4 include ———
console.log('4) include');
// close any open if needed
await page.keyboard.press('Escape');
await sleep(300);

if (!(await clickBtn(/撰写|撰寫/))) {
  await clickText(/撰写|撰寫/);
}
await sleep(1500);

// dump modal fields
const modalFields = await page.evaluate(() => {
  const root = document.querySelector('[role=dialog]') || document.body;
  return {
    text: root.innerText.slice(0, 1200),
    textareas: Array.from(root.querySelectorAll('textarea')).map((t) => ({
      id: t.id,
      name: t.name,
      ph: t.placeholder,
    })),
    checks: Array.from(root.querySelectorAll('input[type=checkbox], [role=checkbox]')).map((c) => ({
      id: c.id,
      name: c.name,
      text: (c.closest('label')?.innerText || c.parentElement?.innerText || '').replace(/\s+/g, ' ').slice(0, 40),
      checked: c.checked || c.getAttribute('aria-checked'),
    })),
  };
});
console.log('modal', JSON.stringify(modalFields, null, 2).slice(0, 3000));

// tick include categories once
await page.evaluate(() => {
  const want = [/运输|運輸|TRANSPORT|운송/, /接送|픽업|PICK_UP|PICK-UP/, /其他|기타|OTHER/];
  for (const re of want) {
    const labels = Array.from(document.querySelectorAll('label'));
    for (const lab of labels) {
      const t = (lab.innerText || '').replace(/\s+/g, ' ');
      if (!re.test(t) || t.length > 50) continue;
      const input = lab.querySelector('input[type=checkbox]') || lab;
      const checked = input.checked === true || input.getAttribute?.('aria-checked') === 'true';
      if (!checked) lab.click(); // once
      break;
    }
  }
});
await sleep(600);

// fill inclusion textareas by id or first visible
const taIds = await page.evaluate(() =>
  Array.from(document.querySelectorAll('textarea')).map((t) => ({ id: t.id, name: t.name, ph: t.placeholder })),
);
console.log('textareas', taIds);

for (const t of taIds) {
  const sel = t.id ? `#${CSS.escape(t.id)}` : t.name ? `textarea[name="${t.name}"]` : null;
  if (!sel) continue;
  if (/TRANSPORT/i.test(t.id + t.name)) await fill(sel, INCLUDE_TRANSPORT, t.id || t.name);
  else if (/PICK|OTHER/i.test(t.id + t.name)) await fill(sel, INCLUDE_PICKUP, t.id || t.name);
  else if (/EXCLUD|不包/i.test(t.id + t.name + t.ph)) await fill(sel, EXCLUDE, t.id || t.name);
}

// if no named, fill first two textareas in dialog
if (!taIds.some((t) => /TRANSPORT|PICK|OTHER/i.test(t.id + t.name))) {
  const areas = page.locator('[role=dialog] textarea, textarea');
  const n = await areas.count();
  if (n >= 1) {
    await areas.nth(0).fill(INCLUDE_TRANSPORT);
    console.log('  ta0 transport');
  }
  if (n >= 2) {
    await areas.nth(1).fill(INCLUDE_PICKUP);
    console.log('  ta1 pickup');
  }
  if (n >= 3) {
    await areas.nth(2).fill(EXCLUDE);
    console.log('  ta2 exclude');
  }
}

// confirm include modal
await sleep(400);
if (!(await clickBtn(/^节省$|^節省$|^完成$|^완료$|^保存$/))) {
  await clickBtn(/^已选$|^已選$/);
}
await sleep(1200);

// ——— 5 代表预约 ———
console.log('5) resv');
// click open
const opened = await clickBtn(/代表预约信息|代表預約信息/) || (await clickText(/代表预约信息|代表預約信息/));
console.log('  open resv', opened);
await sleep(1500);

// list checkboxes in modal
const boxes = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[role=checkbox], input[type=checkbox]')).map((el, i) => {
    const row = el.closest('label,li,tr,div') || el.parentElement;
    const text = (row?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const r = el.getBoundingClientRect();
    return {
      i,
      text,
      checked: el.checked === true || el.getAttribute('aria-checked') === 'true',
      id: el.id,
      x: Math.round(r.x),
      y: Math.round(r.y),
      off: r.x < -100,
    };
  });
});
console.log('checkboxes count', boxes.length);
// print those matching needed
const needRe =
  /电话|電話|手机|邮箱|電子|邮件|英文|出发|出發|饭店|飯店|酒店|上车|上車|下车|下車|接驳|接駁|Kakao|카카오|Messenger|消息|人数|人數|手提箱|캐리어|行李|인원|호텔|픽업|하차/;
const needed = boxes.filter((b) => needRe.test(b.text) && !/航班|飞机|機場|항공|flight/i.test(b.text));
console.log(
  'needed',
  needed.map((b) => `${b.checked ? '✓' : '○'} ${b.text}`),
);

// click each unchecked once via mouse on label text or checkbox
for (const b of needed) {
  if (b.checked) continue;
  // find by text
  const row = page.getByText(b.text.slice(0, 20), { exact: false }).first();
  try {
    const box = await row.boundingBox();
    if (box && box.x > 0) {
      // click left side of row (checkbox area)
      await page.mouse.click(box.x + 12, box.y + box.height / 2);
      console.log('  click', b.text.slice(0, 30));
      await sleep(120);
    } else if (b.id) {
      await page.locator(`#${CSS.escape(b.id)}`).click({ force: true });
      console.log('  force id', b.id);
      await sleep(120);
    }
  } catch (e) {
    console.log('  fail', b.text.slice(0, 20), e.message.slice(0, 40));
  }
}
await sleep(400);

// verify checked count
const after = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[role=checkbox], input[type=checkbox]'))
    .filter((el) => el.checked === true || el.getAttribute('aria-checked') === 'true')
    .map((el) => (el.closest('label,li,div')?.innerText || el.id || '').replace(/\s+/g, ' ').trim().slice(0, 40));
});
console.log('checked after', after);

await clickBtn(/^已选$|^已選$/);
await sleep(1000);

// ——— 6 voucher ———
console.log('6) voucher');
await clickBtn(/选择优惠券|選擇優惠券|代金券|选择凭证|選擇憑證/) || (await clickText(/代金券|优惠券|憑證/));
await sleep(1500);
// pick card
const vhit = await page.evaluate(() => {
  const card = Array.from(document.querySelectorAll('div,li,button,label,span')).find((e) => {
    const t = (e.innerText || '').replace(/\s+/g, ' ');
    return (
      (/예약정보로 확인|无需换货|無需換貨|用预约信息确认|预约信息确认|予約情報で確認/.test(t) ||
        (/预约信息|預訂信息/.test(t) && /确认|確認|无需|無需/.test(t))) &&
      t.length < 150
    );
  });
  if (card) {
    card.click();
    return (card.innerText || '').slice(0, 60);
  }
  return null;
});
console.log('  voucher card', vhit);
await sleep(500);
await clickBtn(/^已选$|^已選$|^完成$|^节省$|^節省$/);
await sleep(1000);

// ——— final ———
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
  const lines = document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
  const key = [];
  for (let i = 0; i < lines.length; i++) {
    if (/代表预约|代金|取消|确认|最短|购买数量|保存然后/.test(lines[i])) {
      key.push(lines.slice(i, i + 2).join(' | '));
    }
  }
  return {
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
    key: key.slice(0, 25),
  };
});
console.log('\nFINAL', JSON.stringify(final, null, 2));

if (final.saveThenDisabled === false) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).click();
  console.log('✓ 保存然后');
  await sleep(3500);
  console.log('AFTER', page.url());
} else {
  // temp save progress
  const temp = page.getByRole('button', { name: /临时保存|臨時存儲/ });
  if ((await temp.count()) && !(await temp.first().isDisabled())) {
    await temp.first().click();
    console.log('temp saved');
    await sleep(2000);
  }
}

process.exit(0);
