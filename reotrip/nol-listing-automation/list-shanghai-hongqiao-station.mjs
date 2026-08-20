/**
 * 上海市区酒店 ↔ 上海虹桥站 私人接送（火车站，非机场）
 * Excel: NOL 待上架产品 (6).xlsx → 国内接送产品 R52–53 仅 7 座×2
 *   7 去 成本 197.63 → 平日 247 / 五一·十一 353 / 春节 494
 *   7 返 成本 232.5  → 平日 291 / 五一·十一 415 / 春节 581
 * 时段 08:00–21:30×28；预约无航班；停选项列表；永不提交审核
 * 时段唯一实现：lib/set-times-china.mjs（§40 · 禁止本文件内另写 setTimes / retry）
 * §43 元素定位 · §52 视口 · §53 短步
 */
import fs from 'fs';
import path from 'path';
import { connectNolPage } from './lib/cdp-session.mjs';
import { setTimesChina, SetTimesStepError } from './lib/set-times-china.mjs';

const PRODUCT_KO =
  '상하이 시내 호텔 ↔ 상하이 훙차오역 단독 차량 편도 이동 서비스';
const INTERNAL = '上海市区酒店-上海虹桥站';
const DEST_KO = '상하이 훙차오역';
const DEST_KO_SHORT = '상하이 훙차오역';
const CITY_KO = '상하이 시내 호텔';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/shanghai-hongqiao-station';
const IMAGES = ['hq-1.jpg', 'hq-2.jpg', 'hq-3.jpg']
  .map((f) => path.join(IMG_DIR, f))
  .filter((f) => fs.existsSync(f));

const PRICES = {
  '7go': { normal: '247', oct: '353', spring: '494', may: '353' },
  '7rtn': { normal: '291', oct: '415', spring: '581', may: '415' },
};

const OPTIONS = [
  {
    key: '7go',
    name: `${CITY_KO} 출발 → ${DEST_KO} 편도 이동 (7인승 차량)`,
    desc: `${CITY_KO} 출발 → ${DEST_KO} 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 3~5개 적재 가능\n별도 기차표, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
    pt: '7인승 가는',
    ptd: '7인승 차량',
  },
  {
    key: '7rtn',
    name: `${DEST_KO} 출발 → ${CITY_KO} 편도 이동 (7인승 차량)`,
    desc: `${DEST_KO} 출발 → ${CITY_KO} 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 3~5개 적재 가능\n별도 기차표, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
    pt: '7인승 오는',
    ptd: '7인승 차량',
  },
];

const HEADLINE = `${CITY_KO} ↔ ${DEST_KO_SHORT} 편도 전용 차량으로 여유로운 이동을 즐기세요!`;
const HIGHLIGHT = [
  `${CITY_KO}과 ${DEST_KO}을 편안하게 연결하는 단독 차량 이동`,
  '기차 출발/도착 일정에 맞춘 프라이빗 픽업 및 샌딩',
  '7인승 차량 · 최대 4인 + 수하물 3~5개(24인치 이하)',
].join('\n');
const INTRO = `이 서비스는 ${CITY_KO}과 ${DEST_KO}(上海虹桥站 / Shanghai Hongqiao Railway Station) 사이의 편도 전용 차량 이동 서비스입니다.
편안하고 프라이빗한 차량과 숙련된 기사님이 함께하여, 대중교통 환승이나 택시 이용 없이 목적지까지 빠르고 쾌적하게 이동하실 수 있습니다.

포함 사항:
- ${CITY_KO} ↔ ${DEST_KO} 편도 전용 차량 서비스 1회
- 차량 및 기사 요금, 주차비 포함

예약 시 상하이 시내 호텔명/주소, 픽업 장소·시간, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
기사님이 보통 이용일 하루 전 WhatsApp/SMS로 연락드리니, 번호가 WhatsApp에 등록되어 있고 계정이 정상인지 확인해 주세요.

가족, 출장, 소규모 그룹 등 상하이 훙차오역을 이용하시는 분들께 적합합니다.`;

