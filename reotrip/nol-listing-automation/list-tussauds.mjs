/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx- / pek- / *-el 路径或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * 上海市区酒店 ↔ Madame Tussauds Shanghai 私人接送
 * Excel 国内接送 R39-42 公式求值（勿另算）：
 * 5: 213 / 304 / 425
 * 7 go: 250 / 357 / 510
 * 7 rtn: 250 / 357 / 500
 * 时段 08:00–21:30 ×28；Verify-Before-Next；停选项列表；永不提交审核
 * 时段唯一：lib/set-times-china.mjs（若改写 live 路径）
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { setTimesChina, SetTimesStepError } from './lib/set-times-china.mjs';

const PRODUCT_KO =
  '상하이 시내 호텔 ↔ 마담 투소 상하이 단독 차량 편도 이동 서비스';
const INTERNAL = '上海市区酒店-Madame Tussauds Shanghai Admission Ticket';
const DEST_KO = '마담 투소 상하이';
const DEST_KO_SHORT = '마담 투소 상하이';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/tussauds';
const IMAGES = ['tussauds-1.jpg', 'tussauds-2.jpg', 'tussauds-3.jpg']
  .map((f) => path.join(IMG_DIR, f))
  .filter((f) => fs.existsSync(f));

// Excel 售价列（表内公式结果，逐格）
const PRICES = {
  '5go': { normal: '213', oct: '304', spring: '425', may: '304' },
  '7go': { normal: '250', oct: '357', spring: '510', may: '357' },
  '5rtn': { normal: '213', oct: '304', spring: '425', may: '304' },
  '7rtn': { normal: '250', oct: '357', spring: '500', may: '357' },
};

const OPTIONS = [
  {
    key: '5go',
    name: `상하이 시내 호텔 출발 → ${DEST_KO} 편도 이동 (5인승 차량)`,
    desc: `상하이 시내 호텔 출발 → ${DEST_KO} 편도 이동 (5인승 차량, 최대 4인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n5인승 차량: 최대 2개까지 적재 가능`,
    pt: '5인승 가는',
    ptd: '5인승 차량',
  },
  {
    key: '7go',
    name: `상하이 시내 호텔 출발 → ${DEST_KO} 편도 이동 (7인승 차량)`,
    desc: `상하이 시내 호텔 출발 → ${DEST_KO} 편도 이동 (7인승 차량, 최대 6인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n7인승 차량: 최대 3개까지 적재 가능`,
    pt: '7인승 가는',
    ptd: '7인승 차량',
  },
  {
    key: '5rtn',
    name: `${DEST_KO} 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량)`,
    desc: `${DEST_KO} 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량, 최대 4인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n5인승 차량: 최대 2개까지 적재 가능`,
    pt: '5인승 오는',
    ptd: '5인승 차량',
  },
  {
    key: '7rtn',
    name: `${DEST_KO} 출발 → 상하이 시내 호텔 편도 이동 (7인승 차량)`,
    desc: `${DEST_KO} 출발 → 상하이 시내 호텔 편도 이동 (7인승 차량, 최대 6인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n7인승 차량: 최대 3개까지 적재 가능`,
    pt: '7인승 오는',
    ptd: '7인승 차량',
  },
];

const HEADLINE = `상하이 시내 호텔 ↔ ${DEST_KO_SHORT} 편도 전용 차량으로 여유로운 이동을 즐기세요!`;
const HIGHLIGHT = [
  `상하이 시내 호텔에서 ${DEST_KO}까지 단독 차량으로 편안하게 이동`,
  '대중교통 환승 없이 빠르고 쾌적한 전용 픽업 서비스',
  '숙련된 기사님의 안전하고 친절한 응대',
].join('\n');
const INTRO = `이 서비스는 상하이 시내 호텔과 ${DEST_KO}(Madame Tussauds Shanghai) 사이의 편도 전용 차량 이동 서비스입니다.
편안하고 프라이빗한 차량과 숙련된 기사님이 함께하여, 지하철 환승이나 택시 이용 없이 목적지까지 빠르고 쾌적하게 이동하실 수 있습니다.

포함 사항:
- 상하이 시내 호텔 ↔ ${DEST_KO} 편도 전용 차량 서비스 1회
- 차량 및 기사 요금 포함으로, 별도 추가 요금 없음

예약 시간에 맞춰 고객님 숙소 또는 약속 장소에서 픽업
숙련된 전문 기사님의 안전하고 친절한 서비스 제공

가족, 커플, 소규모 그룹 등 마담 투소 상하이를 방문하시는 분들께 적합합니다.
지금 바로 예약하고, 복잡한 교통 걱정 없이 일정을 여유롭게 즐겨보세요!`;

