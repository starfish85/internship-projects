/**
 * NOL: Tokyo city hotel ↔ Narita Airport (NRT) transfer listing
 * Safety: NEVER click 批准請求 / 승인 요청
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PRODUCT_NAME = '도쿄 시내 호텔 ↔ 나리타공항(NRT) 단독 차량 편도 이동 서비스';
const INTERNAL_NAME = '东京市区-成田机场(NRT)';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/narita-airport';
const IMAGES = ['narita-1.jpg', 'narita-2.jpg', 'narita-3.jpg'].map((f) => path.join(IMG_DIR, f));

const OPTIONS = [
  {
    name: '도쿄 시내 호텔 출발 → 나리타공항(NRT) 편도 이동 (7인승 차량)',
    desc: '도쿄 시내 호텔 출발 → 나리타공항(NRT) 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '7seat go',
    priceTypeDesc: '7인승 차량',
    price: '112',
  },
  {
    name: '도쿄 시내 호텔 출발 → 나리타공항(NRT) 편도 이동 (10인승 차량)',
    desc: '도쿄 시내 호텔 출발 → 나리타공항(NRT) 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '10seat go',
    priceTypeDesc: '10인승 차량',
    price: '175',
  },
  {
    name: '나리타공항(NRT) 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)',
    desc: '나리타공항(NRT) 출발 → 도쿄 시내 호텔 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '7seat rtn',
    priceTypeDesc: '7인승 차량',
    price: '112',
  },
  {
    name: '나리타공항(NRT) 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)',
    desc: '나리타공항(NRT) 출발 → 도쿄 시내 호텔 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '10seat rtn',
    priceTypeDesc: '10인승 차량',
    price: '175',
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function neverApprove(page) {
  // hard guard: refuse to click approval texts
  return page.evaluate(() => {
    const bad = Array.from(document.querySelectorAll('button')).filter((b) =>
      /批准請求|승인 요청|提交審核/.test((b.innerText || '').trim()),
    );
    return bad.map((b) => b.innerText.trim());
  });
}

async function tempSave(page) {
  const bad = await neverApprove(page);
  console.log('approval buttons present (will NOT click):', bad);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(
      (b) => (b.innerText || '').trim() === '臨時存儲' && !b.disabled,
    );
    buttons[buttons.length - 1]?.click();
  });
  await sleep(2000);
  const t = await page.locator('body').innerText();
  console.log('temp save toast?', /임시저장|暂时保存|臨時/.test(t));
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
  if (!page) throw new Error('no NOL tab');
  await page.bringToFront();

  // ---- 1. List / resume or create ----
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  let body = await page.locator('body').innerText();
  let productId = null;

  if (body.includes(PRODUCT_NAME) || body.includes('나리타공항(NRT)')) {
    console.log('Resume existing Narita draft');
    await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('div')).filter(
        (e) => e.className && String(e.className).includes('slot___StyledContainer4') && e.innerText.includes('나리타'),
      );
      (cards[0] || Array.from(document.querySelectorAll('div')).find((d) => d.innerText?.includes(name)))?.click();
    }, PRODUCT_NAME);
    await sleep(3000);
  } else {
    console.log('Create new transportation product');
    await page.getByText('新產品註冊').first().click();
    await sleep(1000);
    const inputs = page.locator('input');
    const n = await inputs.count();
    await inputs.nth(n > 1 ? 1 : 0).fill(PRODUCT_NAME);
    await page.getByText('TRANSPORTATION', { exact: false }).first().click().catch(async () => {
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('*')).find((e) =>
          /TRANSPORTATION|運輸|교통/.test(e.innerText || ''),
        );
        el?.click();
      });
    });
    await sleep(400);
    await page.getByText('開始創建產品').click().catch(async () => {
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find((x) =>
          /開始創建|상품 만들기|创建产品/.test(x.innerText || ''),
        );
        b?.click();
      });
    });
    await page.waitForURL(/registration\/properties/, { timeout: 60000 }).catch(() => {});
    await sleep(2500);
  }

  productId = new URL(page.url()).searchParams.get('id');
  console.log('productId', productId, 'url', page.url());
  if (!productId) {
    // maybe still on list - try click again
    body = await page.locator('body').innerText();
    console.log(body.slice(0, 800));
    throw new Error('no product id');
  }

  // ---- 2. Attributes ----
  await page.goto(
    `https://tour.triple.partners/product-management/registration/properties?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2000);
  await page.locator('#title').fill(PRODUCT_NAME);
  await page.locator('#managementTitle').fill(INTERNAL_NAME);
  // min/max people
  if (await page.locator('#requiredNumberOfPeople').count()) {
    await page.locator('#requiredNumberOfPeople').fill('1');
  }
  if (await page.locator('#availableNumberOfPeople').count()) {
    await page.locator('#availableNumberOfPeople').fill('9');
  }
  // private / passenger limit radios if needed
  await page.evaluate(() => {
    const priv = document.querySelector('input[name=tourTypes][value="0"]');
    if (priv && !priv.checked) priv.click();
    const limitYes = Array.from(document.querySelectorAll('input[name=isPassengerLimit]')).find((i) => i.value === '1');
    if (limitYes && !limitYes.checked) limitYes.click();
    const nat = Array.from(document.querySelectorAll('input[name=nationalityType]')).find(
      (i) => i.value === 'ANOTHER_NATIONALITY',
    );
    if (nat && !nat.checked) nat.click();
  });

  // POI: search 나리타 if not set
  body = await page.locator('body').innerText();
  if (!body.includes('나리타') || !body.includes('공항')) {
    const addPlace = page.getByText('添加地區和地點').or(page.getByText('添加地点'));
    if (await addPlace.count()) {
      await addPlace.first().click();
      await sleep(1000);
      const search = page.locator('input[type=text]').last();
      await search.fill('나리타 국제공항');
      await sleep(1500);
      await page.keyboard.press('Enter');
      await sleep(1500);
      // click first result
      await page.evaluate(() => {
        const r = Array.from(document.querySelectorAll('div,li,button')).find((el) =>
          /나리타|成田|Narita/.test(el.innerText || '') && (el.innerText || '').length < 80,
        );
        r?.click();
      });
      await sleep(800);
      // location type TRAVEL_PLACE + final add
      await page.evaluate(() => {
        const t = Array.from(document.querySelectorAll('*')).find((e) => /TRAVEL_PLACE|관광지|旅遊地/.test(e.innerText || '') && e.innerText.length < 40);
        t?.click();
      });
      await sleep(400);
      await page.evaluate(() => {
        const adds = Array.from(document.querySelectorAll('button')).filter((b) => /添加|추가/.test(b.innerText || ''));
        adds[adds.length - 1]?.click();
      });
      await sleep(1000);
    }
  }
  await tempSave(page);

  // ---- 3. Introduction + images ----
  await page.goto(
    `https://tour.triple.partners/product-management/registration/introduction?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2000);

  // Upload images if fewer than 3 product images
  const imgCount = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).filter((i) => (i.alt || '').includes('이미지') || (i.src || '').includes('triple-cms')).length,
  );
  console.log('existing cms images', imgCount);
  if (imgCount < 3) {
    for (const imgPath of IMAGES) {
      if (!fs.existsSync(imgPath)) {
        console.log('missing', imgPath);
        continue;
      }
      const chooserPromise = page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
      await page.getByText('上傳圖片').or(page.getByText('이미지 등록')).or(page.getByText('이미지 등록')).first().click().catch(async () => {
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button,div')).find((x) =>
            /上傳圖片|이미지 등록|이미지 등록/.test(x.innerText || ''),
          );
          b?.click();
        });
      });
      const chooser = await chooserPromise;
      if (chooser) {
        await chooser.setFiles(imgPath);
        await sleep(2500);
        console.log('uploaded', path.basename(imgPath));
      } else {
        // try input file
        const fileInputs = page.locator('input[type=file]');
        const fc = await fileInputs.count();
        if (fc) {
          await fileInputs.nth(fc - 1).setInputFiles(imgPath);
          await sleep(2500);
          console.log('uploaded via input', path.basename(imgPath));
        } else {
          console.log('no file chooser for', imgPath);
        }
      }
    }
  }

  // Text fields
  const headline =
    '도쿄 시내 호텔과 나리타공항(NRT)을 편안하게 연결하는 단독 차량 이동 서비스입니다.';
  const highlight = `도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동
공항 도착/출발 시간에 맞춘 프라이빗 픽업 및 샌딩
7인승·10인승 차량 중 인원과 수하물에 맞게 선택 가능`;
  const description = `이 서비스는 도쿄 시내 호텔과 나리타공항(NRT) 사이를 편도 단독 차량으로 이동하는 공항 픽업/샌딩 서비스입니다.
낯선 도시에서 대중교통 환승이나 택시 대기 없이, 예약한 시간에 맞춰 편안하게 이동하실 수 있습니다.

포함 사항:
- 도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동 1회
- 차량, 기사, 기본 주차비 포함

예약 시 도쿄 시내 호텔명/주소, 나리타공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
기사님은 보통 이용 전날 WhatsApp 또는 SMS로 고객님께 연락드립니다.
선택한 방향, 픽업/샌딩 장소, 이용 시간, 항공편 정보를 반드시 확인해 주세요.
별도 바우처 교환은 필요하지 않습니다.
경로·시간·주소 변경은 이용 최소 2일 전까지 요청해 주세요. 아동용 카시트, 야간 할증 등은 포함되지 않습니다.`;
  const checkList = `- 본 상품은 도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동 서비스입니다.
- 7인승 차량은 최대 4명 및 24인치 수하물 5개까지, 10인승 차량은 최대 9명 및 26인치 수하물 10개까지 이용 가능합니다.
- 예약 시 호텔명/주소, 공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업/샌딩 장소, 연락 가능한 휴대전화 번호를 정확히 입력해 주세요.
- 기사님은 보통 이용 전날 WhatsApp 또는 SMS로 연락드립니다.
- 변경 사항은 최소 이용 2일 전까지 요청해 주세요. 늦은 변경은 불가할 수 있습니다.
- 아동용 카시트, 야간 할증, 개인 비용, 팁 및 추가 경유지는 포함되어 있지 않습니다.
- 왕복 이용을 원하시는 경우 각 방향을 별도로 예약해 주세요.`;
  const usage = `1. 예약 시 도쿄 시내 호텔명/주소, 나리타공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 입력해 주세요.
2. 예약 후 영업일 기준 3일 이내 확정 여부를 안내드립니다.
3. 별도 바우처 교환은 필요하지 않으며, 예약 정보 확인 후 이용하시면 됩니다.
4. 기사님은 보통 이용 전날 WhatsApp 또는 SMS로 연락드리며, 예약한 시간과 장소에서 차량을 이용해 주세요.`;

  if (await page.locator('#headline').count()) await page.locator('#headline').fill(headline);
  if (await page.locator('#highlight').count()) await page.locator('#highlight').fill(highlight);
  if (await page.locator('#description').count()) await page.locator('#description').fill(description);
  if (await page.locator('#checkList').count()) await page.locator('#checkList').fill(checkList);
  if (await page.locator('#usage').count()) await page.locator('#usage').fill(usage);
  await page.evaluate(() => {
    const none = Array.from(document.querySelectorAll('input[name=scheduleType]')).find((i) => i.value === 'NONE');
    if (none && !none.checked) none.click();
  });
  await tempSave(page);

  // ---- 4. Regulations ----
  await page.goto(
    `https://tour.triple.partners/product-management/registration/regulations?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2000);
  if (await page.locator('#minimumPurchaseDay').count()) await page.locator('#minimumPurchaseDay').fill('3');
  if (await page.locator('#minimumPurchaseQuantityPerSession').count())
    await page.locator('#minimumPurchaseQuantityPerSession').fill('1');
  if (await page.locator('#maximumPurchaseQuantityPerSession').count())
    await page.locator('#maximumPurchaseQuantityPerSession').fill('10');
  await page.evaluate(() => {
    const inv = document.querySelector('input[name="range-select.inventory-managed"][value="RIGHT"]');
    if (inv && !inv.checked) inv.click();
    const manual = Array.from(document.querySelectorAll('input[name=bookingConfirmType]')).find((i) => i.value === 'MANUAL');
    if (manual && !manual.checked) manual.click();
  });
  if (await page.locator('#confirmationLeadTimeValue').count())
    await page.locator('#confirmationLeadTimeValue').fill('3');
  // cancel
  await page.evaluate(() => {
    const yes = Array.from(document.querySelectorAll('input[name=isCancelType]')).find((i) => i.value === '1');
    if (yes && !yes.checked) yes.click();
    const partner = Array.from(document.querySelectorAll('input[name=isPartnerConfirm]')).find((i) => i.value === 'true');
    if (partner && !partner.checked) partner.click();
  });
  if (await page.locator('input[name="windows.0.deadline"]').count())
    await page.locator('input[name="windows.0.deadline"]').fill('2');
  if (await page.locator('input[name="windows.0.penalty"]').count())
    await page.locator('input[name="windows.0.penalty"]').fill('0');

  // Include edit
  const editBtn = page.locator('button').filter({ hasText: /^编辑$/ });
  if (await editBtn.count()) {
    await editBtn.first().click();
    await sleep(1200);
    await page.evaluate(() => {
      const t = document.getElementById('inclusions_TRANSPORTATION');
      const p = document.getElementById('inclusions_PICK_UP');
      if (t && !t.checked) (t.closest('label') || t.parentElement || t).click();
      if (p && !p.checked) (p.closest('label') || p.parentElement || p).click();
    });
    await sleep(300);
    if (await page.locator('#inclusions_TRANSPORTATION_description').count()) {
      await page
        .locator('#inclusions_TRANSPORTATION_description')
        .fill('도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동 및 주차비 포함');
    }
    if (await page.locator('#inclusions_PICK_UP_description').count()) {
      await page.locator('#inclusions_PICK_UP_description').fill('픽업/샌딩 서비스 및 주차비 포함');
    }
    if (await page.locator('#exclusions').count()) {
      await page
        .locator('#exclusions')
        .fill(
          '항공권, 공항 이용료, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.',
        );
    }
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) =>
        ['節省', '완료', '完成'].includes((x.innerText || '').trim()),
      );
      b?.click();
    });
    await sleep(1500);
  }

  // Reservation info
  await page.getByRole('button', { name: '代表預約信息', exact: true }).click().catch(() => {});
  await sleep(1500);
  const requiredIds = [
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
  if (await page.locator('#CELLPHONE-required').count()) {
    await page.evaluate((ids) => {
      for (const rid of ids) {
        const el = document.getElementById(rid);
        if (!el) continue;
        if (!el.checked) {
          (el.closest('label') || el.parentElement || el).click();
          if (!el.checked) {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    }, requiredIds);
    await page.getByRole('button', { name: /已選/ }).first().click().catch(async () => {
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find((x) => /已選|節省|완료/.test(x.innerText || ''));
        b?.click();
      });
    });
    await sleep(1500);
  }

  // Voucher
  body = await page.locator('body').innerText();
  if (!body.includes('예약정보로 확인')) {
    await page.getByRole('button', { name: '選擇代金券及其使用方法' }).click();
    await sleep(1500);
    await page.getByText('[5seat From Beijing Central District to Beijing Universal Studios ]').first().click().catch(async () => {
      await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div')).filter((d) => {
          const t = (d.innerText || '').trim();
          return t.includes('예약정보로 확인') && t.includes('無需換貨') && t.length < 120;
        });
        cards.sort((a, b) => a.innerText.length - b.innerText.length);
        cards[0]?.click();
      });
    });
    await sleep(1500);
  }

  await tempSave(page);

  // ---- 5. Options ----
  for (const opt of OPTIONS) {
    console.log('\n=== option', opt.priceTypeName, opt.price, '===');
    await page.goto(
      `https://tour.triple.partners/product-management/registration/option?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded' },
    );
    await sleep(1500);
    // skip if already exists
    const listText = await page.locator('body').innerText();
    if (listText.includes(opt.name)) {
      console.log('already exists, skip');
      continue;
    }
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '註冊/添加選項');
      b?.click();
    });
    await sleep(2000);
    await page.locator('#name').fill(opt.name);
    await page.locator('#description').fill(opt.desc);
    await page.locator('input[name="rule.bookingRule.minimumPurchaseQuantityPerSession"]').fill('1');
    await page.locator('input[name="rule.bookingRule.maximumPurchaseQuantityPerSession"]').fill('10');

    // price type
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').includes('가격 타입 선택'));
      b?.click();
    });
    await sleep(800);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').includes('기타 가격 타입'));
      b?.click();
    });
    await sleep(1000);
    await page.locator('input[placeholder="輸入的名稱將顯示在銷售渠道上。"]').fill(opt.priceTypeName);
    await page.locator('input[placeholder="例) 滿 19 歲以上"]').fill(opt.priceTypeDesc);
    const nameless = page.locator('input[type=tel]:not([name])');
    if ((await nameless.count()) >= 2) {
      await nameless.nth(0).fill('1');
      await nameless.nth(1).fill('10');
    }
    await page.locator('[aria-labelledby="ETC-required-label"]').click({ force: true }).catch(() => {});
    await page.locator('[aria-labelledby="ETC-representative-label"]').click({ force: true }).catch(() => {});
    await sleep(200);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '완료');
      b?.click();
    });
    await sleep(1500);
    await page.locator('#name').fill(opt.name);
    await page.locator('#description').fill(opt.desc);

    // 1 year + price
    await page.locator('input[value="ONE_YEAR"]').check({ force: true }).catch(async () => {
      await page.locator('label').filter({ hasText: /^1年$/ }).click({ force: true });
    });
    await sleep(1200);
    const price = page.locator('input[placeholder="請輸入價格"]');
    await price.click({ force: true });
    await price.fill(opt.price);
    await sleep(400);
    await page.locator('#name').click();
    await sleep(600);
    console.log('price', await price.inputValue().catch(() => '?'));

    // times
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').includes('設定時間'));
      b?.click();
    });
    await sleep(1200);
    await page.getByText('반복 시간 추가', { exact: true }).click({ force: true });
    await sleep(1000);
    await page.locator('button').filter({ hasText: /^选择$/ }).nth(0).click();
    await sleep(600);
    await page.evaluate(() => {
      const hours = Array.from(document.querySelectorAll('*')).filter(
        (el) => (el.innerText || '').trim() === '07' && el.children.length === 0 && el.getBoundingClientRect().width > 0,
      );
      hours.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      hours[0]?.click();
    });
    await sleep(200);
    await page.evaluate(() => {
      const mins = Array.from(document.querySelectorAll('*')).filter(
        (el) => (el.innerText || '').trim() === '00' && el.children.length === 0 && el.getBoundingClientRect().width > 0,
      );
      mins.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
      mins[0]?.click();
    });
    await sleep(400);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
        const t = (b.innerText || '').trim();
        return t === '选择' || /^\d{2}:\d{2}$/.test(t);
      });
      const endBtn = buttons.find((b, i) => i > 0 && (b.innerText || '').trim() === '选择') || buttons[1];
      endBtn?.click();
    });
    await sleep(600);
    await page.evaluate(() => {
      const hours = Array.from(document.querySelectorAll('*')).filter(
        (el) => (el.innerText || '').trim() === '21' && el.children.length === 0 && el.getBoundingClientRect().width > 0,
      );
      hours.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      hours[0]?.click();
    });
    await sleep(200);
    await page.evaluate(() => {
      const mins = Array.from(document.querySelectorAll('*')).filter(
        (el) => (el.innerText || '').trim() === '30' && el.children.length === 0 && el.getBoundingClientRect().width > 0,
      );
      mins.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
      mins[0]?.click();
    });
    await sleep(400);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '分鐘');
      b?.click();
    });
    await sleep(400);
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button,div,li')).filter(
        (el) => (el.innerText || '').trim() === '30' && el.getBoundingClientRect().width > 0 && el.children.length <= 1,
      );
      els[els.length - 1]?.click();
    });
    await sleep(300);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '생성');
      b?.click();
    });
    await sleep(2000);
    const tbody = await page.locator('body').innerText();
    const hasLine = /07:00 · 07:30/.test(tbody) && /21:30/.test(tbody);
    console.log('times ok?', hasLine);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '節省');
      b?.click();
    });
    await sleep(1500);
    await page.locator('#name').fill(opt.name);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(
        (b) => (b.innerText || '').trim() === '下個' && !b.disabled,
      );
      buttons[buttons.length - 1]?.click();
    });
    await sleep(3000);
    console.log('card?', (await page.locator('body').innerText()).includes(opt.name.slice(0, 25)));
  }

  // Final list + temp save
  await page.goto(
    `https://tour.triple.partners/product-management/registration/option?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2000);
  const finalText = await page.locator('body').innerText();
  fs.writeFileSync('/tmp/nol-narita-final.txt', finalText);
  console.log('\n=== FINAL ===');
  console.log('productId', productId);
  for (const o of OPTIONS) console.log(o.priceTypeName, finalText.includes(o.name));
  console.log('selling', (finalText.match(/판매중/g) || []).length);
  await tempSave(page);
  console.log('APPROVAL_CLICKED: false');
  await page.screenshot({ path: '/tmp/nol-narita-done.png' });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