const MUST_KNOW = `1.수하물 규격: 24인치 이하 수하물 기준, 7인승 차량 3~5개 적재 가능. 차량 공간을 고려해 적합한 차형을 선택해 주세요.

2.미팅 장소: 호텔 픽업 시 기사님이 호텔 로비에서 픽업해 드립니다. 동일한 이름의 호텔이 있을 수 있으므로 호텔 이름과 주소를 함께 제공해 주세요. 역 픽업 시 출구/만남의 장소를 정확히 입력해 주세요.

3.본 서비스는 호텔(또는 도심)과 ${DEST_KO} 간의 이동만을 포함하며, 중간 정차는 포함되지 않습니다.

4.표시된 요금은 1인 기준이 아닌 차량 1대 기준입니다.

5.실제 제공되는 차량은 이미지와 다를 수 있습니다.

6.왕복 서비스를 원하시는 경우, "편도(출발)" 및 "편도(복귀)" 옵션을 각각 별도로 예약해 주세요.

7.픽업 시간 또는 장소 변경은 최소 2일 전에 요청해 주셔야 하며, 기한 이후에는 수정이 어려울 수 있습니다.

8.아동용 카시트, 야간 할증 등 기타 서비스는 포함되어 있지 않습니다.

9.기사님이 예정된 시간에 도착한 후, 최대 30분까지 무료 대기해 드리며, 이후에도 고객님이 나타나지 않을 경우 차량은 출발하게 됩니다.

10.본 서비스는 별도의 티켓/바우처 제시가 필요 없습니다. 기사님이 이용일 전 WhatsApp/SMS로 연락드립니다.`;

const HOW_TO = `1.문의사항이 있으실 경우 이메일 agency@reotrip.com 또는 전화 +852 3428 81 82 로 언제든지 연락해 주세요.

2.예약은 접수 후 영업일 기준 3일 이내에 확정되며, 확정이 어려운 경우 별도로 안내해 드립니다. (영업일 기준은 현지 시간에 따릅니다)

3.예약 시 호텔 정보, 픽업 시간/장소, 인원 및 수하물을 정확히 입력해 주세요.`;

const INCLUDE_TR = `${CITY_KO} ↔ ${DEST_KO} 편도 전용 차량 이동 및 주차비 포함`;
const INCLUDE_PU = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE =
  '기차표, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