const MUST_KNOW = `1.수하물 규격: 24인치(표준) 이하 수하물 기준 - 59cm(높이) × 41cm(너비) × 24cm(두께) 이내
5인승 차량: 최대 2개까지 적재 가능
7인승 차량: 최대 3개까지 적재 가능

2.미팅 장소: 기사님이 호텔 로비에서 픽업해 드립니다. 동일한 이름의 호텔이 있을 수 있으므로, 호텔 이름과 주소를 함께 제공해 주세요.

3.본 서비스는 호텔(또는 도심)과 ${DEST_KO} 간의 이동만을 포함하며, 중간 정차는 포함되지 않습니다.

4.표시된 요금은 1인 기준이 아닌 차량 1대 기준입니다.

5.실제 제공되는 차량은 이미지와 다를 수 있습니다.

6.왕복 서비스를 원하시는 경우, "편도(출발)" 및 "편도(복귀)" 옵션을 각각 별도로 예약해 주세요.

7.픽업 시간 또는 장소 변경은 최소 24시간 전에 요청해 주셔야 하며, 24시간 이내 요청 시 추가 요금이 발생할 수 있습니다.

8.오후 10시부터 오전 7시 사이에 제공되는 서비스에는 야간 운행 추가 요금이 부과됩니다.

9.기사님이 예정된 시간에 도착한 후, 최대 30분까지 무료 대기해 드리며, 이후에도 고객님이 나타나지 않을 경우 차량은 출발하게 됩니다.`;

const HOW_TO = `1.문의사항이 있으실 경우 이메일 agency@reotrip.com 또는 전화 +852 3428 81 82 로 언제든지 연락해 주세요.

2.예약은 접수 후 영업일 기준 3일 이내에 확정되며, 확정이 어려운 경우 별도로 안내해 드립니다. (영업일 기준은 현지 시간에 따릅니다)`;

const INCLUDE_TR = `상하이 시내 호텔 ↔ ${DEST_KO} 편도 전용 차량 이동 및 주차비 포함`;
const INCLUDE_PU = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE = `가이드, 팁, ${DEST_KO} 티켓, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.`;

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PHASE = process.argv[2] || 'bootstrap'; // bootstrap|attrs|intro|regs|options|times|holidays|all

async function getPage() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().includes('tour.triple.partners'));
  if (!page) throw new Error('no NOL tab');
  await page.bringToFront().catch(() => {});
  return { browser, page };
}

async function stayIfLeave(page) {
  const elim = page.getByRole('button', { name: /^消除$/ });
  if ((await elim.count()) > 0) {
    await elim.last().click().catch(() => {});
    await sleep(400);
    return true;
  }
  return false;
}

async function clickSaveThen(page, label) {
  const ok = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '保存然后' || t === '保存然後') && !x.disabled;
    });
    if (!b) return false;
    b.click();
    return true;
  });
  console.log(`[${label}] 保存然后`, ok);
  await sleep(3500);
  return ok;
}

async function tempSave(page) {
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return { i, t: (b.innerText || '').trim(), d: b.disabled, w: Math.round(r.width), y: Math.round(r.y) };
      })
      .filter((b) => (b.t === '临时保存' || b.t === '臨時存儲') && !b.d)
      .sort((a, b) => a.w - b.w || b.y - a.y);
    if (c[0]) document.querySelectorAll('button')[c[0].i].click();
  });
  await sleep(2000);
  console.log('tempSave (never approval)');
}

