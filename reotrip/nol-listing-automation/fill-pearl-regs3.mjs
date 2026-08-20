/**
 * Continue regs: fill inclusion descriptions, exclusions, resv, voucher → 保存然后
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

async function clickBtn(re) {
  const loc = page.getByRole('button', { name: re });
  if ((await loc.count()) === 0) return false;
  const b = loc.last();
  if (await b.isDisabled().catch(() => true)) return false;
  const t = (await b.innerText()).trim();
  if (/批准|提交审核|승인/.test(t)) return false;
  await b.click();
  console.log('btn', t.slice(0, 40));
  return true;
}

// Ensure include modal open
if (!page.url().includes('option-attribute') && !page.url().includes('popup')) {
  await clickBtn(/撰写|撰寫/);
  await sleep(1200);
}

// Ensure TRANSPORTATION + PICK_UP checked (not ETC if not needed - ETC ok for pickup text)
// Uncheck ETC if we use PICK_UP - actually yuyuan uses 운송 + 기타. Keep TRANSPORT + PICK_UP.
// Uncheck ETC if checked to avoid extra empty field requirement
await page.evaluate(() => {
  const etc = document.querySelector('#inclusions_ETC');
  if (etc && (etc.checked || etc.getAttribute('aria-checked') === 'true')) {
    const lab = etc.closest('label') || etc;
    lab.click(); // toggle off once
  }
});
await sleep(300);

// After checking, description textareas may appear
// Re-check transport and pickup if needed
for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP']) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const checked = el.checked || el.getAttribute('aria-checked') === 'true';
    if (!checked) (el.closest('label') || el).click();
  }, id);
  await sleep(200);
}

// Wait for description fields
await sleep(500);
const fields = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('textarea, input[type=text]')).map((el) => ({
    id: el.id,
    name: el.name,
    ph: el.placeholder,
    tag: el.tagName,
    valLen: (el.value || '').length,
  }));
});
console.log('fields after check', fields);

// Fill by id patterns
async function fillId(id, val) {
  const loc = page.locator(`#${id}`);
  if ((await loc.count()) === 0) return false;
  await loc.fill(val);
  console.log('filled', id, val.slice(0, 30));
  return true;
}

// Common ids after tick
const tryIds = [
  ['inclusions_TRANSPORTATION_description', INCLUDE_TRANSPORT],
  ['inclusions_PICK_UP_description', INCLUDE_PICKUP],
  ['inclusions_ETC_description', INCLUDE_PICKUP],
  ['exclusions', EXCLUDE],
];
for (const [id, val] of tryIds) {
  await fillId(id, val);
}

// Also any textarea near 运输 / 接送 labels
await page.evaluate(
  ({ tr, pu, ex }) => {
    const setVal = (el, val) => {
      if (!el) return;
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    // find textareas with ids containing description
    document.querySelectorAll('textarea').forEach((ta) => {
      const id = ta.id || '';
      const near = (ta.closest('div')?.innerText || '').slice(0, 100);
      if (/TRANSPORTATION/i.test(id) || (/运输|運輸|운송/.test(near) && !ta.value)) setVal(ta, tr);
      else if (/PICK_UP/i.test(id) || (/接送|픽업/.test(near) && !ta.value)) setVal(ta, pu);
      else if (id === 'exclusions' || /不包含|제외/.test(near)) setVal(ta, ex);
    });
  },
  { tr: INCLUDE_TRANSPORT, pu: INCLUDE_PICKUP, ex: EXCLUDE },
);

// Playwright fill exclusions
const ex = page.locator('#exclusions');
if ((await ex.count()) > 0) await ex.fill(EXCLUDE);

// Fill any empty textarea that appeared for inclusions with playwright
const tas = page.locator('textarea');
const n = await tas.count();
for (let i = 0; i < n; i++) {
  const ta = tas.nth(i);
  const id = (await ta.getAttribute('id')) || '';
  const val = await ta.inputValue();
  if (val && val.length > 5) continue;
  if (/TRANSPORT/i.test(id)) await ta.fill(INCLUDE_TRANSPORT);
  else if (/PICK/i.test(id)) await ta.fill(INCLUDE_PICKUP);
  else if (id === 'exclusions') await ta.fill(EXCLUDE);
}
await sleep(400);

// Save include modal
if (!(await clickBtn(/^保存$/))) {
  await clickBtn(/^节省$|^節省$|^完成$/);
}
await sleep(1500);
console.log('after include save', page.url());

// ——— Resv ———
console.log('\n--- resv ---');
// open representative reservation
await page.keyboard.press('Escape');
await sleep(300);
const resvOpen = await clickBtn(/代表预约信息|代表預約信息/);
if (!resvOpen) {
  await page.locator('text=代表预约信息').first().click({ force: true }).catch(() => {});
}
await sleep(1500);
console.log('resv url', page.url());

// Get all checkbox rows in dialog
const boxes = await page.evaluate(() => {
  const root = document.querySelector('[role=dialog]') || document.body;
  return Array.from(root.querySelectorAll('input[type=checkbox], [role=checkbox]')).map((el, i) => {
    const row = el.closest('label') || el.closest('li') || el.parentElement;
    const text = (row?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return {
      i,
      id: el.id,
      text,
      checked: el.checked === true || el.getAttribute('aria-checked') === 'true',
    };
  });
});
console.log(
  'all boxes',
  boxes.map((b) => `${b.checked ? '✓' : '○'} [${b.id}] ${b.text}`).join('\n'),
);

// Required scenic fields (no flight)
const need = [
  /电话|電話|휴대폰|手机|CELLPHONE/i,
  /邮箱|郵件|電子信箱|이메일|EMAIL/i,
  /英文.*姓|영문.*성|LAST_NAME|English last/i,
  /英文.*名|영문.*이름|FIRST_NAME|English first/i,
  /出发日期|出發日期|출발|DEPARTURE_DATE/i,
  /饭店名称|飯店名稱|酒店名称|호텔 이름|HOTEL_NAME/i,
  /饭店地址|飯店地址|酒店地址|호텔 주소|HOTEL_ADDRESS/i,
  /上车|上車|상차|PICKUP_AREA/i,
  /接驳时间|接駁時間|픽업 시간|PICKUP_TIME/i,
  /下车|下車|하차|SENDING/i,
  /Kakao|카카오|KAKAO/i,
  /Messenger|메시징|MESSAGING|消息应用|消息軟體/i,
  /人数|人數|인원|NUMBER_OF_PEOPLE/i,
  /手提箱|캐리어|行李箱|SUITCASE/i,
];

for (const re of need) {
  const match = boxes.find((b) => re.test(b.text) || re.test(b.id));
  if (!match) {
    console.log('  not found', re);
    continue;
  }
  if (match.checked) {
    console.log('  already', match.text.slice(0, 30));
    continue;
  }
  // click once via id or label
  if (match.id) {
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const lab = el.closest('label') || el;
      lab.click();
    }, match.id);
  } else {
    await page.getByText(match.text.slice(0, 15)).first().click({ force: true }).catch(() => {});
  }
  console.log('  clicked', match.text.slice(0, 40));
  await sleep(100);
}
await sleep(500);

// Confirm 已选
await clickBtn(/^已选$|^已選$/);
await sleep(1200);

// ——— Voucher ———
console.log('\n--- voucher ---');
await clickBtn(/选择优惠券|選擇優惠券|代金券|选择凭证|選擇憑證|注册代金券|登錄/);
await sleep(1500);
const v = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('div,li,button,label'));
  const card = cards.find((e) => {
    const t = (e.innerText || '').replace(/\s+/g, ' ');
    return (
      t.length < 200 &&
      (/예약정보로 확인|无需换货|無需換貨|用预约信息|预约信息确认/.test(t) ||
        (/预约信息|預訂信息|예약정보/.test(t) && /确认|確認|无需|無需|換貨|换货/.test(t)))
    );
  });
  if (card) {
    card.click();
    return card.innerText.slice(0, 80);
  }
  // fallback first selectable card
  const any = cards.find((e) => /凭证|憑證|바우처|Voucher|优惠券/.test(e.innerText || '') && e.innerText.length < 100);
  any?.click();
  return any ? any.innerText.slice(0, 80) : null;
});
console.log('voucher pick', v);
await sleep(500);
await clickBtn(/^已选$|^已選$|^完成$|^节省$|^節省$|^确认$|^確認$/);
await sleep(1000);

// Final check + save
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
  // summary of resv
  const body = document.body.innerText;
  return {
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
    hasResv: /电话|邮箱|酒店|上车|Kakao|人数/.test(body) && !/须填写「代表预约信息」/.test(body),
    hasVoucher: /예약정보|无需换货|無需換貨|代金券/.test(body),
  };
});
console.log('\nFINAL', JSON.stringify(final, null, 2));

if (final.saveThenDisabled === false) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).click();
  console.log('✓ 保存然后');
  await sleep(3500);
  console.log('AFTER', page.url());
} else {
  const temp = page.getByRole('button', { name: /临时保存|臨時存儲/ });
  if ((await temp.count()) && !(await temp.first().isDisabled())) {
    await temp.first().click();
    console.log('temp saved');
    await sleep(2000);
  }
}

process.exit(0);
