/**
 * ITM: Osaka city hotel ↔ Itami Airport
 * Skill gates: Excel only, no URL skip, 保存然後 enabled before next page,
 * 私人的, 代表預約信息, option 下個, stop on option list, never 批准請求
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PRODUCT_NAME = '오사카 시내 호텔 ↔ 이타미공항(ITM) 단독 차량 편도 이동 서비스';
const INTERNAL_NAME = '大阪市区-大阪国际机场（伊丹机场）(ITM)';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/itami-airport';
const IMAGES = ['itami-1.jpg', 'itami-2.jpg', 'itami-3.jpg'].map((f) => path.join(IMG_DIR, f));

const INCLUDE_TRANSPORT =
  '오사카 시내 호텔 ↔ 이타미공항(ITM) 편도 전용 차량 이동 및 주차비 포함';
const INCLUDE_PICKUP = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE =
  '항공권, 공항 이용료, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

const OPTIONS = [
  {
    name: '오사카 시내 호텔 출발 → 이타미공항(ITM) 편도 이동 (7인승 차량)',
    desc: '오사카 시내 호텔 출발 → 이타미공항(ITM) 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '7seat go',
    priceTypeDesc: '7인승 차량',
    price: '77',
  },
  {
    name: '오사카 시내 호텔 출발 → 이타미공항(ITM) 편도 이동 (10인승 차량)',
    desc: '오사카 시내 호텔 출발 → 이타미공항(ITM) 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '10seat go',
    priceTypeDesc: '10인승 차량',
    price: '105',
  },
  {
    name: '이타미공항(ITM) 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)',
    desc: '이타미공항(ITM) 출발 → 오사카 시내 호텔 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '7seat rtn',
    priceTypeDesc: '7인승 차량',
    price: '77',
  },
  {
    name: '이타미공항(ITM) 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)',
    desc: '이타미공항(ITM) 출발 → 오사카 시내 호텔 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '10seat rtn',
    priceTypeDesc: '10인승 차량',
    price: '105',
  },
];

const RESV_IDS = [
  'CELLPHONE-required',
  'EMAIL-required',
  'ENGLISH_LAST_NAME-required',
  'ENGLISH_FIRST_NAME-required',
  'DEPARTURE_DATE_TIME-required',
  'ARRIVAL_FLIGHT_NUMBER-required',
  'ARRIVAL_DATE_TIME-required',
  'DEPARTURE_FLIGHT_NUMBER-required',
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

async function bottom(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => /保存然後|臨時存儲|批准請求/.test(b.innerText || ''))
      .map((b) => ({ t: (b.innerText || '').trim(), d: b.disabled })),
  );
}

async function clickSaveThen(page, label) {
  const b = await bottom(page);
  console.log(`[${label}] bottom`, b);
  if (!b.some((x) => x.t === '保存然後' && !x.d)) {
    console.log(`[${label}] 保存然後 NOT enabled — STOP gate`);
    return false;
  }
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => (x.innerText || '').trim() === '保存然後' && !x.disabled)
      ?.click();
  });
  await sleep(3500);
  console.log(`[${label}] after 保存然後`, page.url());
  return true;
}

async function tempSave(page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return { i, t: (b.innerText || '').trim(), d: b.disabled, y: r.y };
      })
      .filter((b) => b.t === '臨時存儲' && !b.d)
      .sort((a, b) => b.y - a.y);
    if (buttons[0]) document.querySelectorAll('button')[buttons[0].i].click();
  });
  await sleep(2000);
  console.log('tempSave (never approval)');
}

async function fill(page, sel, val) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) return;
  await loc.click({ force: true });
  await loc.fill(String(val));
  console.log(sel, '=>', await loc.inputValue());
}

async function setTimes(page) {
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').includes('設定時間'))
      ?.click(),
  );
  await sleep(1500);
  await page.getByText('반복 시간 추가', { exact: true }).click({ force: true }).catch(() => {});
  await sleep(800);

  async function pick(idx, hour, minute) {
    const fields = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return { i, t, visible: r.height > 0 };
        })
        .filter((b) => (b.t === '选择' || /^\d{2}:\d{2}$/.test(b.t)) && b.visible),
    );
    const target = fields[idx] || fields[0];
    if (target) await page.locator('button').nth(target.i).click({ force: true });
    await sleep(500);
    await page.evaluate((h) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === h,
      );
      if (opts.length) {
        opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      const els = Array.from(document.querySelectorAll('div,li,span')).filter(
        (el) =>
          (el.innerText || '').trim() === h &&
          el.children.length === 0 &&
          el.getBoundingClientRect().height > 10,
      );
      els.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      els[0]?.click();
    }, hour);
    await sleep(200);
    await page.evaluate((m) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === m,
      );
      if (opts.length) {
        opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      const lists = Array.from(
        document.querySelectorAll('[class*="option-list"],[class*="List"]'),
      ).filter((l) => l.getBoundingClientRect().height > 20);
      const minList = lists[1] || lists[0];
      if (minList)
        Array.from(minList.querySelectorAll('*'))
          .find((e) => (e.innerText || '').trim() === m && e.children.length === 0)
          ?.click();
    }, minute);
    await sleep(400);
  }

  await pick(0, '07', '00');
  await pick(1, '21', '30');
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '分鐘')
      ?.click(),
  );
  await sleep(400);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role=option],button,li,div')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '30' && r.width > 0 && r.height > 0 && (el.children?.length || 0) <= 1;
    });
    els.at(-1)?.click();
  });
  await sleep(300);
  const gen = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b, i) => ({ i, t: (b.innerText || '').trim() }))
      .filter((b) => b.t === '생성' || b.t === '生成'),
  );
  console.log('gen', gen);
  if (gen[0]) await page.locator('button').nth(gen[0].i).click({ force: true });
  await sleep(2500);
  const body = await page.locator('body').innerText();
  const all = [...body.matchAll(/\b([01]\d|2[0-3]):[0-5]\d\b/g)].map((m) => m[0]);
  const unique = [...new Set(all)].filter((t) => {
    const [h, mi] = t.split(':').map(Number);
    return h >= 7 && h <= 21 && (mi === 0 || mi === 30);
  });
  console.log('slots', unique.length, unique[0], unique.at(-1));
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '節省')
      ?.click(),
  );
  await sleep(1500);
  return { ok: unique.length >= 28, count: unique.length };
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().includes('tour.triple.partners'));
  if (!page) throw new Error('no NOL tab');
  await page.bringToFront();

  // ---- list / resume or create ----
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  let body = await page.locator('body').innerText();

  if (body.includes('이타미공항(ITM)') || body.includes(PRODUCT_NAME)) {
    console.log('Resume ITM draft');
    const card = page.locator('div[class*="slot___StyledContainer4"]').filter({ hasText: '이타미공항(ITM)' }).first();
    await card.scrollIntoViewIfNeeded();
    await card.click({ force: true });
    await sleep(3500);
  } else {
    console.log('Create new product');
    await page.getByText('新產品註冊').first().click();
    await sleep(1200);
    const inputs = page.locator('input');
    const n = await inputs.count();
    await inputs.nth(n > 1 ? 1 : 0).fill(PRODUCT_NAME);
    await page.getByText('TRANSPORTATION', { exact: false }).first().click().catch(async () => {
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('*'))
          .find((e) => /TRANSPORTATION|運輸/.test(e.innerText || ''))
          ?.click();
      });
    });
    await sleep(300);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /開始創建|상품 만들기/.test(b.innerText || ''))
        ?.click();
    });
    await page.waitForURL(/registration\/properties/, { timeout: 60000 }).catch(() => {});
    await sleep(2500);
  }

  console.log('url', page.url());
  const productId = new URL(page.url()).searchParams.get('id');
  console.log('productId', productId);
  if (!productId) throw new Error('no product id');
  fs.writeFileSync('/tmp/nol-itami-id.txt', productId);

  // ========== ATTRIBUTES ==========
  console.log('\n=== ATTR ===');
  // only fill if on properties (from create/resume)
  if (!page.url().includes('/properties')) {
    // click stepper 產品屬性 if needed
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div')).find(
        (e) => (e.innerText || '').trim() === '產品屬性' && e.getAttribute('aria-disabled') !== 'true',
      );
      el?.click();
    });
    await sleep(2500);
  }

  if (await page.locator('#title').count()) {
    await page.locator('#title').fill(PRODUCT_NAME);
    await page.locator('#managementTitle').fill(INTERNAL_NAME);
    if (await page.locator('#requiredNumberOfPeople').count())
      await page.locator('#requiredNumberOfPeople').fill('1');
    if (await page.locator('#availableNumberOfPeople').count())
      await page.locator('#availableNumberOfPeople').fill('9');
  }

  // 私人的 — critical
  await page.locator('input[name=tourTypes][value="0"]').check({ force: true }).catch(async () => {
    await page.getByText('私人的', { exact: false }).first().click({ force: true });
  });
  await page.evaluate(() => {
    const limitYes = Array.from(document.querySelectorAll('input[name=isPassengerLimit]')).find(
      (i) => i.value === '1',
    );
    if (limitYes && !limitYes.checked) limitYes.click();
  });
  const priv = await page.evaluate(
    () => document.querySelector('input[name=tourTypes][value="0"]')?.checked,
  );
  console.log('私人的 checked?', priv);

  // POI if needed
  body = await page.locator('body').innerText();
  if (!/이타미|Itami|伊丹/.test(body) || body.includes('添加地區')) {
    const addPlace = page.getByText('添加地區和地點').or(page.getByText('添加地点')).or(page.getByText('添加地區'));
    if (await addPlace.count()) {
      await addPlace.first().click();
      await sleep(1000);
      await page.locator('input[type=text]').last().fill('이타미 공항');
      await sleep(1500);
      await page.keyboard.press('Enter');
      await sleep(1500);
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('div,li,button'))
          .find(
            (el) =>
              /이타미|Itami|伊丹|大阪国際/.test(el.innerText || '') &&
              (el.innerText || '').length < 100,
          )
          ?.click();
      });
      await sleep(800);
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('*'))
          .find(
            (e) =>
              /TRAVEL_PLACE|관광지|旅遊地/.test(e.innerText || '') &&
              (e.innerText || '').length < 40,
          )
          ?.click();
      });
      await sleep(400);
      await page.evaluate(() => {
        const adds = Array.from(document.querySelectorAll('button')).filter((b) =>
          /添加|추가/.test(b.innerText || ''),
        );
        adds.at(-1)?.click();
      });
      await sleep(1000);
    }
  }

  if (!(await clickSaveThen(page, 'attr'))) {
    console.log('ATTR gate failed — dump invalids');
    console.log(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('[aria-invalid=true]')).map((e) => ({
          n: e.name,
          id: e.id,
          v: e.value,
        })),
      ),
    );
    await tempSave(page);
    process.exit(1);
  }

  // ========== INTRO ==========
  console.log('\n=== INTRO ===', page.url());
  await sleep(1500);
  const thumbs = await page.evaluate(
    () => Array.from(document.querySelectorAll('img')).filter((i) => (i.naturalWidth || i.width) > 40).length,
  );
  console.log('thumbs', thumbs);
  if (thumbs < 3) {
    for (const img of IMAGES) {
      if (!fs.existsSync(img)) continue;
      const chooserP = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      await page
        .getByText('上傳圖片')
        .first()
        .click()
        .catch(async () => {
          await page.evaluate(() =>
            Array.from(document.querySelectorAll('button,div,label'))
              .find((x) => /上傳圖片|이미지 등록/.test(x.innerText || ''))
              ?.click(),
          );
        });
      const ch = await chooserP;
      if (ch) {
        await ch.setFiles(img);
        await sleep(3000);
        console.log('up', path.basename(img));
      } else {
        const fi = page.locator('input[type=file]');
        if (await fi.count()) {
          await fi.last().setInputFiles(img);
          await sleep(3000);
          console.log('up input', path.basename(img));
        }
      }
    }
  }

  const headline =
    '오사카 시내 호텔과 이타미공항(ITM)을 편안하게 연결하는 단독 차량 이동 서비스입니다.';
  const highlight = `오사카 시내 호텔 ↔ 이타미공항(ITM) 편도 전용 차량 이동
공항 도착/출발 시간에 맞춘 프라이빗 픽업 및 샌딩
7인승·10인승 차량 중 인원과 수하물에 맞게 선택 가능`;
  const description = `이 서비스는 오사카 시내 호텔과 이타미공항(ITM, 오사카 국제공항) 사이를 편도 단독 차량으로 이동하는 공항 픽업/샌딩 서비스입니다.
낯선 도시에서 대중교통 환승이나 택시 대기 없이, 예약한 시간에 맞춰 편안하게 이동하실 수 있습니다.

포함 사항:
- 오사카 시내 호텔 ↔ 이타미공항(ITM) 편도 전용 차량 이동 1회
- 차량, 기사, 기본 주차비 포함

예약 시 오사카 시내 호텔명/주소, 이타미공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
기사님은 보통 이용 전날 WhatsApp 또는 SMS로 고객님께 연락드립니다.
선택한 방향, 픽업/샌딩 장소, 이용 시간, 항공편 정보를 반드시 확인해 주세요.
별도 바우처 교환은 필요하지 않습니다.
경로·시간·주소 변경은 이용 최소 2일 전까지 요청해 주세요. 아동용 카시트, 야간 할증 등은 포함되지 않습니다.`;
  const checkList = `- 본 상품은 오사카 시내 호텔 ↔ 이타미공항(ITM) 편도 전용 차량 이동 서비스입니다.
- 7인승 차량은 최대 4명 및 24인치 수하물 5개까지, 10인승 차량은 최대 9명 및 26인치 수하물 10개까지 이용 가능합니다.
- 예약 시 호텔명/주소, 공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업/샌딩 장소, 연락 가능한 휴대전화 번호를 정확히 입력해 주세요.
- 기사님은 보통 이용 전날 WhatsApp 또는 SMS로 연락드립니다.
- 변경 사항은 최소 이용 2일 전까지 요청해 주세요.
- 아동용 카시트, 야간 할증, 개인 비용, 팁 및 추가 경유지는 포함되어 있지 않습니다.
- 왕복 이용을 원하시는 경우 각 방향을 별도로 예약해 주세요.`;
  const usage = `1. 예약 시 오사카 시내 호텔명/주소, 이타미공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 입력해 주세요.
2. 예약 후 영업일 기준 3일 이내 확정 여부를 안내드립니다.
3. 별도 바우처 교환은 필요하지 않으며, 예약 정보 확인 후 이용하시면 됩니다.
4. 기사님은 보통 이용 전날 WhatsApp 또는 SMS로 연락드리며, 예약한 시간과 장소에서 차량을 이용해 주세요.`;

  if (await page.locator('#headline').count()) await page.locator('#headline').fill(headline);
  if (await page.locator('#highlight').count()) await page.locator('#highlight').fill(highlight);
  if (await page.locator('#description').count()) await page.locator('#description').fill(description);
  if (await page.locator('#checkList').count()) await page.locator('#checkList').fill(checkList);
  if (await page.locator('#usage').count()) await page.locator('#usage').fill(usage);
  await page.evaluate(() => {
    const none = Array.from(document.querySelectorAll('input[name=scheduleType]')).find(
      (i) => i.value === 'NONE',
    );
    if (none && !none.checked) none.click();
  });
  await sleep(500);

  if (!(await clickSaveThen(page, 'intro'))) {
    await tempSave(page);
    process.exit(1);
  }

  // ========== REGULATIONS ==========
  console.log('\n=== REGS ===', page.url());
  await sleep(1500);
  await fill(page, '#minimumPurchaseDay', '3');
  await fill(page, '#minimumPurchaseQuantityPerSession', '1');
  await fill(page, '#maximumPurchaseQuantityPerSession', '10');
  await fill(page, '#confirmationLeadTimeValue', '3');
  await page.locator('#confirmationLeadTimeType').selectOption('DAYS').catch(() => {});
  await page.locator('input[name=bookingConfirmType][value=MANUAL]').check({ force: true }).catch(() => {});
  await page.locator('input[name=isPartnerConfirm][value="true"]').check({ force: true }).catch(() => {});
  await page.locator('input[name=isCancelType][value="1"]').check({ force: true }).catch(() => {});
  await page
    .locator('input[name="range-select.inventory-managed"][value="RIGHT"]')
    .check({ force: true })
    .catch(() => {});
  await fill(page, 'input[name="windows.0.deadline"]', '2');
  await fill(page, 'input[name="windows.0.penalty"]', '0');

  body = await page.locator('body').innerText();
  if (!/이타미공항\(ITM\) 편도 전용/.test(body) && !body.includes('편도 전용 차량 이동 및 주차비')) {
    const edit = page.locator('button').filter({ hasText: /撰写|编辑|編輯|작성/ });
    if (await edit.count()) {
      await edit.first().click();
      await sleep(1200);
      await page.evaluate(() => {
        for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP']) {
          const el = document.getElementById(id);
          if (el && !el.checked) (el.closest('label') || el).click();
        }
      });
      if (await page.locator('#inclusions_TRANSPORTATION_description').count())
        await page.locator('#inclusions_TRANSPORTATION_description').fill(INCLUDE_TRANSPORT);
      if (await page.locator('#inclusions_PICK_UP_description').count())
        await page.locator('#inclusions_PICK_UP_description').fill(INCLUDE_PICKUP);
      if (await page.locator('#exclusions').count()) await page.locator('#exclusions').fill(EXCLUDE);
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('button'))
          .find((b) => ['節省', '완료', '完成'].includes((b.innerText || '').trim()))
          ?.click(),
      );
      await sleep(1200);
      console.log('include ok');
    }
  }

  body = await page.locator('body').innerText();
  if (!body.includes('예약정보로 확인')) {
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .find((b) => /選擇代金券|代金券及其使用/.test(b.innerText || ''))
        ?.click(),
    );
    await sleep(2000);
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div')).filter((d) => {
        const t = (d.innerText || '').trim();
        return t.includes('예약정보로 확인') && t.includes('無需換貨') && t.length < 180;
      });
      cards.sort((a, b) => a.innerText.length - b.innerText.length);
      cards[0]?.click();
    });
    await sleep(2000);
    console.log('voucher ok');
  }

  // 代表預約信息
  await page.getByRole('button', { name: '代表預約信息', exact: true }).click({ force: true });
  await sleep(2000);
  for (const rid of RESV_IDS) {
    let ok = false;
    for (let a = 0; a < 30; a++) {
      ok = await page.evaluate((rid) => {
        const el = document.getElementById(rid);
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
            role.click();
            break;
          }
        }
        if (!el.checked) {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return el.checked;
      }, rid);
      if (ok) break;
      await sleep(50);
    }
    console.log(rid, ok);
  }
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .find((x) => /已選/.test(x.innerText || '') && !x.disabled)
      ?.click(),
  );
  await sleep(2500);

  // delete blank windows.1 if any
  if (await page.locator('input[name="windows.1.deadline"]').count()) {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .filter((b) => /刪除|删除/.test((b.innerText || '').trim()))
        .at(-1)
        ?.click();
    });
    await sleep(400);
  }
  await fill(page, 'input[name="windows.0.deadline"]', '2');
  await fill(page, 'input[name="windows.0.penalty"]', '0');

  body = await page.locator('body').innerText();
  console.log('resv red?', body.includes('您必須輸入代表'));
  console.log('resv snippet', body.match(/代表預約信息[\s\S]{0,200}/)?.[0]);

  if (!(await clickSaveThen(page, 'regs'))) {
    await tempSave(page);
    process.exit(1);
  }

  // If still on regs, click stepper 選項管理
  if (!page.url().includes('/option')) {
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div')).find(
        (e) =>
          (e.innerText || '').trim() === '選項管理' && e.getAttribute('aria-disabled') !== 'true',
      );
      el?.click();
    });
    await sleep(3000);
  }
  console.log('option page', page.url());

  // ========== OPTIONS ==========
  const results = [];
  for (const opt of OPTIONS) {
    console.log('\n=== OPT', opt.priceTypeName, opt.price, '===');
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(400);
    if (!page.url().includes('/option')) {
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('div'))
          .find(
            (e) =>
              (e.innerText || '').trim() === '選項管理' &&
              e.getAttribute('aria-disabled') !== 'true',
          )
          ?.click();
      });
      await sleep(2500);
    }
    const listText = await page.locator('body').innerText();
    if (listText.includes(opt.name)) {
      console.log('exists skip');
      results.push({ skip: true, name: opt.priceTypeName });
      continue;
    }

    await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '註冊/添加選項')
        ?.click(),
    );
    await sleep(2500);
    if ((await page.locator('body').innerText()).includes('원활하지')) {
      await page.getByText('돌아가기').click().catch(() => {});
      await sleep(2000);
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('button'))
          .find((b) => (b.innerText || '').trim() === '註冊/添加選項')
          ?.click(),
      );
      await sleep(2500);
    }
    if (!(await page.locator('#name').count())) {
      results.push({ error: 'no form', name: opt.priceTypeName });
      continue;
    }

    await page.locator('#name').fill(opt.name);
    await page.locator('#description').fill(opt.desc);
    await page.locator('input[name="rule.bookingRule.minimumPurchaseQuantityPerSession"]').fill('1');
    await page.locator('input[name="rule.bookingRule.maximumPurchaseQuantityPerSession"]').fill('10');

    await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').includes('가격 타입 선택'))
        ?.click(),
    );
    await sleep(800);
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').includes('기타 가격 타입'))
        ?.click(),
    );
    await sleep(1200);
    await page.locator('input[placeholder="輸入的名稱將顯示在銷售渠道上。"]').fill(opt.priceTypeName);
    await page.locator('input[placeholder="例) 滿 19 歲以上"]').fill(opt.priceTypeDesc);
    const nameless = page.locator('input[type=tel]:not([name])');
    if ((await nameless.count()) >= 2) {
      await nameless.nth(0).fill('1');
      await nameless.nth(1).fill('10');
    }
    await page.locator('[aria-labelledby="ETC-required-label"]').click({ force: true }).catch(() => {});
    await page
      .locator('[aria-labelledby="ETC-representative-label"]')
      .click({ force: true })
      .catch(() => {});
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '완료')
        ?.click(),
    );
    await sleep(1500);
    await page.locator('#name').fill(opt.name);
    await page.locator('#description').fill(opt.desc);

    await page
      .locator('input[value="ONE_YEAR"]')
      .check({ force: true })
      .catch(async () => {
        await page.locator('label').filter({ hasText: /^1年$/ }).click({ force: true });
      });
    await sleep(1400);
    const price = page.locator('input[placeholder="請輸入價格"]');
    console.log('price disabled', await price.isDisabled().catch(() => true));
    await price.fill(opt.price);
    await page.locator('#name').click();
    await sleep(500);
    console.log('has price', (await page.locator('body').innerText()).includes(opt.price));

    const times = await setTimes(page);
    await page.locator('#name').fill(opt.name);

    // 下個 — user correction
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const r = b.getBoundingClientRect();
          return {
            i,
            text: (b.innerText || '').trim(),
            disabled: b.disabled || b.getAttribute('aria-disabled') === 'true',
            w: Math.round(r.width),
            y: Math.round(r.y),
          };
        })
        .filter((b) => b.text === '下個' && !b.disabled && b.w > 200)
        .sort((a, b) => b.y - a.y);
      if (buttons[0]) document.querySelectorAll('button')[buttons[0].i].click();
    });
    await sleep(4000);
    const after = await page.locator('body').innerText();
    console.log('card', after.includes(opt.name), times);
    results.push({ name: opt.priceTypeName, card: after.includes(opt.name), times });
  }

  // STOP on option list
  const finalText = await page.locator('body').innerText();
  console.log('\n=== STOP ON OPTION LIST ===');
  console.log('productId', productId);
  for (const o of OPTIONS) console.log(o.priceTypeName, finalText.includes(o.name));
  console.log('selling', (finalText.match(/판매중/g) || []).length);
  console.log(JSON.stringify(results, null, 2));
  await tempSave(page);
  await page.screenshot({ path: '/tmp/nol-itami-done.png', fullPage: true });
  console.log('APPROVAL_CLICKED: false');
  console.log('STOPPED_AT: option list per skill');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
