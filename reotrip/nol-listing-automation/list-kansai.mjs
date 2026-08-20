/**
 * NOL: Osaka city hotel ↔ Kansai Airport (KIX) transfer
 * Safety: NEVER click 批准請求 / 승인 요청
 *
 * Prices: 7seat 99 / 10seat 133 both directions
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PRODUCT_NAME = '오사카 시내 호텔 ↔ 간사이공항(KIX) 단독 차량 편도 이동 서비스';
const INTERNAL_NAME = '大阪市区-关西机场(KIX)';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/kansai-airport';
const IMAGES = ['kansai-1.jpg', 'kansai-2.jpg', 'kansai-3.jpg'].map((f) => path.join(IMG_DIR, f));

const INCLUDE_TRANSPORT =
  '오사카 시내 호텔 ↔ 간사이공항(KIX) 편도 전용 차량 이동 및 주차비 포함';
const INCLUDE_PICKUP = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE =
  '항공권, 공항 이용료, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

const OPTIONS = [
  {
    name: '오사카 시내 호텔 출발 → 간사이공항(KIX) 편도 이동 (7인승 차량)',
    desc: '오사카 시내 호텔 출발 → 간사이공항(KIX) 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '7seat go',
    priceTypeDesc: '7인승 차량',
    price: '99',
  },
  {
    name: '오사카 시내 호텔 출발 → 간사이공항(KIX) 편도 이동 (10인승 차량)',
    desc: '오사카 시내 호텔 출발 → 간사이공항(KIX) 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '10seat go',
    priceTypeDesc: '10인승 차량',
    price: '133',
  },
  {
    name: '간사이공항(KIX) 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)',
    desc: '간사이공항(KIX) 출발 → 오사카 시내 호텔 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '7seat rtn',
    priceTypeDesc: '7인승 차량',
    price: '99',
  },
  {
    name: '간사이공항(KIX) 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)',
    desc: '간사이공항(KIX) 출발 → 오사카 시내 호텔 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '10seat rtn',
    priceTypeDesc: '10인승 차량',
    price: '133',
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tempSave(page) {
  const bad = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => /批准請求|승인 요청|提交審核/.test((b.innerText || '').trim()))
      .map((b) => (b.innerText || '').trim()),
  );
  console.log('approval present (NOT click):', bad);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return { i, text: (b.innerText || '').trim(), disabled: b.disabled, y: Math.round(r.y) };
      })
      .filter((b) => b.text === '臨時存儲' && !b.disabled)
      .sort((a, b) => b.y - a.y);
    if (buttons[0]) document.querySelectorAll('button')[buttons[0].i].click();
  });
  await sleep(2500);
  const t = await page.locator('body').innerText();
  console.log('tempSave toast?', /임시|暫時|臨時|저장/.test(t));
}

async function clickBtn(page, exactTexts) {
  const list = Array.isArray(exactTexts) ? exactTexts : [exactTexts];
  return page.evaluate((list) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const t of list) {
      const b = buttons.find((x) => (x.innerText || '').trim() === t && !x.disabled);
      if (b) {
        b.click();
        return t;
      }
    }
    for (const t of list) {
      const b = buttons.find((x) => (x.innerText || '').includes(t) && !x.disabled);
      if (b) {
        b.click();
        return (b.innerText || '').trim().slice(0, 40);
      }
    }
    return null;
  }, list);
}

async function setTimes(page) {
  // Open
  await clickBtn(page, ['設定時間', '시간 설정']);
  await sleep(1500);
  await page.getByText('반복 시간 추가', { exact: true }).click({ force: true }).catch(async () => {
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(
        (e) => (e.innerText || '').trim() === '반복 시간 추가',
      );
      el?.click();
    });
  });
  await sleep(1000);

  async function pick(which, hour, minute) {
    // which 0=start, 1=end
    const selectInfo = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return { i, t, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), visible: r.height > 0 };
        })
        .filter((b) => (b.t === '选择' || /^\d{2}:\d{2}$/.test(b.t)) && b.visible);
    });
    console.log('time fields', selectInfo.map((s) => s.t));

    // Click the correct field: for start first 选择 or first time; for end second
    const candidates = selectInfo.filter((s) => s.t === '选择' || /^\d{2}:\d{2}$/.test(s.t));
    const target = which === 0 ? candidates[0] : candidates[1] || candidates[0];
    if (target) {
      await page.locator('button').nth(target.i).click({ force: true });
    } else {
      console.log('no time field button');
    }
    await sleep(700);

    // Click hour then minute via role=option preferred
    const hourClicked = await page.evaluate((h) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === h && el.getBoundingClientRect().height > 0,
      );
      if (opts.length) {
        opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
        opts[0].click();
        return 'role-option';
      }
      // lists
      const lists = Array.from(document.querySelectorAll('[class*="option-list"], [class*="List"], ul, [role=listbox]'));
      for (const list of lists) {
        const r = list.getBoundingClientRect();
        if (r.width < 20 || r.height < 20) continue;
        const item = Array.from(list.querySelectorAll('*')).find(
          (e) => (e.innerText || '').trim() === h && e.children.length === 0,
        );
        if (item) {
          item.click();
          return 'list';
        }
      }
      // global leftmost leaf
      const els = Array.from(document.querySelectorAll('div,li,span,button')).filter(
        (el) =>
          (el.innerText || '').trim() === h &&
          el.children.length === 0 &&
          el.getBoundingClientRect().width > 0 &&
          el.getBoundingClientRect().height > 10,
      );
      els.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      if (els[0]) {
        els[0].click();
        return 'leaf';
      }
      return null;
    }, hour);
    console.log('hour', hour, hourClicked);
    await sleep(300);

    const minClicked = await page.evaluate((m) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === m && el.getBoundingClientRect().height > 0,
      );
      if (opts.length) {
        opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
        opts[0].click();
        return 'role-option';
      }
      const lists = Array.from(document.querySelectorAll('[class*="option-list"], [class*="List"], ul, [role=listbox]'));
      // prefer second list for minutes
      const ordered = lists.filter((l) => l.getBoundingClientRect().height > 20);
      const minList = ordered[1] || ordered[0];
      if (minList) {
        const item = Array.from(minList.querySelectorAll('*')).find(
          (e) => (e.innerText || '').trim() === m && e.children.length === 0,
        );
        if (item) {
          item.click();
          return 'list';
        }
      }
      const els = Array.from(document.querySelectorAll('div,li,span,button')).filter(
        (el) =>
          (el.innerText || '').trim() === m &&
          el.children.length === 0 &&
          el.getBoundingClientRect().width > 0 &&
          el.getBoundingClientRect().height > 10,
      );
      els.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
      if (els[0]) {
        els[0].click();
        return 'leaf';
      }
      return null;
    }, minute);
    console.log('minute', minute, minClicked);
    await sleep(500);
  }

  await pick(0, '07', '00');
  let body = await page.locator('body').innerText();
  console.log('start shows 07:00?', body.includes('07:00'));

  await pick(1, '21', '30');
  body = await page.locator('body').innerText();
  console.log('end shows 21:30?', body.includes('21:30'));

  // interval
  await clickBtn(page, ['分鐘', '분']);
  await sleep(500);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role=option],button,li,div')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '30' && r.width > 0 && r.height > 0 && (el.children?.length || 0) <= 1;
    });
    els[els.length - 1]?.click();
  });
  await sleep(400);

  // 생성 - critical
  const genBtns = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map((b, i) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return { i, t, disabled: b.disabled, w: Math.round(r.w || r.width), y: Math.round(r.y) };
    }).filter((b) => b.t === '생성' || b.t === '生成' || b.t.includes('생성')),
  );
  console.log('gen buttons', genBtns);
  if (genBtns.length) {
    await page.locator('button').nth(genBtns[0].i).click({ force: true });
  } else {
    await page.getByRole('button', { name: '생성' }).click({ force: true }).catch(() => {});
    await clickBtn(page, ['생성', '生成']);
  }
  await sleep(2500);

  body = await page.locator('body').innerText();
  const allTimes = [...body.matchAll(/\b([01]\d|2[0-3]):[0-5]\d\b/g)].map((m) => m[0]);
  const unique = [...new Set(allTimes)].filter((t) => {
    const [h, mi] = t.split(':').map(Number);
    return h >= 7 && h <= 21 && (mi === 0 || mi === 30);
  });
  const ok = unique.includes('07:00') && unique.includes('21:30') && unique.length >= 28;
  console.log('times unique', unique.length, 'ok?', ok, 'sample', unique.slice(0, 3), unique.slice(-2));

  // save time modal
  await clickBtn(page, ['節省', '저장']);
  await sleep(1500);
  return { ok, count: unique.length };
}

async function createOption(page, productId, opt) {
  console.log('\n=== CREATE', opt.priceTypeName, opt.price, '===');
  await page.goto(
    `https://tour.triple.partners/product-management/registration/option?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(1800);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);

  const listText = await page.locator('body').innerText();
  if (listText.includes(opt.name)) {
    console.log('already exists, skip create');
    return { skipped: true };
  }

  await clickBtn(page, ['註冊/添加選項']);
  await sleep(2200);
  if (!(await page.locator('#name').count())) {
    throw new Error('option form not open');
  }

  await page.locator('#name').fill(opt.name);
  await page.locator('#description').fill(opt.desc);
  await page.locator('input[name="rule.bookingRule.minimumPurchaseQuantityPerSession"]').fill('1');
  await page.locator('input[name="rule.bookingRule.maximumPurchaseQuantityPerSession"]').fill('10');

  // price type
  await clickBtn(page, ['가격 타입 선택']);
  await sleep(900);
  await clickBtn(page, ['기타 가격 타입']);
  await sleep(1200);
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
  await clickBtn(page, ['완료']);
  await sleep(1500);

  // re-fill name after overwrite
  await page.locator('#name').fill(opt.name);
  await page.locator('#description').fill(opt.desc);

  // 1 year + price once
  await page.locator('input[value="ONE_YEAR"]').check({ force: true }).catch(async () => {
    await page.locator('label').filter({ hasText: /^1年$/ }).click({ force: true });
  });
  await sleep(1400);
  const price = page.locator('input[placeholder="請輸入價格"]');
  const disabled = await price.isDisabled().catch(() => true);
  console.log('price disabled?', disabled);
  if (!disabled) {
    await price.click({ force: true });
    await price.fill(opt.price);
  } else {
    // try again after period
    await page.locator('input[value="ONE_YEAR"]').check({ force: true });
    await sleep(1000);
    await price.fill(opt.price).catch(() => {});
  }
  await page.locator('#name').click();
  await sleep(600);
  const bodyAfterPrice = await page.locator('body').innerText();
  console.log('calendar has price?', bodyAfterPrice.includes(opt.price), 'input', await price.inputValue().catch(() => '?'));

  // times
  const times = await setTimes(page);
  await page.locator('#name').fill(opt.name);

  // option include if warning
  const formText = await page.locator('body').innerText();
  if (formText.includes('포함 사항 작성') || formText.includes('包含')) {
    const edit = page.locator('button').filter({ hasText: /^编辑$|^編輯$|^편집$/ });
    if (await edit.count()) {
      await edit.first().click();
      await sleep(1000);
      await page.evaluate(({ transport, pickup }) => {
        for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP', 'inclusions_OTHER']) {
          const el = document.getElementById(id);
          if (el && !el.checked) (el.closest('label') || el.parentElement || el).click();
        }
        const t = document.getElementById('inclusions_TRANSPORTATION_description');
        const p = document.getElementById('inclusions_PICK_UP_description');
        const o = document.getElementById('inclusions_OTHER_description');
        if (t) {
          t.value = transport;
          t.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (p) {
          p.value = pickup;
          p.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (o) {
          o.value = pickup;
          o.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, { transport: INCLUDE_TRANSPORT, pickup: INCLUDE_PICKUP });
      if (await page.locator('#inclusions_TRANSPORTATION_description').count()) {
        await page.locator('#inclusions_TRANSPORTATION_description').fill(INCLUDE_TRANSPORT);
      }
      if (await page.locator('#inclusions_PICK_UP_description').count()) {
        await page.locator('#inclusions_PICK_UP_description').fill(INCLUDE_PICKUP);
      }
      if (await page.locator('#inclusions_OTHER_description').count()) {
        await page.locator('#inclusions_OTHER_description').fill(INCLUDE_PICKUP);
      }
      await clickBtn(page, ['節省', '완료', '完成']);
      await sleep(1000);
    }
  }

  await page.locator('#name').fill(opt.name);

  // 下個
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
  await sleep(3500);

  const after = await page.locator('body').innerText();
  const cardOk = after.includes(opt.name);
  console.log('card saved?', cardOk, 'times', times);
  return { cardOk, times, price: opt.price };
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().includes('tour.triple.partners'));
  if (!page) throw new Error('no NOL tab — open tour.triple.partners first');
  await page.bringToFront();

  // ---- 1. List / resume or create ----
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  let body = await page.locator('body').innerText();
  let productId = null;

  if (body.includes(PRODUCT_NAME) || body.includes('간사이공항(KIX)')) {
    console.log('Resume existing KIX draft');
    await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('div')).filter(
        (e) =>
          e.className &&
          String(e.className).includes('slot___StyledContainer4') &&
          (e.innerText.includes('간사이') || e.innerText.includes(name)),
      );
      if (cards[0]) cards[0].click();
      else {
        const d = Array.from(document.querySelectorAll('div')).find((x) => x.innerText?.includes('간사이공항(KIX)'));
        d?.click();
      }
    }, PRODUCT_NAME);
    await sleep(3000);
    productId = new URL(page.url()).searchParams.get('id');
    // if still on list, try 修復
    if (!productId) {
      await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('div')).filter((d) => d.innerText?.includes('간사이공항'));
        rows.sort((a, b) => a.innerText.length - b.innerText.length);
        const fix = rows[0] && Array.from(rows[0].querySelectorAll('button')).find((b) => /修復|수정/.test(b.innerText));
        (fix || rows[0])?.click();
      });
      await sleep(3000);
      productId = new URL(page.url()).searchParams.get('id');
    }
  } else {
    console.log('Create new transportation product');
    await page.getByText('新產品註冊').first().click();
    await sleep(1200);
    const inputs = page.locator('input');
    const n = await inputs.count();
    // modal name is usually nth(1)
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
    await clickBtn(page, ['開始創建產品', '상품 만들기']);
    await page.waitForURL(/registration\/properties/, { timeout: 60000 }).catch(() => {});
    await sleep(2500);
    productId = new URL(page.url()).searchParams.get('id');
  }

  console.log('productId', productId, 'url', page.url());
  if (!productId) {
    console.log((await page.locator('body').innerText()).slice(0, 1000));
    throw new Error('no product id');
  }
  fs.writeFileSync('/tmp/nol-kansai-id.txt', productId);

  // ---- 2. Attributes ----
  console.log('\n=== ATTRIBUTES ===');
  await page.goto(
    `https://tour.triple.partners/product-management/registration/properties?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2000);
  await page.locator('#title').fill(PRODUCT_NAME);
  await page.locator('#managementTitle').fill(INTERNAL_NAME);
  if (await page.locator('#requiredNumberOfPeople').count()) await page.locator('#requiredNumberOfPeople').fill('1');
  if (await page.locator('#availableNumberOfPeople').count()) await page.locator('#availableNumberOfPeople').fill('9');
  await page.evaluate(() => {
    const priv = document.querySelector('input[name=tourTypes][value="0"]');
    if (priv && !priv.checked) priv.click();
    const limitYes = Array.from(document.querySelectorAll('input[name=isPassengerLimit]')).find((i) => i.value === '1');
    if (limitYes && !limitYes.checked) limitYes.click();
    // nationality no restriction if present
    const nat = Array.from(document.querySelectorAll('input[name=nationalityType]')).find(
      (i) => /ANOTHER|ALL|NONE|NO/.test(i.value || '') || i.value === 'ANOTHER_NATIONALITY',
    );
    if (nat && !nat.checked) nat.click();
  });

  // Theme 기사제공차량 if needed
  body = await page.locator('body').innerText();
  if (!body.includes('기사제공차량') && !body.includes('司机提供')) {
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button,div,label,span')).find((e) =>
        /기사제공차량|司机提供车辆|司機提供/.test(e.innerText || ''),
      );
      el?.click();
    });
  }

  // POI
  body = await page.locator('body').innerText();
  if (!/간사이|关西|Kansai|関西/.test(body) || body.includes('添加地區')) {
    const addPlace = page.getByText('添加地區和地點').or(page.getByText('添加地点')).or(page.getByText('添加地區'));
    if (await addPlace.count()) {
      await addPlace.first().click();
      await sleep(1200);
      const search = page.locator('input[type=text]').last();
      await search.fill('간사이 국제공항');
      await sleep(1800);
      await page.keyboard.press('Enter');
      await sleep(1800);
      await page.evaluate(() => {
        const r = Array.from(document.querySelectorAll('div,li,button')).find(
          (el) =>
            /간사이|关西|Kansai|関西/.test(el.innerText || '') &&
            (el.innerText || '').length < 100 &&
            el.getBoundingClientRect().height > 0,
        );
        r?.click();
      });
      await sleep(800);
      await page.evaluate(() => {
        const t = Array.from(document.querySelectorAll('*')).find(
          (e) => /TRAVEL_PLACE|관광지|旅遊地|旅游地/.test(e.innerText || '') && (e.innerText || '').length < 40,
        );
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
  console.log('\n=== INTRODUCTION ===');
  await page.goto(
    `https://tour.triple.partners/product-management/registration/introduction?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2000);

  const thumbs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).filter((i) => (i.naturalWidth || i.width) > 40).length,
  );
  console.log('existing thumbs', thumbs);
  if (thumbs < 3) {
    for (const imgPath of IMAGES) {
      if (!fs.existsSync(imgPath)) {
        console.log('missing', imgPath);
        continue;
      }
      const chooserPromise = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      await page
        .getByText('上傳圖片')
        .first()
        .click()
        .catch(async () => {
          await page.evaluate(() => {
            const b = Array.from(document.querySelectorAll('button,div,label,span')).find((x) =>
              /上傳圖片|이미지 등록|이미지 추가/.test(x.innerText || ''),
            );
            b?.click();
          });
        });
      const chooser = await chooserPromise;
      if (chooser) {
        await chooser.setFiles(imgPath);
        await sleep(3000);
        console.log('uploaded chooser', path.basename(imgPath));
      } else {
        const fi = page.locator('input[type=file]');
        const fc = await fi.count();
        if (fc) {
          await fi.nth(fc - 1).setInputFiles(imgPath);
          await sleep(3000);
          console.log('uploaded input', path.basename(imgPath));
        } else console.log('no upload control', imgPath);
      }
    }
  }

  const headline = '오사카 시내 호텔과 간사이공항(KIX)을 편안하게 연결하는 단독 차량 이동 서비스입니다.';
  const highlight = `오사카 시내 호텔 ↔ 간사이공항(KIX) 편도 전용 차량 이동
공항 도착/출발 시간에 맞춘 프라이빗 픽업 및 샌딩
7인승·10인승 차량 중 인원과 수하물에 맞게 선택 가능`;
  const description = `이 서비스는 오사카 시내 호텔과 간사이공항(KIX) 사이를 편도 단독 차량으로 이동하는 공항 픽업/샌딩 서비스입니다.
낯선 도시에서 대중교통 환승이나 택시 대기 없이, 예약한 시간에 맞춰 편안하게 이동하실 수 있습니다.

포함 사항:
- 오사카 시내 호텔 ↔ 간사이공항(KIX) 편도 전용 차량 이동 1회
- 차량, 기사, 기본 주차비 포함

예약 시 오사카 시내 호텔명/주소, 간사이공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
기사님은 보통 이용 전날 WhatsApp 또는 SMS로 고객님께 연락드립니다.
선택한 방향, 픽업/샌딩 장소, 이용 시간, 항공편 정보를 반드시 확인해 주세요.
별도 바우처 교환은 필요하지 않습니다.
경로·시간·주소 변경은 이용 최소 2일 전까지 요청해 주세요. 아동용 카시트, 야간 할증 등은 포함되지 않습니다.`;
  const checkList = `- 본 상품은 오사카 시내 호텔 ↔ 간사이공항(KIX) 편도 전용 차량 이동 서비스입니다.
- 7인승 차량은 최대 4명 및 24인치 수하물 5개까지, 10인승 차량은 최대 9명 및 26인치 수하물 10개까지 이용 가능합니다.
- 예약 시 호텔명/주소, 공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업/샌딩 장소, 연락 가능한 휴대전화 번호를 정확히 입력해 주세요.
- 기사님은 보통 이용 전날 WhatsApp 또는 SMS로 연락드립니다.
- 변경 사항은 최소 이용 2일 전까지 요청해 주세요. 늦은 변경은 불가할 수 있습니다.
- 아동용 카시트, 야간 할증, 개인 비용, 팁 및 추가 경유지는 포함되어 있지 않습니다.
- 왕복 이용을 원하시는 경우 각 방향을 별도로 예약해 주세요.`;
  const usage = `1. 예약 시 오사카 시내 호텔명/주소, 간사이공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 입력해 주세요.
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
  console.log('\n=== REGULATIONS ===');
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
    const manual = Array.from(document.querySelectorAll('input[name=bookingConfirmType]')).find(
      (i) => i.value === 'MANUAL',
    );
    if (manual && !manual.checked) manual.click();
  });
  if (await page.locator('#confirmationLeadTimeValue').count())
    await page.locator('#confirmationLeadTimeValue').fill('3');
  await page.evaluate(() => {
    const yes = Array.from(document.querySelectorAll('input[name=isCancelType]')).find((i) => i.value === '1');
    if (yes && !yes.checked) yes.click();
    const partner = Array.from(document.querySelectorAll('input[name=isPartnerConfirm]')).find(
      (i) => i.value === 'true',
    );
    if (partner && !partner.checked) partner.click();
  });
  if (await page.locator('input[name="windows.0.deadline"]').count())
    await page.locator('input[name="windows.0.deadline"]').fill('2');
  if (await page.locator('input[name="windows.0.penalty"]').count())
    await page.locator('input[name="windows.0.penalty"]').fill('0');

  // Include
  const editBtn = page.locator('button').filter({ hasText: /^编辑$|^編輯$|^편집$/ });
  if (await editBtn.count()) {
    await editBtn.first().click();
    await sleep(1200);
    await page.evaluate(() => {
      for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP']) {
        const el = document.getElementById(id);
        if (el && !el.checked) (el.closest('label') || el.parentElement || el).click();
      }
    });
    await sleep(300);
    if (await page.locator('#inclusions_TRANSPORTATION_description').count())
      await page.locator('#inclusions_TRANSPORTATION_description').fill(INCLUDE_TRANSPORT);
    if (await page.locator('#inclusions_PICK_UP_description').count())
      await page.locator('#inclusions_PICK_UP_description').fill(INCLUDE_PICKUP);
    if (await page.locator('#exclusions').count()) await page.locator('#exclusions').fill(EXCLUDE);
    await clickBtn(page, ['節省', '완료', '完成']);
    await sleep(1500);
  }

  // Reservation info - airport flight fields ON
  await page.getByRole('button', { name: '代表預約信息', exact: true }).click().catch(async () => {
    await clickBtn(page, ['代表預約信息', '대표 예약 정보']);
  });
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
    await page
      .getByRole('button', { name: /已選/ })
      .first()
      .click()
      .catch(async () => {
        await clickBtn(page, ['已選', '節省', '완료']);
      });
    await sleep(1500);
  }

  // Voucher
  body = await page.locator('body').innerText();
  if (!body.includes('예약정보로 확인')) {
    await clickBtn(page, ['選擇代金券及其使用方法', '바우처']);
    await sleep(1500);
    await page
      .getByText('[5seat From Beijing Central District to Beijing Universal Studios ]')
      .first()
      .click()
      .catch(async () => {
        await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('div')).filter((d) => {
            const t = (d.innerText || '').trim();
            return t.includes('예약정보로 확인') && t.includes('無需換貨') && t.length < 150;
          });
          cards.sort((a, b) => a.innerText.length - b.innerText.length);
          cards[0]?.click();
        });
      });
    await sleep(1500);
  }

  await tempSave(page);

  // ---- 5. Options ----
  const results = [];
  for (const opt of OPTIONS) {
    try {
      results.push(await createOption(page, productId, opt));
    } catch (e) {
      console.error('option error', opt.priceTypeName, e.message);
      results.push({ error: e.message, name: opt.priceTypeName });
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  // Final
  await page.goto(
    `https://tour.triple.partners/product-management/registration/option?id=${productId}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2000);
  const finalText = await page.locator('body').innerText();
  fs.writeFileSync('/tmp/nol-kansai-final.txt', finalText);
  console.log('\n=== FINAL ===');
  console.log('productId', productId);
  console.log('title', finalText.includes(PRODUCT_NAME) || finalText.includes('간사이공항(KIX)'));
  for (const o of OPTIONS) console.log(o.priceTypeName, finalText.includes(o.name));
  console.log('selling', (finalText.match(/판매중/g) || []).length);
  console.log('include warn', (finalText.match(/포함 사항 작성/g) || []).length);
  console.log('results', JSON.stringify(results, null, 2));
  await tempSave(page);
  await page.screenshot({ path: '/tmp/nol-kansai-done.png', fullPage: true });
  console.log('APPROVAL_CLICKED: false');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