async function bootstrap(page) {
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  const body = await page.locator('body').innerText();
  if (body.includes('마담 투소') || body.includes('Madame Tussauds') || body.includes('투소 상하이')) {
    console.log('Resume existing draft');
    const card = page.locator('div[class*="slot___StyledContainer4"]').filter({ hasText: /마담 투소|Madame Tussauds|투소 상하이/ }).first();
    if ((await card.count()) > 0) {
      await card.click({ force: true });
      await sleep(3500);
      return 'resume';
    }
  }
  console.log('Create new');
  // NEVER fill 产品名称搜索 — only modal product name (skill pitfall)
  await page.evaluate(() => {
    const search = Array.from(document.querySelectorAll('input')).find((i) =>
      /搜索|搜尋|검색|search/i.test(i.placeholder || ''),
    );
    if (search?.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button,a,div'))
      .find((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '新产品注册' || t === '新產品註冊') && r.height > 20 && r.height < 80;
      })
      ?.click();
  });
  await sleep(1800);
  // Modal name only: dialog text input, exclude search placeholder
  await page.evaluate((name) => {
    const d = document.querySelector('[role=dialog]');
    const inp = d
      ? Array.from(d.querySelectorAll('input')).find((i) => i.type === 'text' || i.type === '')
      : Array.from(document.querySelectorAll('input')).find((i) => {
          const ph = i.placeholder || '';
          const r = i.getBoundingClientRect();
          return r.width > 100 && r.height > 30 && !/搜索|搜尋|검색/i.test(ph);
        });
    if (!inp) throw new Error('no modal name input');
    if (/搜索|搜尋|검색/i.test(inp.placeholder || '')) throw new Error('refused search box');
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(inp, name);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }, PRODUCT_KO);
  await sleep(400);
  // TRANSPORTATION radio
  await page.evaluate(() => {
    const radio = document.querySelector('input[type=radio][value=TRANSPORTATION]');
    if (radio) {
      const lab = radio.closest('label') || radio;
      lab.click();
      if (!radio.checked) radio.click();
    }
  });
  await sleep(400);
  // 开始創建产品 (简繁混写)
  const create = page.getByRole('button', { name: /开始創建产品|开始创建产品|開始創建產品/ });
  if ((await create.count()) > 0) await create.last().click({ force: true });
  else {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /开始創建产品|开始创建产品|開始創建產品/.test((b.innerText || '').trim()))
        ?.click();
    });
  }
  await page.waitForURL(/registration\/properties/, { timeout: 90000 }).catch(() => {});
  await sleep(3000);
  console.log('created', page.url());
  return 'create';
}

