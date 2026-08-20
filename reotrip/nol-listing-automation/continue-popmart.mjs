/**
 * Continue Pop Mart from introduction — element locators only.
 * draft 3851a9dd-61bb-4b8c-ad7a-e6616eb3f611
 * Prices Excel R44-47: 5→219/313/438  7→313/446/625 (symmetric spring)
 * Never 提交审核
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DRAFT = '3851a9dd-61bb-4b8c-ad7a-e6616eb3f611';
const BASE = `https://tour.triple.partners/product-management/registration`;
const DEST = '베이징 팝마트';
const CITY = '베이징 시내 호텔';
const PRODUCT = `${CITY} ↔ ${DEST} 단독 차량 편도 이동 서비스`;
const IMG = ['popmart-1.jpg', 'popmart-2.jpg', 'popmart-3.jpg']
  .map((f) => path.join('/Users/mac/nol/upload-ready-images/popmart', f))
  .filter((f) => fs.existsSync(f));

const PRICES = {
  '5go': { n: '219', oct: '313', spring: '438', may: '313' },
  '7go': { n: '313', oct: '446', spring: '625', may: '446' },
  '5rtn': { n: '219', oct: '313', spring: '438', may: '313' },
  '7rtn': { n: '313', oct: '446', spring: '625', may: '446' },
};

const OPTIONS = [
  {
    key: '5go',
    name: `${CITY} 출발 → ${DEST} 편도 이동 (5인승 차량)`,
    desc: `${CITY} 출발 → ${DEST} 편도 이동 (5인승 차량, 최대 4인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n5인승 차량: 최대 2개까지 적재 가능`,
    pt: '5인승 가는',
    ptd: '5인승 차량',
  },
  {
    key: '7go',
    name: `${CITY} 출발 → ${DEST} 편도 이동 (7인승 차량)`,
    desc: `${CITY} 출발 → ${DEST} 편도 이동 (7인승 차량, 최대 6인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n7인승 차량: 최대 3개까지 적재 가능`,
    pt: '7인승 가는',
    ptd: '7인승 차량',
  },
  {
    key: '5rtn',
    name: `${DEST} 출발 → ${CITY} 편도 이동 (5인승 차량)`,
    desc: `${DEST} 출발 → ${CITY} 편도 이동 (5인승 차량, 최대 4인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n5인승 차량: 최대 2개까지 적재 가능`,
    pt: '5인승 오는',
    ptd: '5인승 차량',
  },
  {
    key: '7rtn',
    name: `${DEST} 출발 → ${CITY} 편도 이동 (7인승 차량)`,
    desc: `${DEST} 출발 → ${CITY} 편도 이동 (7인승 차량, 최대 6인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n7인승 차량: 최대 3개까지 적재 가능`,
    pt: '7인승 오는',
    ptd: '7인승 차량',
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PHASE = process.argv[2] || 'intro'; // intro|regs|options|times|holidays|all

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
await page.bringToFront();

async function saveThen(label) {
  const btn = page.locator('button').filter({ hasText: /^(保存然后|保存然後)$/ });
  const n = await btn.count();
  for (let i = 0; i < n; i++) {
    if (!(await btn.nth(i).isDisabled())) {
      await btn.nth(i).click();
      console.log(`[${label}] 保存然后 clicked`);
      await sleep(4000);
      return true;
    }
  }
  console.log(`[${label}] 保存然后 disabled/missing`);
  return false;
}

async function tempThenNext(label) {
  // form footer: narrow 临时保存 then wide 下一个
  const temps = page.locator('button').filter({ hasText: /^(临时保存|臨時存儲)$/ });
  let best = null;
  const n = await temps.count();
  for (let i = 0; i < n; i++) {
    if (await temps.nth(i).isDisabled()) continue;
    const box = await temps.nth(i).boundingBox();
    if (!box) continue;
    if (!best || box.width < best.w) best = { i, w: box.width };
  }
  if (best) {
    await temps.nth(best.i).click();
    console.log(label, 'tempSave w=', best.w);
    await sleep(1800);
  }
  const nexts = page.locator('button').filter({ hasText: /^(下一个|下個)$/ });
  let wide = null;
  const nn = await nexts.count();
  for (let i = 0; i < nn; i++) {
    if (await nexts.nth(i).isDisabled()) continue;
    const box = await nexts.nth(i).boundingBox();
    if (!box) continue;
    if (!wide || box.width > wide.w) wide = { i, w: box.width };
  }
  if (wide) {
    await nexts.nth(wide.i).click();
    console.log(label, 'next w=', wide.w);
    await sleep(2000);
  }
  // leave dialog → 消除
  const elim = page.getByRole('button', { name: /^消除$/ });
  if ((await elim.count()) > 0) {
    await elim.last().click();
    await sleep(500);
    await tempThenNext(label + '-retry');
  }
}

async function listUrl() {
  return `${BASE}/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
}

// —— INTRO ——
async function fillIntro() {
  if (!page.url().includes('/introduction')) {
    await page.goto(`${BASE}/introduction?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(3000);
  }
  console.log('INTRO', page.url());
  const headline = `${CITY} ↔ ${DEST} 편도 전용 차량으로 여유로운 이동을 즐기세요!`;
  const highlight = [
    `${CITY}에서 ${DEST}까지 단독 차량으로 편안하게 이동`,
    '대중교통 환승 없이 빠르고 쾌적한 전용 픽업 서비스',
    '숙련된 기사님의 안전하고 친절한 응대',
  ].join('\n');
  const intro = `이 서비스는 ${CITY}과 ${DEST}(北京泡泡马特 / Pop Mart) 사이의 편도 전용 차량 이동 서비스입니다.
편안하고 프라이빗한 차량과 숙련된 기사님이 함께하여, 지하철 환승이나 택시 이용 없이 목적지까지 빠르고 쾌적하게 이동하실 수 있습니다.

포함 사항:
- ${CITY} ↔ ${DEST} 편도 전용 차량 서비스 1회
- 차량 및 기사 요금 포함으로, 별도 추가 요금 없음

예약 시간에 맞춰 고객님 숙소 또는 약속 장소에서 픽업
숙련된 전문 기사님의 안전하고 친절한 서비스 제공

가족, 커플, 소규모 그룹 등 베이징 팝마트를 방문하시는 분들께 적합합니다.
지금 바로 예약하고, 복잡한 교통 걱정 없이 일정을 여유롭게 즐겨보세요!`;

  const must = `1.수하물 규격: 24인치(표준) 이하 수하물 기준 - 59cm(높이) × 41cm(너비) × 24cm(두께) 이내
5인승 차량: 최대 2개까지 적재 가능
7인승 차량: 최대 3개까지 적재 가능

2.미팅 장소: 기사님이 호텔 로비에서 픽업해 드립니다. 동일한 이름의 호텔이 있을 수 있으므로, 호텔 이름과 주소를 함께 제공해 주세요.

3.본 서비스는 호텔(또는 도심)과 ${DEST} 간의 이동만을 포함하며, 중간 정차는 포함되지 않습니다.

4.표시된 요금은 1인 기준이 아닌 차량 1대 기준입니다.

5.실제 제공되는 차량은 이미지와 다를 수 있습니다.

6.왕복 서비스를 원하시는 경우, "편도(출발)" 및 "편도(복귀)" 옵션을 각각 별도로 예약해 주세요.

7.픽업 시간 또는 장소 변경은 최소 24시간 전에 요청해 주셔야 하며, 24시간 이내 요청 시 추가 요금이 발생할 수 있습니다.

8.오후 10시부터 오전 7시 사이에 제공되는 서비스에는 야간 운행 추가 요금이 부과됩니다.

9.기사님이 예정된 시간에 도착한 후, 최대 30분까지 무료 대기해 드리며, 이후에도 고객님이 나타나지 않을 경우 차량은 출발하게 됩니다.`;

  const how = `1.문의사항이 있으실 경우 이메일 agency@reotrip.com 또는 전화 +852 3428 81 82 로 언제든지 연락해 주세요.

2.예약은 접수 후 영업일 기준 3일 이내에 확정되며, 확정이 어려운 경우 별도로 안내해 드립니다. (영업일 기준은 현지 시간에 따릅니다)`;

  await page.locator('#headline, input[name=headline]').first().fill(headline);
  await page.locator('#highlight, textarea[name=highlight]').first().fill(highlight);
  await page.locator('#description, textarea[name=description]').first().fill(intro);
  await page.locator('#checkList, textarea[name=checkList]').first().fill(must).catch(() => {});
  await page.locator('#usage, textarea[name=usage]').first().fill(how).catch(() => {});

  const none = page.locator('input[name=scheduleType][value=NONE]');
  if ((await none.count()) > 0) await none.first().click({ force: true });
  await page.getByText(/没有单独的时间表|沒有單獨的時間表/).first().click().catch(() => {});

  if (IMG.length >= 3) {
    const file = page.locator('input[type=file][accept*="image"]').first();
    await file.setInputFiles(IMG);
    console.log('uploaded', IMG.length);
    await sleep(8000);
  }
  await saveThen('intro');
}

// —— REGS ——
async function fillRegs() {
  if (!page.url().includes('/regulations')) {
    await page.goto(`${BASE}/regulations?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(3000);
  }
  console.log('REGS', page.url());
  await page.locator('#minimumPurchaseDay').fill('3');
  await page.locator('#minimumPurchaseQuantityPerSession').fill('1');
  await page.locator('#maximumPurchaseQuantityPerSession').fill('10');
  await page.locator('input[name=bookingConfirmType][value=MANUAL]').click({ force: true }).catch(() => {});
  await page.locator('#confirmationLeadTimeValue').fill('3');
  await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
  await page.locator('input[name=isCancelType][value="1"]').click({ force: true }).catch(() => {});
  await page.locator('input[name=isPartnerConfirm][value="true"]').click({ force: true }).catch(() => {});
  await page.locator('input[name="windows.0.deadline"]').fill('2');
  await page.locator('input[name="windows.0.penalty"]').fill('0');

  // include via React onSave
  await page.getByRole('button', { name: /撰写|撰寫/ }).first().click().catch(async () => {
    await page.locator('button').filter({ hasText: /撰写|撰寫/ }).first().click();
  });
  await sleep(1500);
  const tr = `${CITY} ↔ ${DEST} 편도 전용 차량 이동 및 주차비 포함`;
  const pu = '픽업/샌딩 서비스 및 주차비 포함';
  const ex = `가이드, 팁, ${DEST} 티켓, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.`;
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
          break;
        }
        fiber = fiber.return;
      }
    },
    { tr, pu, ex },
  );
  await sleep(800);
  if (await page.locator('[role=dialog]').count()) {
    await page.getByRole('button', { name: /^关闭$|^關閉$/ }).click().catch(() => {});
    await sleep(400);
  }

  // resv — label[for] via locator
  await page.getByRole('button', { name: /代表预约信息|代表預約信息/ }).click();
  await sleep(2000);
  const RESV = [
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
  for (const id of RESV) {
    const lab = page.locator(`label[for="${id}"]`);
    const inp = page.locator(`#${id}`);
    // scroll dialog body
    await page.evaluate((rid) => {
      const scrollers = Array.from(document.querySelectorAll('*')).filter((e) => {
        const s = getComputedStyle(e);
        return (
          (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
          e.scrollHeight > e.clientHeight + 50 &&
          e.clientHeight > 80
        );
      });
      scrollers.sort((a, b) => b.clientHeight - a.clientHeight);
      for (let k = 0; k < 20; k++) {
        const el = document.getElementById(rid);
        if (el) {
          el.scrollIntoView({ block: 'center' });
          return;
        }
        if (scrollers[0]) scrollers[0].scrollTop += 120;
      }
    }, id);
    await sleep(80);
    if ((await lab.count()) > 0) {
      const checked = (await inp.count()) > 0 ? await inp.isChecked().catch(() => false) : false;
      if (!checked) await lab.first().click({ force: true });
    } else if ((await inp.count()) > 0 && !(await inp.isChecked())) {
      await inp.click({ force: true });
    }
  }
  await page.getByRole('button', { name: /^(已选|已選)$/ }).click();
  await sleep(1200);
  console.log(
    'resv summary',
    await page.evaluate(() => {
      const t = document.body.innerText;
      return /电话|電話|邮箱|郵件|酒店|飯店|手机/.test(t);
    }),
  );

  // voucher
  await page.getByRole('button', { name: /代金券|바우처|voucher/i }).first().click().catch(() => {});
  await sleep(1000);
  const card = page.locator('[role=dialog] div, [role=dialog] button, div').filter({
    hasText: /예약정보로 확인|无需换货|無需換貨/,
  });
  if ((await card.count()) > 0) await card.first().click({ force: true }).catch(() => {});
  await page.getByRole('button', { name: /^(已选|已選|完成|确定|確定)$/ }).last().click().catch(() => {});
  await sleep(800);

  await saveThen('regs');
}

// —— OPTIONS ——
async function createOptions() {
  await page.goto(await listUrl(), { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  console.log('OPTIONS list', page.url());

  for (let i = 0; i < 4; i++) {
    const opt = OPTIONS[i];
    const price = PRICES[opt.key].n;
    console.log('\n=== create', i, opt.key, price);
    await page.getByRole('button', { name: /注册\/添加选项|註冊\/添加選項|注册\/添加/ }).first().click();
    await sleep(2500);
    await page.locator('#name, input[name=name]').first().fill(opt.name);
    await page.locator('#description, textarea[name=description]').first().fill(opt.desc);
    await page.locator('input[name=minPurchaseQuantity], #minPurchaseQuantity').fill('1').catch(() => {});
    await page.locator('input[name=maxPurchaseQuantity], #maxPurchaseQuantity').fill('10').catch(() => {});

    // price type
    await page.getByRole('button', { name: /选择价格类型|選擇價格類型|가격 타입/ }).first().click();
    await sleep(1200);
    await page.getByText(/其他价格类型|其他價格類型|기타 가격 타입/).first().click();
    await sleep(800);
    const namePh = page.locator(
      'input[placeholder*="销售渠道"], input[placeholder*="銷售渠道"], input[placeholder*="輸入的名稱"]',
    );
    await namePh.last().fill(opt.pt);
    const descPh = page.locator('input[placeholder*="滿"], input[placeholder*="例)"]');
    if ((await descPh.count()) > 0) await descPh.last().fill(opt.ptd);
    // checkboxes required + representative
    const req = page.locator('[aria-labelledby="ETC-required-label"], [aria-labelledby*="required"]');
    if ((await req.count()) > 0) {
      const a = await req.first().getAttribute('aria-checked');
      if (a !== 'true') await req.first().click();
    }
    const rep = page.locator('[aria-labelledby="ETC-representative-label"], [aria-labelledby*="representative"]');
    if ((await rep.count()) > 0) {
      const a = await rep.first().getAttribute('aria-checked');
      if (a !== 'true') await rep.first().click();
    }
    await page.getByRole('button', { name: /^(完成|완료)$/ }).last().click();
    await sleep(1000);
    // re-fill name
    await page.locator('#name, input[name=name]').first().fill(opt.name);

    // period + price
    const oneYear = page.locator('input[value=ONE_YEAR]');
    if ((await oneYear.count()) > 0) await oneYear.first().click({ force: true });
    await sleep(400);
    const priceIn = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]');
    if ((await priceIn.count()) > 0) {
      await priceIn.last().fill(price);
    }

    // times 08:00-21:30
    await setChinaTimes();
    await tempThenNext(`opt${i}`);
  }
}

async function setChinaTimes() {
  // open editor
  const setup = page.getByRole('button', { name: /设置时间|設定時間/ });
  if ((await setup.count()) > 0) {
    await setup.first().click();
  } else {
    const more = page.locator('button[aria-label="더 보기"], button').filter({ hasText: /더 보기/ });
    if ((await more.count()) > 0) {
      await more.first().click();
      await sleep(400);
      await page.getByText('编辑', { exact: true }).click().catch(() =>
        page.getByRole('menuitem', { name: /编辑|編輯/ }).click(),
      );
    }
  }
  await sleep(1500);
  // delete old
  const del = page.getByRole('button', { name: /删除|刪除/ });
  let guard = 0;
  while ((await del.count()) > 0 && guard++ < 40) {
    await del.first().click().catch(() => {});
    await sleep(80);
  }
  // 重复 小时 添加
  await page.getByRole('button', { name: /重复\s*小时\s*添加|반복 시간 추가/ }).click();
  await sleep(600);

  // start 08:00 — open first 选择
  const selects = page.locator('[role=dialog] button, [role=dialog] div').filter({ hasText: /^选择$|^選擇$/ });
  // simpler: use time inputs if present
  const timeFields = page.locator('[role=dialog] input, [role=dialog] button').filter({ hasText: /选择|選擇|00:|08:|21:/ });
  // click start field
  await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]');
    if (!dlg) return;
    const btns = Array.from(dlg.querySelectorAll('button,div[role=button]')).filter((b) =>
      /选择|選擇|^\d{2}:\d{2}$/.test((b.innerText || '').trim()),
    );
    // first time picker trigger
    const triggers = Array.from(dlg.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      return t === '选择' || t === '選擇' || /^\d{2}:\d{2}$/.test(t);
    });
    if (triggers[0]) triggers[0].click();
  });
  await sleep(500);
  // pick hour 08 left, minute 00 right via getByRole option
  const hour08 = page.getByRole('option', { name: '08' }).or(page.locator('[role=listbox] >> text=08'));
  // fallback click text in open list
  if ((await page.getByText('08', { exact: true }).count()) > 0) {
    // click first visible 08 for hour
    await page.locator('[role=dialog]').getByText('08', { exact: true }).first().click().catch(() => {});
  }
  await sleep(200);
  if ((await page.getByText('00', { exact: true }).count()) > 0) {
    await page.locator('[role=dialog]').getByText('00', { exact: true }).last().click().catch(() => {});
  }
  await sleep(300);
  // confirm dropdown if any
  await page.getByRole('button', { name: /确定|確定/ }).click().catch(() => {});
  await sleep(300);

  // end field
  await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]');
    if (!dlg) return;
    const triggers = Array.from(dlg.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      return t === '选择' || t === '選擇' || /^\d{2}:\d{2}$/.test(t);
    });
    if (triggers[1]) triggers[1].click();
    else if (triggers[0]) triggers[0].click();
  });
  await sleep(500);
  await page.locator('[role=dialog]').getByText('21', { exact: true }).first().click().catch(() => {});
  await sleep(200);
  await page.locator('[role=dialog]').getByText('30', { exact: true }).last().click().catch(() => {});
  await sleep(300);
  await page.getByRole('button', { name: /确定|確定/ }).click().catch(() => {});
  await sleep(300);

  // interval 分钟 30
  await page.getByText(/分钟|分鐘/, { exact: false }).first().click().catch(() => {});
  await sleep(400);
  await page.getByText('30', { exact: true }).last().click().catch(() => {});
  await sleep(400);

  // generate
  const gen = page.getByRole('button', { name: /^(生成|一代|생성)$/ });
  if ((await gen.count()) > 0 && !(await gen.first().isDisabled())) {
    await gen.first().click();
  } else {
    await page.locator('button').filter({ hasText: /生成|一代|생성/ }).first().click();
  }
  await sleep(1500);
  // modal 保存
  await page.locator('[role=dialog]').getByRole('button', { name: /^(保存|節省|节省)$/ }).click();
  await sleep(1500);

  const verify = await page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
    if (!m) return { count: 0 };
    const slots = m[1]
      .split(/[·.\s]+/)
      .map((s) => s.trim())
      .filter((x) => /^\d{2}:\d{2}$/.test(x));
    return { count: slots.length, first: slots[0], last: slots[slots.length - 1] };
  });
  console.log('  times verify', verify);
  if (!(verify.count === 28 && verify.first === '08:00' && verify.last === '21:30')) {
    console.log('  FAIL times gate');
  }
}

// —— TIMES fix all 4 ——
async function fixTimes() {
  const results = [];
  for (let i = 0; i < 4; i++) {
    await page.goto(await listUrl(), { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    const edits = page.getByRole('button', { name: /修改选项|修改選項/ });
    await edits.nth(i).click();
    await sleep(2500);
    // wait name
    for (let w = 0; w < 20; w++) {
      const v = await page.locator('#name').inputValue().catch(() => '');
      if (v && v.length > 5) break;
      await sleep(200);
    }
    let verify = await page.evaluate(() => {
      const t = document.body.innerText;
      const m = t.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
      if (!m) return { count: 0 };
      const slots = m[1]
        .split(/[·.\s]+/)
        .map((s) => s.trim())
        .filter((x) => /^\d{2}:\d{2}$/.test(x));
      return { count: slots.length, first: slots[0], last: slots[slots.length - 1] };
    });
    console.log('option', i, 'before', verify);
    if (!(verify.count === 28 && verify.first === '08:00' && verify.last === '21:30')) {
      await setChinaTimes();
      verify = await page.evaluate(() => {
        const t = document.body.innerText;
        const m = t.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
        if (!m) return { count: 0 };
        const slots = m[1]
          .split(/[·.\s]+/)
          .map((s) => s.trim())
          .filter((x) => /^\d{2}:\d{2}$/.test(x));
        return { count: slots.length, first: slots[0], last: slots[slots.length - 1] };
      });
    }
    const ok = verify.count === 28 && verify.first === '08:00' && verify.last === '21:30';
    results.push({ i, ok, verify });
    await tempThenNext(`time${i}`);
  }
  console.log('TIMES RESULTS', results);
  return results.every((r) => r.ok);
}

// —— HOLIDAYS ——
async function holidays() {
  const OPTS = [
    { key: '5go', ...PRICES['5go'] },
    { key: '7go', ...PRICES['7go'] },
    { key: '5rtn', ...PRICES['5rtn'] },
    { key: '7rtn', ...PRICES['7rtn'] },
  ];
  const SEGS = [
    { key: 'oct', y: 2026, m: 10, s: 1, e: 10, priceKey: 'oct' },
    { key: 'spring', y: 2027, m: 2, s: 1, e: 15, priceKey: 'spring' },
    { key: 'may', y: 2027, m: 5, s: 1, e: 10, priceKey: 'may' },
  ];

  async function listClean() {
    await page.keyboard.press('Escape').catch(() => {});
    await page.getByRole('button', { name: /^消除$/ }).click().catch(() => {});
    await sleep(400);
    await page.goto(await listUrl(), { waitUntil: 'domcontentloaded' });
    await sleep(2500);
  }

  for (let oi = 0; oi < 4; oi++) {
    for (const seg of SEGS) {
      const price = OPTS[oi][seg.priceKey];
      console.log(`holiday ${oi} ${OPTS[oi].key} ${seg.key} → ${price}`);
      await listClean();
      const cal = page.getByRole('button', { name: /销售日历管理|판매 캘린더/ });
      await cal.nth(oi).scrollIntoViewIfNeeded();
      await cal.nth(oi).click();
      await sleep(2000);
      await page.getByRole('button', { name: /选择单个日期|單一日期|단일 날짜/ }).click().catch(() => {});
      await sleep(400);
      // goto month
      for (let g = 0; g < 40; g++) {
        const cap = await page.evaluate(() => {
          const el = Array.from(document.querySelectorAll('div,span')).find((e) =>
            /^\d{1,2}\s*月\s*20\d{2}$/.test((e.innerText || '').trim()),
          );
          return el?.innerText?.trim();
        });
        const m = String(cap || '').match(/^(\d{1,2})\s*月\s*(20\d{2})$/);
        if (m && +m[1] === seg.m && +m[2] === seg.y) break;
        const cur = m ? +m[2] * 12 + +m[1] : 0;
        const tgt = seg.y * 12 + seg.m;
        if (cur < tgt) await page.locator('button[class*="custom-caption__NextButton"]').click();
        else await page.locator('button[class*="custom-caption__PreviousButton"]').click();
        await sleep(250);
      }
      for (let d = seg.s; d <= seg.e; d++) {
        const dayBtn = page.locator('button[class*="custom-day__PlainDayButton"]').filter({
          hasText: new RegExp(`^${d}$`),
        });
        if ((await dayBtn.count()) > 0) {
          await dayBtn.first().click({ force: true });
          await sleep(30);
        }
      }
      const priceIn = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]').last();
      await priceIn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      for (let w = 0; w < 20; w++) {
        if (!(await priceIn.isDisabled().catch(() => true))) break;
        await sleep(100);
      }
      if (!(await priceIn.isDisabled().catch(() => true))) await priceIn.fill(String(price));
      await page.getByRole('button', { name: /^完成$/ }).click();
      await sleep(1800);
    }
  }

  // verify spring 625 for 7go and 7rtn
  for (const oi of [1, 3]) {
    await listClean();
    const cal = page.getByRole('button', { name: /销售日历管理/ });
    await cal.nth(oi).scrollIntoViewIfNeeded();
    await cal.nth(oi).click();
    await sleep(2000);
    // nav to 2027-2
    for (let g = 0; g < 40; g++) {
      const cap = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('div,span')).find((e) =>
          /^\d{1,2}\s*月\s*20\d{2}$/.test((e.innerText || '').trim()),
        );
        return el?.innerText?.trim();
      });
      const m = String(cap || '').match(/^(\d{1,2})\s*月\s*(20\d{2})$/);
      if (m && +m[1] === 2 && +m[2] === 2027) break;
      await page.locator('button[class*="custom-caption__NextButton"]').click().catch(() => {});
      await sleep(250);
    }
    const prices = await page.evaluate(() => {
      const out = {};
      for (const el of document.querySelectorAll(
        '[class*="custom-day___StyledContainer"], td.rdp-cell',
      )) {
        const t = (el.innerText || '').trim();
        const m = t.match(/^(\d{1,2})\s*[\n\s]+(\d+)/);
        if (m && (m[1] === '1' || m[1] === '15')) out[m[1]] = m[2];
      }
      return out;
    });
    console.log('VERIFY spring', oi, prices, 'expect 625');
    await page.getByRole('button', { name: /^消除$/ }).click().catch(() => {});
    await sleep(500);
  }

  await listClean();
  // page temp save
  const temps = page.locator('button').filter({ hasText: /^(临时保存|臨時存儲)$/ });
  const n = await temps.count();
  for (let i = n - 1; i >= 0; i--) {
    if (!(await temps.nth(i).isDisabled())) {
      await temps.nth(i).click();
      break;
    }
  }
  await sleep(2000);
  console.log('holidays done; NEVER 提交审核');
}

// main
console.log('phase', PHASE, 'images', IMG);
if (PHASE === 'intro' || PHASE === 'all') await fillIntro();
if (PHASE === 'regs' || PHASE === 'all') await fillRegs();
if (PHASE === 'options' || PHASE === 'all') await createOptions();
if (PHASE === 'times' || PHASE === 'all') await fixTimes();
if (PHASE === 'holidays' || PHASE === 'all') await holidays();
console.log('DONE', page.url());
process.exit(0);
