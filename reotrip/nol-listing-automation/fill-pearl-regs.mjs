/**
 * Fill regulations for Oriental Pearl transfer (scenic, no flights).
 * Never click 提交审核.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INCLUDE_TRANSPORT = '상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량 이동 및 주차비 포함';
const INCLUDE_PICKUP = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE =
  '가이드, 팁, 동방명주탑 티켓, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

// scenic — no flight fields
const RESV_LABELS = [
  /电话号码|電話號碼|전화번호|手机/,
  /电子信箱|電子信箱|이메일|邮箱/,
  /英文.*姓|영문.*성|English.*[Ll]ast/,
  /英文.*名|영문.*이름|English.*[Ff]irst/,
  /出发日期|出發日期|출발 날짜|出发日/,
  /饭店名称|飯店名稱|호텔 이름|酒店名称/,
  /饭店地址|飯店地址|호텔 주소|酒店地址/,
  /上车地点|上車地點|상차|上车地/,
  /接驳时间|接駁時間|픽업 시간|接送时间/,
  /下车地点|下車地點|하차/,
  /Kakaotalk|카카오/,
  /Messenger|消息|메신저|messaging/i,
  /人数|人數|인원/,
  /手提箱|캐리어|行李箱|行李/,
];

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
console.log('URL', page.url());
await page.bringToFront().catch(() => {});
if (!page.url().includes('/regulations')) {
  console.log('not on regs');
  process.exit(1);
}

// 1) Dump key fields
const dump = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      ph: el.placeholder,
      val: (el.value || '').slice(0, 30),
      y: Math.round(r.y),
      vis: r.width > 0,
    };
  });
  const redMsgs = [];
  document.querySelectorAll('p, span, div').forEach((el) => {
    if (el.children.length > 2) return;
    const cs = getComputedStyle(el);
    const m = cs.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const txt = (el.innerText || '').trim();
    if (!txt || txt.length > 80) return;
    if (m && +m[1] > 180 && +m[2] < 100 && +m[3] < 100) redMsgs.push(txt);
  });
  return { inputs: inputs.filter((i) => i.vis || i.name).slice(0, 80), redMsgs: [...new Set(redMsgs)] };
});
console.log('DUMP', JSON.stringify(dump, null, 2).slice(0, 5000));

async function fillSel(sel, val) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ force: true }).catch(() => {});
  await loc.fill(String(val));
  return true;
}

// 2) Min book day 3, qty 1-10
// try common names
const filled = {};
for (const [sel, val, key] of [
  ['input[name=minimumPurchaseDay], #minimumPurchaseDay', '3', 'minDay'],
  ['input[name=minPurchaseQuantity], input[name=minimumPurchaseQuantity], #minPurchaseQuantity', '1', 'minQty'],
  ['input[name=maxPurchaseQuantity], input[name=maximumPurchaseQuantity], #maxPurchaseQuantity', '10', 'maxQty'],
  ['input[name="purchaseQuantity.min"]', '1', 'pqMin'],
  ['input[name="purchaseQuantity.max"]', '10', 'pqMax'],
  ['input[name=confirmDuration], #confirmDuration, input[name=confirmationTime]', '3', 'confirm'],
]) {
  filled[key] = await fillSel(sel, val);
}
console.log('basic fills', filled);

// fallback: find by nearby labels via evaluate + fill with playwright on found selectors
await page.evaluate(() => {
  const set = (el, val) => {
    if (!el) return;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  // look for tel/number near 最短
  document.querySelectorAll('input').forEach((el) => {
    const near = (el.closest('div')?.innerText || '').slice(0, 60);
    if (/最短预约|最晚可提前|최소 예약|提前/.test(near) && el.type !== 'radio' && el.type !== 'checkbox') {
      if (!el.value || el.value === '0') set(el, '3');
    }
    if (/最小购买|最少|min/i.test(near) && /数量|수량|quantity/i.test(near)) set(el, '1');
    if (/最大购买|最多|max/i.test(near) && /数量|수량|quantity/i.test(near)) set(el, '10');
  });
});

// 3) Confirmation: manual 3 days
await page.evaluate(() => {
  const lab = Array.from(document.querySelectorAll('label,div,span')).find((e) => {
    const t = (e.innerText || '').trim();
    return /手动确认|手動確認|수동 확정|MANUAL/.test(t) && t.length < 40;
  });
  lab?.click();
});
// fill 3 if confirm days field empty
await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input[type=tel], input[type=number], input[type=text]'));
  for (const el of inputs) {
    const near = (el.closest('div')?.parentElement?.innerText || '').slice(0, 80);
    if (/确认时间|確認時間|확정|营业日|營業日|DAYS/.test(near) && (!el.value || el.value === '0')) {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      s?.call(el, '3');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
});

// 4) Cancellation: cancellable + 手动取消 + window 2/0
await page.evaluate(() => {
  // 可取消
  const yes = Array.from(document.querySelectorAll('label,div,span')).find((e) => {
    const t = (e.innerText || '').trim();
    return (t === '可取消' || t === '가능' || t === '可以取消') && t.length < 10;
  });
  yes?.click();
  // 是（手动取消）
  const manual = Array.from(document.querySelectorAll('label,div,span')).find((e) =>
    /是（手动取消）|是\(手动取消\)|예 \(수동취소\)|手動取消/.test(e.innerText || ''),
  );
  manual?.click();
});
await sleep(400);

// cancel windows
const winOk = await fillSel('input[name="windows.0.deadline"]', '2');
const penOk = await fillSel('input[name="windows.0.penalty"]', '0');
console.log('cancel window', winOk, penOk);
if (!winOk) {
  await page.evaluate(() => {
    const set = (el, val) => {
      if (!el) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    // find inputs near 取消费 / 营业日
    const inputs = Array.from(document.querySelectorAll('input'));
    let deadlineSet = false;
    let penaltySet = false;
    for (const el of inputs) {
      const near = (el.closest('div')?.parentElement?.innerText || '').slice(0, 100);
      if (!deadlineSet && /营业日|營業日|일 전|天前/.test(near) && el.type !== 'radio') {
        set(el, '2');
        deadlineSet = true;
        continue;
      }
      if (deadlineSet && !penaltySet && /%|费用|費用|수수료|penalty/.test(near)) {
        set(el, '0');
        penaltySet = true;
      }
    }
  });
}

// 5) Include — open 撰写
console.log('\n--- include ---');
const writeBtn = page.getByRole('button', { name: /撰写|撰寫|작성/ });
if ((await writeBtn.count()) > 0) {
  await writeBtn.first().click();
  console.log('opened 撰写');
  await sleep(1200);
} else {
  await page.getByText(/撰写|包含与不包含/).first().click().catch(() => {});
  await sleep(1000);
}

// Check TRANSPORTATION + PICK_UP / OTHER and fill
await page.evaluate(
  ({ tr, pu, ex }) => {
    const clickIf = (re) => {
      document.querySelectorAll('label, [role=checkbox], div').forEach((el) => {
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (t.length > 60) return;
        if (re.test(t)) {
          const box = el.querySelector?.('[role=checkbox], input[type=checkbox]') || el;
          const checked = box.getAttribute?.('aria-checked') === 'true' || box.checked;
          if (!checked) box.click();
        }
      });
    };
    clickIf(/运输|運輸|TRANSPORT|운송/);
    clickIf(/接送|픽업|PICK|其他|기타|OTHER/);

    const set = (el, val) => {
      if (!el) return;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const t = document.querySelector('#inclusions_TRANSPORTATION_description');
    const p =
      document.querySelector('#inclusions_PICK_UP_description') ||
      document.querySelector('#inclusions_OTHER_description');
    set(t, tr);
    set(p, pu);
    // fallback textareas in modal
    const areas = Array.from(document.querySelectorAll('[role=dialog] textarea, textarea'));
    if (!t && areas[0]) set(areas[0], tr);
    if (!p && areas[1]) set(areas[1], pu);

    // exclude
    const exEl =
      document.querySelector('#exclusions_description') ||
      document.querySelector('textarea[name*=exclud]') ||
      document.querySelector('textarea[placeholder*=不包]');
    set(exEl, ex);
  },
  { tr: INCLUDE_TRANSPORT, pu: INCLUDE_PICKUP, ex: EXCLUDE },
);
await sleep(500);

// Prefer Playwright fill for named inclusion fields
await fillSel('#inclusions_TRANSPORTATION_description', INCLUDE_TRANSPORT);
await fillSel('#inclusions_PICK_UP_description', INCLUDE_PICKUP);
await fillSel('#inclusions_OTHER_description', INCLUDE_PICKUP);
await fillSel('#exclusions_description, textarea[name*=exclud]', EXCLUDE);

// confirm modal — 节省/已选/完成 (NOT 提交审核)
for (const name of [/^节省$/, /^節省$/, /^完成$/, /^완료$/, /^保存$/, /^已选$/, /^已選$/]) {
  const b = page.getByRole('button', { name });
  if ((await b.count()) === 0) continue;
  const last = b.last();
  if (await last.isDisabled().catch(() => true)) continue;
  const t = await last.innerText();
  if (/批准|提交审核/.test(t)) continue;
  await last.click();
  console.log('include confirm', t);
  await sleep(1000);
  break;
}

// 6) 代表预约信息
console.log('\n--- resv ---');
const resvBtn = page.getByRole('button', { name: /代表预约信息|代表預約信息|代表预订/ });
// also click the section card
if ((await resvBtn.count()) > 0) {
  await resvBtn.first().click();
} else {
  await page.getByText('代表预约信息').first().click();
}
await sleep(1500);

// Single-click each required checkbox by label — only if unchecked
const resvResult = await page.evaluate((labelSources) => {
  const results = [];
  const rows = Array.from(document.querySelectorAll('label, li, tr, div')).filter((el) => {
    const t = (el.innerText || '').trim();
    return t.length > 1 && t.length < 80;
  });
  const patterns = labelSources.map((s) => new RegExp(s, 'i'));

  for (const re of patterns) {
    let hit = null;
    for (const row of rows) {
      const t = (row.innerText || '').replace(/\s+/g, ' ').trim();
      if (!re.test(t)) continue;
      // prefer row with checkbox
      const box =
        row.querySelector('[role=checkbox]') ||
        row.querySelector('input[type=checkbox]') ||
        (row.getAttribute('role') === 'checkbox' ? row : null);
      if (!box) continue;
      hit = { text: t.slice(0, 40), box, row };
      break;
    }
    if (!hit) {
      results.push({ re: re.toString(), status: 'notfound' });
      continue;
    }
    const checked =
      hit.box.getAttribute?.('aria-checked') === 'true' || hit.box.checked === true;
    if (checked) {
      results.push({ re: re.toString(), status: 'already', text: hit.text });
      continue;
    }
    // click once only
    hit.box.click();
    results.push({ re: re.toString(), status: 'clicked', text: hit.text });
  }
  return results;
}, RESV_LABELS.map((r) => r.source));
console.log('resv clicks', JSON.stringify(resvResult, null, 2));
await sleep(500);

// Confirm 已选
const selBtn = page.getByRole('button', { name: /已选|已選/ });
if ((await selBtn.count()) > 0) {
  await selBtn.last().click();
  console.log('confirmed 已选');
  await sleep(1000);
}

// verify summary
const resvSummary = await page.evaluate(() => {
  const lines = document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/代表预约|电话|邮箱|酒店|上车|Kakaotalk|人数|手提箱|须填写/.test(lines[i])) {
      out.push(lines.slice(i, i + 2).join(' | '));
    }
  }
  return out.slice(0, 20);
});
console.log('resv summary lines', resvSummary);

// 7) Voucher
console.log('\n--- voucher ---');
const vBtn = page.getByRole('button', { name: /选择优惠券|選擇優惠券|代金券|选择凭证|選擇憑證|优惠券/ });
if ((await vBtn.count()) > 0) {
  await vBtn.first().click();
  await sleep(1200);
  // pick 预约信息确认 / 无需换货
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('div,li,button,label')).find((e) => {
      const t = (e.innerText || '').replace(/\s+/g, ' ');
      return /예약정보로 확인|无需换货|無需換貨|用预约信息|预约信息确认|予約情報/.test(t) && t.length < 120;
    });
    card?.click();
  });
  await sleep(500);
  const conf = page.getByRole('button', { name: /已选|已選|完成|节省|節省/ });
  if ((await conf.count()) > 0) {
    await conf.last().click();
    console.log('voucher confirmed');
    await sleep(800);
  }
} else {
  // try text click
  await page.getByText(/代金券|优惠券|憑證/).first().click().catch(() => {});
  await sleep(800);
}

// Final state
await sleep(500);
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
    url: location.href,
  };
});
console.log('\nFINAL', JSON.stringify(final, null, 2));

if (final.saveThenDisabled === false) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).click();
  console.log('✓ 保存然后 → options');
  await sleep(3500);
  console.log('AFTER', page.url());
} else {
  // temp save
  const temp = page.getByRole('button', { name: /临时保存|臨時存儲/ });
  if ((await temp.count()) > 0 && !(await temp.first().isDisabled())) {
    await temp.first().click();
    console.log('temp saved (regs incomplete)');
    await sleep(2000);
  }
}

process.exit(0);