async function fillAttrs(page) {
  console.log('\n=== ATTRS ===', page.url());
  if (!page.url().includes('/properties')) {
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('a,button,div'))
        .find((e) => /产品属性|產品屬性/.test(e.innerText || ''))
        ?.click(),
    );
    await sleep(2000);
  }
  await page.locator('input[name=title], #title').first().fill(PRODUCT_KO);
  await page.locator('input[name=managementTitle], #managementTitle').first().fill(INTERNAL);
  await page.locator('input[name=requiredNumberOfPeople], #requiredNumberOfPeople').fill('1').catch(() => {});
  await page.locator('input[name=availableNumberOfPeople], #availableNumberOfPeople').fill('6').catch(() => {});

  await page.evaluate(() => {
    const yes = Array.from(document.querySelectorAll('input[name=isPassengerLimit]')).find((i) => i.value === '1');
    if (yes && !yes.checked) yes.click();
    const lab = Array.from(document.querySelectorAll('label,div')).find((e) =>
      /^私人/.test((e.innerText || '').trim()),
    );
    const priv = document.querySelector('input[name=tourTypes][value="0"]');
    if (priv && !priv.checked) lab?.click();
  });
  await sleep(300);

  // theme once
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /选择类别（主题）|選擇類別/.test(b.innerText || ''))
      ?.click();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div,label,li,span')).find((e) => {
      const t = (e.innerText || '').trim();
      return (t === '司机提供车辆' || t === '기사제공차량') && e.getBoundingClientRect().x > 0;
    });
    if (!el) return;
    let p = el;
    for (let i = 0; i < 5; i++) {
      const cb = p.querySelector?.('[role=checkbox], input[type=checkbox]');
      if (cb) {
        if (cb.getAttribute?.('aria-checked') !== 'true' && !cb.checked) (cb.closest('label') || el).click();
        return;
      }
      p = p.parentElement;
    }
    el.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '已选' || (b.innerText || '').trim() === '已選')
      ?.click();
  });
  await sleep(800);

  // language once
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /选择语言|選擇語言/.test(b.innerText || ''))
      ?.click();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div,label,li,span')).find((e) => {
      const t = (e.innerText || '').trim();
      return (t === '韩语' || t === '韓語' || t === '한국어') && e.getBoundingClientRect().x > 0;
    });
    if (!el) return;
    let p = el;
    for (let i = 0; i < 5; i++) {
      const cb = p.querySelector?.('[role=checkbox], input[type=checkbox]');
      if (cb) {
        if (cb.getAttribute?.('aria-checked') !== 'true' && !cb.checked) (cb.closest('label') || el).click();
        return;
      }
      p = p.parentElement;
    }
    el.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '已选' || (b.innerText || '').trim() === '已選')
      ?.click();
  });
  await sleep(800);

  // POI Madame Tussauds Shanghai
  const hasPoi = await page.evaluate(() =>
    /杜莎|Tussauds|투소|Madame|蜡像|南京西路|New World|新世界/i.test(document.body.innerText),
  );
  if (!hasPoi) {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /添加地区和地点|添加地區和地點/.test(b.innerText || ''))
        ?.click();
    });
    await sleep(1500);
    const search = page.locator('input[placeholder*="검색"], input[placeholder*="관광지"]').first();
    await search.waitFor({ state: 'visible', timeout: 8000 });
    await search.fill('上海杜莎夫人蜡像馆');
    await page.keyboard.press('Enter');
    await sleep(2000);
    // pick Shanghai result
    const picked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div')).filter((el) => {
        const t = (el.innerText || '').replace(/\s+/g, ' ');
        const r = el.getBoundingClientRect();
        return (
          r.width > 400 &&
          r.height > 50 &&
          r.height < 160 &&
          r.y > 100 &&
          r.y < 850 &&
          /杜莎|Tussauds|Madame|蜡像|南京西路|New World|新世界|上海|Shanghai|中国|중华|中华/i.test(t) &&
          !/서울|대한민국|London|伦敦|Hong Kong|香港/.test(t)
        );
      });
      if (!cards[0]) return null;
      const r = cards[0].getBoundingClientRect();
      return { t: cards[0].innerText.slice(0, 80), x: r.x + 40, y: r.y + 20 };
    });
    console.log('POI pick', picked);
    if (picked) {
      await page.mouse.click(picked.x, picked.y);
      await sleep(1000);
    }
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /添加地点|添加地點/.test(b.innerText || ''))
        ?.click();
    });
    await sleep(800);
    // TRAVEL_PLACE once
    await page.evaluate(() => {
      const radio = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
      if (radio && !radio.checked) {
        const lab = radio.closest('label') || radio;
        lab.click();
      }
    });
    await sleep(400);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (x) => (x.innerText || '').trim() === '添加' && !x.disabled,
      );
      b?.click();
    });
    await sleep(1200);
  }
  console.log('attrs state', await page.evaluate(() => ({
    private: document.querySelector('input[name=tourTypes][value="0"]')?.checked,
    theme: /司机提供车辆/.test(document.body.innerText),
    lang: /韩语|韓語/.test(document.body.innerText),
    saveThen: Array.from(document.querySelectorAll('button')).find((b) => /保存然后/.test(b.innerText || ''))
      ?.disabled,
  })));
  await clickSaveThen(page, 'attrs');
}

async function fillIntro(page) {
  console.log('\n=== INTRO ===', page.url());
  if (!page.url().includes('/introduction')) {
    await clickSaveThen(page, 'to-intro');
    await sleep(1000);
  }
  await page.locator('#headline, input[name=headline]').fill(HEADLINE);
  await page.locator('#highlight, textarea[name=highlight]').fill(HIGHLIGHT);
  await page.locator('#description, textarea[name=description]').fill(INTRO);
  await page.locator('#checkList, textarea[name=checkList]').fill(MUST_KNOW).catch(() => {});
  await page.locator('#usage, textarea[name=usage]').fill(HOW_TO).catch(() => {});
  await page.evaluate(() => {
    const r = document.querySelector('input[name=scheduleType][value=NONE]');
    if (r) (r.closest('label') || r).click();
  });
  await page.getByText(/没有单独的时间表/).first().click().catch(() => {});
  if (IMAGES.length >= 3) {
    await page.locator('input[type=file][accept*="image"]').first().setInputFiles(IMAGES);
    console.log('uploaded', IMAGES.length);
    await sleep(8000);
  }
  await clickSaveThen(page, 'intro');
}