// 火车站：无航班字段
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
  // §52+§53: no narrow viewport; kill residual; default timeouts
  // 用户窗过窄时允许一次性 1440×900（§52）
  return connectNolPage({
    selfHint: 'list-shanghai-hongqiao-station',
    killPeers: true,
    forceViewport: true,
    viewport: { width: 1440, height: 900 },
  });
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
  if (
    body.includes('훙차오역') ||
    body.includes('虹桥站') ||
    body.includes(PRODUCT_KO) ||
    body.includes(INTERNAL)
  ) {
    console.log('Resume existing draft');
    const card = page
      .locator('div[class*="slot___StyledContainer4"]')
      .filter({ hasText: /훙차오역|虹桥站|상하이 시내 호텔 ↔ 상하이 훙차오/ })
      .first();
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
  // 7座 usable max 4 pax (Excel note)
  await page.locator('input[name=availableNumberOfPeople], #availableNumberOfPeople').fill('4').catch(() => {});

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

  // POI 上海虹桥站（火车站，排除机场）— §43 元素定位
  const hasPoi = await page.evaluate(() =>
    /虹桥站|훙차오역|Hongqiao.*Station|虹桥火车站/i.test(document.body.innerText) &&
      !/虹桥机场|Hongqiao Airport/i.test(document.body.innerText.slice(0, 500)),
  );
  if (!hasPoi) {
    await page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ }).first().click().catch(() => {});
    await sleep(1500);
    const search = page.locator('input[placeholder*="검색"], input[placeholder*="관광지"], input[placeholder*="搜索"]').first();
    await search.waitFor({ state: 'visible', timeout: 8000 });
    await search.fill('上海虹桥站');
    await page.keyboard.press('Enter');
    await sleep(2200);
    let clicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
        const t = (el.innerText || '').replace(/\s+/g, ' ');
        const r = el.getBoundingClientRect();
        return (
          r.width > 280 &&
          r.height > 40 &&
          r.height < 200 &&
          r.y > 80 &&
          /虹桥|Hongqiao|훙차오/i.test(t) &&
          /站|Station|역|铁路|高铁/i.test(t) &&
          /上海|Shanghai|中国|中华/i.test(t) &&
          !/机场|Airport|机场|浦东|Pudong|北京|大兴/i.test(t)
        );
      });
      cards.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
      if (!cards[0]) return null;
      cards[0].click();
      return cards[0].innerText.slice(0, 120);
    });
    if (!clicked) {
      await search.fill('Shanghai Hongqiao Railway Station');
      await page.keyboard.press('Enter');
      await sleep(2200);
      clicked = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
          const t = (el.innerText || '').replace(/\s+/g, ' ');
          const r = el.getBoundingClientRect();
          return (
            r.width > 280 &&
            r.height > 40 &&
            r.height < 200 &&
            /Hongqiao|虹桥/i.test(t) &&
            /Station|Railway|站|역/i.test(t) &&
            !/Airport|机场/i.test(t)
          );
        });
        if (!cards[0]) return null;
        cards[0].click();
        return cards[0].innerText.slice(0, 120);
      });
    }
    console.log('POI pick', clicked);
    await sleep(1000);
    await page.getByRole('button', { name: /添加地点|添加地點/ }).first().click().catch(() => {});
    await sleep(800);
    await page.evaluate(() => {
      const radio = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
      if (radio && !radio.checked) {
        const lab = radio.closest('label') || radio;
        lab.click();
      }
      // 文案 label 旅游地
      Array.from(document.querySelectorAll('label,div,span'))
        .find((e) => /^(旅游地|旅遊地)$/.test((e.innerText || '').trim()))
        ?.click();
    });
    await sleep(400);
    await page.getByRole('button', { name: /^添加$/ }).last().click().catch(async () => {
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button'))
          .find((x) => (x.innerText || '').trim() === '添加' && !x.disabled)
          ?.click();
      });
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
    // §43: 文案定位，禁止 mouse.click 坐标
    const tabBtn = page.getByRole('button', { name: /其他价格类型/ }).first();
    if (await tabBtn.count()) {
      await tabBtn.click({ timeout: 10000 });
    } else {
      await page.locator('button,li').filter({ hasText: /其他价格类型/ }).first().click({ timeout: 10000 });
    }
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

    // times — §40 唯一实现；任一步 FAIL 即停，禁止 retry
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
  // 仅 2 卡（7 去 / 7 返）× 3 段；§42 listClean + mouse 逐日
  for (let oi = 0; oi < OPTIONS.length; oi++) {
    const key = OPTIONS[oi].key;
    const pmap = PRICES[key];
    console.log('option', oi, key);
    for (const seg of segs) {
      const price = pmap[seg.key];
      console.log(' ', seg.key, price);
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(300);
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button'))
          .find((b) => (b.innerText || '').trim() === '消除')
          ?.click();
      });
      await sleep(400);
      // listClean: reload option list when we have draft id
      const id = new URL(page.url()).searchParams.get('id');
      if (id) {
        await page.goto(
          `https://tour.triple.partners/product-management/registration/option?id=${id}&status=UNPUBLISHED&lang=zh-tw`,
          { waitUntil: 'domcontentloaded', timeout: 60000 },
        );
        await sleep(2500);
      }
      // §43: 销售日历管理 + 日格 元素点击（禁止 mouse 坐标）
      const calBtn = page.getByRole('button', { name: /销售日历管理/ }).nth(oi);
      await calBtn.scrollIntoViewIfNeeded();
      await calBtn.click({ timeout: 15000 });
      await sleep(1800);
      const multi = page.locator('button').filter({ hasText: /选择单个日期/ });
      if (await multi.count()) await multi.first().click({ timeout: 8000 });
      await sleep(500);
      await gotoMonth(seg.y, seg.m);
      for (let d = seg.s; d <= seg.e; d++) {
        const dayBtn = page.locator('button[class*="custom-day__PlainDayButton"]').filter({
          hasText: new RegExp(`^${d}$`),
        });
        const n = await dayBtn.count();
        for (let i = 0; i < n; i++) {
          if (await dayBtn.nth(i).isDisabled().catch(() => true)) continue;
          const t = (await dayBtn.nth(i).innerText()).trim().split('\n')[0];
          if (t !== String(d)) continue;
          await dayBtn.nth(i).scrollIntoViewIfNeeded().catch(() => {});
          await dayBtn.nth(i).click({ force: true, timeout: 8000 });
          await sleep(40);
          break;
        }
      }
      const loc = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]').last();
      await loc.scrollIntoViewIfNeeded();
      for (let i = 0; i < 20; i++) {
        if (!(await loc.isDisabled())) break;
        await sleep(100);
      }
      if (await loc.isDisabled()) throw new Error(`price still disabled oi=${oi} ${seg.key}`);
      await loc.fill(price);
      const filled = await loc.inputValue();
      console.log('  【读回值】price fill', filled);
      if (String(filled) !== String(price)) throw new Error(`price fill fail want=${price} got=${filled}`);
      await page.getByRole('button', { name: /^完成$/ }).last().click({ timeout: 10000 });
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
  if (id) fs.writeFileSync('/tmp/nol-beijing-daxing-id.txt', id);
  console.log('DONE url=', page.url(), 'id=', id, 'NEVER approval prices=', PRICES);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