async function fillRegs(page) {
  console.log('\n=== REGS ===', page.url());
  if (!page.url().includes('/regulations')) await sleep(1000);
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
  await page.locator('input[name="range-select.inventory-managed"][value=RIGHT]').click({ force: true }).catch(() => {});

  // include via onSave(values)
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /撰写|撰寫/.test(b.innerText || ''))
      ?.click();
  });
  await sleep(1500);
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
        const propsKey = Object.keys(el).find((k) => k.startsWith('__reactProps'));
        el[propsKey]?.onChange?.({
          target: { value: val },
          currentTarget: { value: val },
          preventDefault() {},
          stopPropagation() {},
          persist() {},
        });
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
    { tr: INCLUDE_TR, pu: INCLUDE_PU, ex: EXCLUDE },
  );
  await sleep(800);
  // close modal if still open
  if (await page.locator('[role=dialog]').count()) {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('[role=dialog] button'))
        .find((b) => (b.innerText || '').trim() === '关闭')
        ?.click();
    });
    await sleep(500);
    const ok = page.getByRole('button', { name: /^确定$/ });
    if ((await ok.count()) > 0) await ok.last().click();
    await sleep(800);
  }
  console.log('include on page', await page.evaluate(() => /주차비|픽업/.test(document.body.innerText)));

  // resv
  await page.getByRole('button', { name: /代表预约信息|代表預約信息/ }).click({ force: true });
  await sleep(2000);
  for (const rid of RESV_IDS) {
    await page.evaluate((id) => {
      for (let a = 0; a < 25; a++) {
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
          continue;
        }
        el.scrollIntoView({ block: 'center' });
        if (el.checked) return true;
        let n = el;
        for (let i = 0; i < 8; i++) {
          n = n.parentElement;
          if (!n) break;
          const role = n.querySelector('[role=checkbox]');
          if (role && role.getAttribute('aria-checked') !== 'true') {
            role.click();
            break;
          }
        }
        if (!el.checked) el.closest('label')?.click();
        return !!el.checked;
      }
      return false;
    }, rid);
  }
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '已选' || (b.innerText || '').trim() === '已選')
      ?.click();
  });
  await sleep(1200);

  // voucher
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /选择凭证|選擇憑證|选择优惠券|凭证及其使用/.test(b.innerText || ''))
      ?.click();
  });
  await sleep(2000);
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('div')).find((d) => {
      const t = (d.innerText || '').replace(/\s+/g, ' ');
      const r = d.getBoundingClientRect();
      return (
        r.width > 200 &&
        r.height > 30 &&
        r.height < 100 &&
        r.y > 200 &&
        r.y < 800 &&
        /用预约信息确认|用預約信息確認/.test(t) &&
        /无需換貨|無需換貨|无需换货/.test(t)
      );
    });
    card?.click();
  });
  await sleep(1500);

  // re-ensure basics
  await page.locator('#minimumPurchaseDay').fill('3');
  await page.locator('#minimumPurchaseQuantityPerSession').fill('1');
  await page.locator('#maximumPurchaseQuantityPerSession').fill('10');
  await page.locator('#confirmationLeadTimeValue').fill('3');
  await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
  await page.locator('input[name="windows.0.deadline"]').fill('2');
  await page.locator('input[name="windows.0.penalty"]').fill('0');

  await clickSaveThen(page, 'regs');
  if (!page.url().includes('/option')) {
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('a,button,div'))
        .find((e) => /选项管理|選項管理/.test(e.innerText || '') && e.getAttribute('aria-disabled') !== 'true')
        ?.click(),
    );
    await sleep(2500);
  }
  console.log('after regs', page.url());
}

async function createOptions(page) {
  console.log('\n=== OPTIONS ===');
  for (const opt of OPTIONS) {
    const body = await page.locator('body').innerText();
    if (body.includes(opt.name)) {
      console.log('skip existing', opt.key);
      continue;
    }
    console.log('create', opt.key, PRICES[opt.key].normal);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /注册.?添加选项|註冊.?添加選項/.test(b.innerText || ''))
        ?.click();
    });
    await sleep(2500);
    await page.locator('#name').fill(opt.name);
    await page.locator('#description').fill(opt.desc);
    await page.locator('input[name="rule.bookingRule.minimumPurchaseQuantityPerSession"]').fill('1');
    await page.locator('input[name="rule.bookingRule.maximumPurchaseQuantityPerSession"]').fill('10');

    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').includes('选择价格类型'))
        ?.click();
    });
    await sleep(1500);
    const tab = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button,li')).find((e) => {
        const t = (e.innerText || '').trim();
        const r = e.getBoundingClientRect();
        return t === '其他价格类型 (直接输入)' && r.height < 60 && r.width > 50;
      });
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (tab) await page.mouse.click(tab.x, tab.y);
    await sleep(1200);
    await page
      .locator('input[placeholder*="输入的名称"], input[placeholder*="輸入的名稱"], input[placeholder*="销售渠道"]')
      .first()
      .fill(opt.pt);
    await page.locator('input[placeholder*="滿 19"], input[placeholder*="满 19"], input[placeholder*="例)"]').first().fill(opt.ptd);
    await page.evaluate(() => {
      for (const id of ['ETC-required-label', 'ETC-representative-label']) {
        const box = document.querySelector(`[aria-labelledby="${id}"]`);
        if (box && box.getAttribute('aria-checked') !== 'true') box.click();
      }
    });
    await sleep(300);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '完成' && !b.disabled)
        ?.click();
    });
    await sleep(1500);
    await page.locator('#name').fill(opt.name);

    await page.locator('input[value=ONE_YEAR]').click({ force: true }).catch(async () => {
      await page.getByText('1年', { exact: true }).click().catch(() => {});
    });
    await sleep(1200);
    const price = PRICES[opt.key].normal;
    await page.evaluate((p) => {
      const el = Array.from(document.querySelectorAll('input')).find(
        (i) => (i.placeholder || '').includes('请输入价格') || (i.placeholder || '').includes('請輸入價格'),
      );
      if (!el || el.disabled) return false;
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, p);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, price);
    const pi = page.locator('input[placeholder*="价格"], input[placeholder*="價格"]');
    if ((await pi.count()) && !(await pi.last().isDisabled())) await pi.last().fill(price);

    // times — §40 唯一 lib/set-times-china.mjs；禁止 retry
    let tv;
    try {
      tv = await setTimesChina(page);
      console.log('TIMES_OK', opt.key, tv);
    } catch (e) {
      const step = e instanceof SetTimesStepError ? e.step : '?';
      console.log('TIMES_FAIL', opt.key, 'step=', step, e.message, e.readback || '');
      console.log('【停】改 lib/set-times-china.mjs 后再跑；禁止手搓第二套');
      process.exit(2);
    }

    await page.locator('#name').fill(opt.name);
    await tempSave(page);
    const next = await page.evaluate(() => {
      const c = Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const r = b.getBoundingClientRect();
          return { i, t: (b.innerText || '').trim(), d: b.disabled, w: Math.round(r.width) };
        })
        .filter((b) => b.t === '下一个' && !b.d && b.w > 200)
        .sort((a, b) => b.w - a.w);
      if (c[0]) {
        document.querySelectorAll('button')[c[0].i].click();
        return c[0];
      }
      return null;
    });
    console.log('next', next);
    await sleep(3500);
    await stayIfLeave(page);
  }
}

// setTimes 已废止 — 见 lib/set-times-china.mjs

async function holidays(page) {
  console.log('\n=== HOLIDAYS (Excel 售价列) ===');
  // close forms
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(400);
  if (page.url().includes('popup')) {
    await page.goto(page.url().split('#')[0], { waitUntil: 'domcontentloaded' });
    await sleep(2500);
  }
  const segs = [
    { key: 'oct', y: 2026, m: 10, s: 1, e: 10 },
    { key: 'spring', y: 2027, m: 2, s: 1, e: 15 },
    { key: 'may', y: 2027, m: 5, s: 1, e: 10 },
  ];
  async function caption() {
    return page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div,span')).find((e) =>
        /^\d{1,2}\s*月\s*20\d{2}$/.test((e.innerText || '').trim()),
      );
      return el?.innerText?.trim() || null;
    });
  }
  async function gotoMonth(y, m) {
    for (let i = 0; i < 40; i++) {
      const c = await caption();
      const mm = String(c || '').match(/^(\d{1,2})\s*月\s*(20\d{2})$/);
      if (mm && +mm[1] === m && +mm[2] === y) return;
      const cur = mm ? +mm[2] * 12 + +mm[1] : 0;
      const tgt = y * 12 + m;
      await page.evaluate((goNext) => {
        document
          .querySelector(
            goNext
              ? 'button[class*="custom-caption__NextButton"]'
              : 'button[class*="custom-caption__PreviousButton"]',
          )
          ?.click();
      }, cur < tgt);
      await sleep(260);
    }
  }
  for (let oi = 0; oi < 4; oi++) {
    const key = OPTIONS[oi].key;
    const pmap = PRICES[key];
    console.log('option', oi, key);
    for (const seg of segs) {
      const price = pmap[seg.key];
      console.log(' ', seg.key, price);
      // listClean-ish + scroll for later cards
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(300);
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button')).find((b) => (b.innerText || '').trim() === '消除')?.click();
      });
      await sleep(500);
      const box = await page.evaluate((idx) => {
        const btns = Array.from(document.querySelectorAll('button')).filter((b) =>
          (b.innerText || '').includes('销售日历管理'),
        );
        const b = btns[idx];
        if (!b) return null;
        b.scrollIntoView({ block: 'center' });
        const r = b.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, n: btns.length };
      }, oi);
      if (!box) throw new Error('no cal btn ' + oi);
      await page.mouse.click(box.x, box.y);
      await sleep(1800);
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button'))
          .find((b) => (b.innerText || '').includes('选择单个日期'))
          ?.click();
      });
      await sleep(500);
      await gotoMonth(seg.y, seg.m);
      for (let d = seg.s; d <= seg.e; d++) {
        const box = await page.evaluate((day) => {
          const b = Array.from(document.querySelectorAll('button[class*="custom-day__PlainDayButton"]')).find(
            (btn) => (btn.innerText || '').trim().split('\n')[0] === String(day) && !btn.disabled,
          );
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }, d);
        if (box) {
          await page.mouse.click(box.x, box.y);
          await sleep(30);
        }
      }
      const loc = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]').last();
      await loc.scrollIntoViewIfNeeded();
      for (let i = 0; i < 20; i++) {
        if (!(await loc.isDisabled())) break;
        await sleep(100);
      }
      if (!(await loc.isDisabled())) await loc.fill(price);
      console.log('  filled', await loc.inputValue().catch(() => '?'));
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button'))
          .find((b) => (b.innerText || '').trim() === '完成' && !b.disabled)
          ?.click();
      });
      await sleep(1800);
    }
  }
  await tempSave(page);
}

async function main() {
  const { page } = await getPage();
  console.log('phase', PHASE, 'prices', PRICES, 'images', IMAGES);
  if (PHASE === 'bootstrap' || PHASE === 'all') await bootstrap(page);
  if (PHASE === 'attrs' || PHASE === 'bootstrap' || PHASE === 'all') await fillAttrs(page);
  if (PHASE === 'intro' || PHASE === 'all') await fillIntro(page);
  if (PHASE === 'regs' || PHASE === 'all') await fillRegs(page);
  if (PHASE === 'options' || PHASE === 'all') await createOptions(page);
  if (PHASE === 'holidays' || PHASE === 'all') await holidays(page);

  const id = new URL(page.url()).searchParams.get('id');
  if (id) fs.writeFileSync('/tmp/nol-tussauds-id.txt', id);
  console.log('DONE url=', page.url(), 'id=', id, 'NEVER approval');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
