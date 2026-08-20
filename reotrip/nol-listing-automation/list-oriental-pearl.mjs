/**
 * 上海市区酒店 ↔ 东方明珠塔 私人接送
 * skill: nol-product-listing-helper + shanghai-oriental-pearl-transfer.md
 * Never click 提交审核 / 批准请求
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PRODUCT_NAME = '상하이 시내 호텔 ↔ 동방명주탑 단독 차량 편도 이동 서비스';
const INTERNAL_NAME = '上海市区酒店-Oriental Pearl Radio & Television Tower Ticket';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/shanghai-oriental-pearl';
const IMAGES = ['oriental-pearl-1.jpg', 'oriental-pearl-2.jpg', 'oriental-pearl-3.jpg'].map((f) =>
  path.join(IMG_DIR, f),
);

const HEADLINE = '상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량으로 여유로운 이동을 즐기세요!';
const HIGHLIGHT = [
  '상하이 시내 호텔에서 동방명주탑까지 단독 차량으로 편안하게 이동',
  '대중교통 환승 없이 빠르고 쾌적한 전용 픽업 서비스',
  '숙련된 기사님의 안전하고 친절한 응대',
].join('\n');
const INTRO = `이 서비스는 상하이 시내 호텔과 동방명주탑(Oriental Pearl Tower) 사이의 편도 전용 차량 이동 서비스입니다.
편안하고 프라이빗한 차량과 숙련된 기사님이 함께하여, 지하철 환승이나 택시 이용 없이 목적지까지 빠르고 쾌적하게 이동하실 수 있습니다.

포함 사항:
- 상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량 서비스 1회
- 차량 및 기사 요금 포함으로, 별도 추가 요금 없음

예약 시간에 맞춰 고객님 숙소 또는 약속 장소에서 픽업
숙련된 전문 기사님의 안전하고 친절한 서비스 제공

가족, 커플, 소규모 그룹 등 동방명주탑을 방문하시는 분들께 적합합니다.
지금 바로 예약하고, 복잡한 교통 걱정 없이 상하이 야경과 타워 일정을 여유롭게 즐겨보세요!`;

const MUST_KNOW = `1.수하물 규격: 24인치(표준) 이하 수하물 기준 - 59cm(높이) × 41cm(너비) × 24cm(두께) 이내
5인승 차량: 최대 2개까지 적재 가능
7인승 차량: 최대 3개까지 적재 가능

2.미팅 장소: 기사님이 호텔 로비에서 픽업해 드립니다. 동일한 이름의 호텔이 있을 수 있으므로, 호텔 이름과 주소를 함께 제공해 주세요.

3.본 서비스는 호텔(또는 도심)과 동방명주탑 간의 이동만을 포함하며, 중간 정차는 포함되지 않습니다.

4.표시된 요금은 1인 기준이 아닌 차량 1대 기준입니다.

5.실제 제공되는 차량은 이미지와 다를 수 있습니다.

6.왕복 서비스를 원하시는 경우, "편도(출발)" 및 "편도(복귀)" 옵션을 각각 별도로 예약해 주세요.

7.픽업 시간 또는 장소 변경은 최소 24시간 전에 요청해 주셔야 하며, 24시간 이내 요청 시 추가 요금이 발생할 수 있습니다.

8.오후 10시부터 오전 7시 사이에 제공되는 서비스에는 야간 운행 추가 요금이 부과됩니다.

9.기사님이 예정된 시간에 도착한 후, 최대 30분까지 무료 대기해 드리며, 이후에도 고객님이 나타나지 않을 경우 차량은 출발하게 됩니다.`;

const HOW_TO = `1.문의사항이 있으실 경우 이메일 agency@reotrip.com 또는 전화 +852 3428 81 82 로 언제든지 연락해 주세요.

2.예약은 접수 후 영업일 기준 3일 이내에 확정되며, 확정이 어려운 경우 별도로 안내해 드립니다. (영업일 기준은 현지 시간에 따릅니다)`;

const INCLUDE_TRANSPORT =
  '상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량 이동 및 주차비 포함';
const INCLUDE_PICKUP = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE = '가이드, 팁, 동방명주탑 티켓, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

const OPTIONS = [
  {
    name: '상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (5인승 차량)',
    desc: '상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (5인승 차량, 최대 4인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n5인승 차량: 최대 2개까지 적재 가능',
    priceTypeName: '5인승 가는',
    priceTypeDesc: '5인승 차량',
    price: '213',
  },
  {
    name: '상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (7인승 차량)',
    desc: '상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (7인승 차량, 최대 6인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n7인승 차량: 최대 3개까지 적재 가능',
    priceTypeName: '7인승 가는',
    priceTypeDesc: '7인승 차량',
    price: '250',
  },
  {
    name: '동방명주탑 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량)',
    desc: '동방명주탑 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량, 최대 4인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n5인승 차량: 최대 2개까지 적재 가능',
    priceTypeName: '5인승 오는',
    priceTypeDesc: '5인승 차량',
    price: '213',
  },
  {
    name: '동방명주탑 출발 → 상하이 시내 호텔 편도 이동 (7인승 차량)',
    desc: '동방명주탑 출발 → 상하이 시내 호텔 편도 이동 (7인승 차량, 최대 6인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n7인승 차량: 최대 3개까지 적재 가능',
    priceTypeName: '7인승 오는',
    priceTypeDesc: '7인승 차량',
    price: '250',
  },
];

/**
 * Holiday overrides from Excel (user table 2026-08-06).
 * DO NOT assume go===return: 7-seat spring go=510, return=500.
 * See skill references/shanghai-oriental-pearl-transfer.md
 */
const HOLIDAY_BY_OPTION = [
  { oct: '304', spring: '425', may: '304' }, // 5 go
  { oct: '357', spring: '510', may: '357' }, // 7 go — spring 510
  { oct: '304', spring: '425', may: '304' }, // 5 rtn
  { oct: '357', spring: '500', may: '357' }, // 7 rtn — spring 500 (not 510)
];
// windows: 2026-10-01..10 / 2027-02-01..15 / 2027-05-01..10

// scenic transfer — no flight fields
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
const PHASE = process.argv[2] || 'all'; // create|attr|intro|regs|options|calendar|all

async function getPage() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().includes('tour.triple.partners'));
  if (!page) throw new Error('no NOL tab on CDP :9222');
  await page.bringToFront();
  return { browser, page };
}

function isApproval(t) {
  return /批准|提交审核|승인\s*요청|승인요청/.test(t || '');
}

async function clickBtn(page, texts, { exact = false, allowDisabled = false } = {}) {
  const list = Array.isArray(texts) ? texts : [texts];
  const hit = await page.evaluate(
    ({ list, exact, allowDisabled }) => {
      const btns = Array.from(document.querySelectorAll('button, [role=button], a, div, span, label'));
      for (const name of list) {
        const el = btns.find((b) => {
          const t = (b.innerText || '').replace(/\s+/g, ' ').trim();
          if (!t) return false;
          if (/批准|提交审核|승인/.test(t)) return false;
          if (exact ? t !== name : t !== name && !t.startsWith(name) && t.replace(/\s/g, '') !== name.replace(/\s/g, ''))
            return false;
          if (!allowDisabled && (b.disabled || b.getAttribute('aria-disabled') === 'true')) return false;
          const r = b.getBoundingClientRect();
          return r.width > 4 && r.height > 4;
        });
        if (el) {
          let target = el;
          if (el.tagName === 'SPAN' || (el.tagName === 'DIV' && !/button/i.test(el.getAttribute('role') || ''))) {
            const p = el.closest('button, [role=button], a, label');
            if (p) target = p;
          }
          target.scrollIntoView({ block: 'center' });
          target.click();
          return (target.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        }
      }
      return null;
    },
    { list, exact, allowDisabled },
  );
  return hit;
}

async function bottomState(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b) => ({
        t: (b.innerText || '').replace(/\s+/g, ' ').trim(),
        d: !!b.disabled,
      }))
      .filter((b) => /保存然后|保存然後|临时保存|臨時存儲|提交审核|批准|下个|下個|下一个/.test(b.t)),
  );
}

async function clickSaveThen(page, label) {
  const b = await bottomState(page);
  console.log(`[${label}] bottom`, b);
  const ok = b.some((x) => (x.t === '保存然后' || x.t === '保存然後') && !x.d);
  if (!ok) {
    console.log(`[${label}] 保存然后 NOT enabled`);
    return false;
  }
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => {
        const t = (x.innerText || '').trim();
        return (t === '保存然后' || t === '保存然後') && !x.disabled;
      })
      ?.click();
  });
  await sleep(3500);
  console.log(`[${label}] after save-then`, page.url());
  return true;
}

async function tempSave(page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return { i, t, d: b.disabled, y: r.y, w: r.width };
      })
      .filter((b) => (b.t === '临时保存' || b.t === '臨時存儲') && !b.d)
      .sort((a, b) => b.y - a.y || a.w - b.w);
    if (buttons[0]) document.querySelectorAll('button')[buttons[0].i].click();
  });
  await sleep(2000);
  console.log('tempSave (never approval)');
}

async function clickNextOption(page) {
  // form footer 下一个 / 下個 wide button
  const hit = await page.evaluate(() => {
    const cands = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return { i, t, d: b.disabled, w: r.width, y: r.y };
      })
      .filter((b) => (b.t === '下一个' || b.t === '下个' || b.t === '下個') && !b.d && b.w > 200);
    cands.sort((a, b) => b.w - a.w);
    if (!cands[0]) return null;
    document.querySelectorAll('button')[cands[0].i].click();
    return cands[0];
  });
  console.log('option next', hit);
  await sleep(2500);
  return !!hit;
}

async function fillId(page, id, val) {
  const loc = page.locator(`#${id}`);
  if (!(await loc.count())) return false;
  await loc.click({ force: true });
  await loc.fill(String(val));
  return true;
}

async function ensureCreateOrResume(page) {
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  const body = await page.locator('body').innerText();
  if (body.includes('동방명주탑') && body.includes('단독 차량')) {
    console.log('Resume draft by card click');
    const card = page
      .locator('div[class*="slot___StyledContainer4"]')
      .filter({ hasText: '동방명주탑' })
      .first();
    await card.scrollIntoViewIfNeeded();
    await card.click({ force: true });
    await sleep(3500);
    return 'resume';
  }

  console.log('Create new product');
  // 简/繁 新产品注册
  const created = await clickBtn(page, ['新产品注册', '新產品註冊', '신상품 등록']);
  console.log('click create', created);
  await sleep(1500);

  // fill product name in modal — prefer second input
  const inputs = page.locator('input:visible');
  const n = await inputs.count();
  console.log('inputs', n);
  const nameInput = n > 1 ? inputs.nth(1) : inputs.first();
  await nameInput.fill(PRODUCT_NAME);
  await sleep(400);

  // TRANSPORTATION
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div,button,label,span')).find((e) => {
      const t = (e.innerText || '').trim();
      return /TRANSPORTATION|运输货物|運輸貨物/.test(t) && t.length < 40;
    });
    el?.click();
  });
  await sleep(400);

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /开始创建|開始創建|상품 만들기|创建产品/.test(b.innerText || ''))
      ?.click();
  });
  await page.waitForURL(/registration\/properties/, { timeout: 90000 }).catch(() => {});
  await sleep(3000);
  return 'create';
}

async function fillAttributes(page) {
  console.log('\n=== ATTR ===', page.url());
  if (!page.url().includes('/properties')) {
    await clickBtn(page, ['产品属性', '產品屬性']);
    await sleep(2000);
  }

  if (await page.locator('#title').count()) {
    await page.locator('#title').fill(PRODUCT_NAME);
    if (await page.locator('#managementTitle').count())
      await page.locator('#managementTitle').fill(INTERNAL_NAME);
    if (await page.locator('#requiredNumberOfPeople').count())
      await page.locator('#requiredNumberOfPeople').fill('1');
    if (await page.locator('#availableNumberOfPeople').count())
      await page.locator('#availableNumberOfPeople').fill('6');
  } else {
    // generic name fields
    await page.evaluate(
      ({ title, mgmt }) => {
        const t = document.querySelector('input[name=title], #title');
        const m = document.querySelector('input[name=managementTitle], #managementTitle');
        if (t) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(t, title);
          t.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (m) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(m, mgmt);
          m.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      { title: PRODUCT_NAME, mgmt: INTERNAL_NAME },
    );
  }

  // 使用类型 fixed date if needed — leave default if already set

  // 人数限制 是
  await page.evaluate(() => {
    const yes = Array.from(document.querySelectorAll('input[name=isPassengerLimit]')).find(
      (i) => i.value === '1' || i.value === 'true',
    );
    if (yes && !yes.checked) yes.click();
  });

  // 私人的
  await page.locator('input[name=tourTypes][value="0"]').check({ force: true }).catch(async () => {
    await page.evaluate(() => {
      const lab = Array.from(document.querySelectorAll('label,div,span')).find((e) =>
        /^私人/.test((e.innerText || '').trim()),
      );
      lab?.click();
    });
  });
  // also mouse on label
  await page.evaluate(() => {
    const lab = Array.from(document.querySelectorAll('label,div')).find((e) =>
      (e.innerText || '').includes('私人'),
    );
    if (lab) {
      const r = lab.getBoundingClientRect();
      lab.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: r.x + 12, clientY: r.y + r.height / 2 }),
      );
    }
  });
  const priv = await page.evaluate(
    () => document.querySelector('input[name=tourTypes][value="0"]')?.checked,
  );
  console.log('私人的', priv);

  // theme 기사제공차량
  await clickBtn(page, ['选择类别（主题）', '選擇類別（主題）', '选择类别']);
  await sleep(1000);
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div,label,li,span')).find((e) =>
      /기사제공차량|司机提供车辆|司機提供車輛/.test(e.innerText || ''),
    );
    el?.click();
  });
  await sleep(400);
  await clickBtn(page, ['已选', '已選', '完成', '완료']);
  await sleep(800);

  // language 韩语
  await clickBtn(page, ['选择语言', '選擇語言', '选择你的语言', '選擇你的语言']);
  await sleep(1000);
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div,label,li,span,button')).find((e) => {
      const t = (e.innerText || '').trim();
      return (t === '韩语' || t === '韓語' || t === '한국어') && t.length < 10;
    });
    el?.click();
  });
  await sleep(400);
  await clickBtn(page, ['已选', '已選', '完成']);
  await sleep(800);

  // POI 东方明珠
  const body = await page.locator('body').innerText();
  if (!/동방명주|东方明珠|Oriental Pearl|明珠/.test(body) || body.includes('请输入产品运行')) {
    await clickBtn(page, ['添加地区和地点', '添加地區和地點', '添加地点']);
    await sleep(1200);
    const search = page.locator('input[type=text]:visible').last();
    await search.fill('东方明珠');
    await sleep(800);
    await page.keyboard.press('Enter');
    await sleep(2000);
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div,li,button')).find((e) => {
        const t = e.innerText || '';
        return /东方明珠|東方明珠|Oriental Pearl|동방명주/.test(t) && t.length < 120;
      });
      el?.click();
    });
    await sleep(800);
    await clickBtn(page, ['添加地点', '添加地點', '添加']);
    await sleep(800);
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div,label,li,span')).find((e) =>
        /TRAVEL_PLACE|旅游地|旅遊地|관광지/.test(e.innerText || ''),
      );
      el?.click();
    });
    await sleep(400);
    await page.evaluate(() => {
      const adds = Array.from(document.querySelectorAll('button')).filter((b) =>
        /添加|추가/.test(b.innerText || ''),
      );
      adds.at(-1)?.click();
    });
    await sleep(1500);
  }

  const saved = await clickSaveThen(page, 'attr');
  if (!saved) {
    console.log(
      'invalids',
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('[aria-invalid=true], .error, [class*=error]'))
          .slice(0, 20)
          .map((e) => (e.innerText || e.name || e.id || '').slice(0, 80)),
      ),
    );
    await tempSave(page);
  }
  return saved;
}

async function fillIntro(page) {
  console.log('\n=== INTRO ===', page.url());
  if (!page.url().includes('/introduction')) {
    await clickBtn(page, ['产品介绍', '產品介紹']);
    await sleep(2000);
    if (!page.url().includes('/introduction')) {
      await clickSaveThen(page, 'to-intro-gate');
      await clickBtn(page, ['产品介绍', '產品介紹']);
      await sleep(2000);
    }
  }

  // try common field names / placeholders
  await page.evaluate(
    ({ headline, highlight, intro, must, howto }) => {
      const setReact = (el, val) => {
        if (!el) return;
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        setter?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const byName = (n) => document.querySelector(`[name="${n}"]`);
      setReact(byName('headline') || byName('title') || document.querySelector('#headline'), headline);
      // multi-line fields
      const areas = Array.from(document.querySelectorAll('textarea'));
      if (areas[0]) setReact(areas[0], highlight);
      if (areas[1]) setReact(areas[1], intro);
      if (areas[2]) setReact(areas[2], must);
      if (areas[3]) setReact(areas[3], howto);
    },
    { headline: HEADLINE, highlight: HIGHLIGHT, intro: INTRO, must: MUST_KNOW, howto: HOW_TO },
  );

  // schedule NONE
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('label,div,span,button')).find((e) =>
      /没有单独的时间表|沒有單獨的時間表|NONE|시간표 없음/.test(e.innerText || ''),
    );
    el?.click();
  });
  await sleep(500);

  // images — 썸네일 first file input under 상품 이미지
  const fileInputs = page.locator('input[type=file][accept*="image"]');
  const fc = await fileInputs.count();
  console.log('file inputs', fc);
  if (fc > 0) {
    // use first input under 썸네일/商品 if possible
    try {
      await fileInputs.first().setInputFiles(IMAGES.filter((f) => fs.existsSync(f)));
      console.log('setInputFiles multi ok');
      await sleep(5000);
    } catch (e) {
      console.log('setInputFiles fail', e.message);
      for (const img of IMAGES) {
        if (!fs.existsSync(img)) continue;
        const chooserP = page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
        await clickBtn(page, ['上传图片', '上傳圖片', '이미지 등록', '注册图片']);
        const ch = await chooserP;
        if (ch) {
          await ch.setFiles(img);
          await sleep(3000);
          console.log('uploaded', path.basename(img));
        }
      }
    }
  }

  const saved = await clickSaveThen(page, 'intro');
  if (!saved) await tempSave(page);
  return saved;
}

async function fillRegs(page) {
  console.log('\n=== REGS ===', page.url());
  if (!page.url().includes('/regulations')) {
    await clickBtn(page, ['产品法规', '產品法規']);
    await sleep(2000);
    if (!page.url().includes('/regulations')) {
      await clickSaveThen(page, 'to-regs');
      await sleep(2000);
    }
  }

  // min purchase day 3, qty 1-10 if present
  await page.evaluate(() => {
    const minDay = document.querySelector(
      'input[name=minimumPurchaseDay], #minimumPurchaseDay, input[name*=minimumPurchase]',
    );
    if (minDay) {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(minDay, '3');
      minDay.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // manual cancel
  await page.evaluate(() => {
    const lab = Array.from(document.querySelectorAll('label,div,span')).find((e) =>
      /手动取消|手動取消|수동취소/.test(e.innerText || ''),
    );
    lab?.click();
  });
  await sleep(400);

  // cancel window 2 / 0
  await page.evaluate(() => {
    const set = (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('input[name="windows.0.deadline"]', '2');
    set('input[name="windows.0.penalty"]', '0');
    // also try generic
    const nums = Array.from(document.querySelectorAll('input[type=number], input[type=tel], input[type=text]'));
  });

  // include modal
  await clickBtn(page, ['包含', '包含/不包含', '撰写', '撰写包含']);
  await sleep(1000);
  await page.evaluate(
    ({ tr, pu }) => {
      const boxes = Array.from(document.querySelectorAll('input[type=checkbox], [role=checkbox]'));
      for (const b of boxes) {
        const lab = (b.closest('label') || b.parentElement)?.innerText || '';
        if (/TRANSPORT|运输|運輸|운송|PICK|接驳|픽업|其他|기타/.test(lab)) {
          if (b.getAttribute('role') === 'checkbox') b.click();
          else if (!b.checked) b.click();
        }
      }
      const areas = Array.from(document.querySelectorAll('textarea'));
      if (areas[0]) {
        const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        s.call(areas[0], tr);
        areas[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (areas[1]) {
        const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        s.call(areas[1], pu);
        areas[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
      // named ids
      const t = document.querySelector('#inclusions_TRANSPORTATION_description');
      const p = document.querySelector('#inclusions_PICK_UP_description, #inclusions_OTHER_description');
      if (t) {
        const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        s.call(t, tr);
        t.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (p) {
        const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        s.call(p, pu);
        p.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    { tr: INCLUDE_TRANSPORT, pu: INCLUDE_PICKUP },
  );
  await sleep(500);
  await clickBtn(page, ['节省', '節省', '保存', '完成', '완료']);
  await sleep(1000);

  // exclude if separate
  await page.evaluate((ex) => {
    const t = document.querySelector('textarea[name*=exclud], #exclusions, textarea[placeholder*=不包]');
    if (t) {
      const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      s.call(t, ex);
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, EXCLUDE);

  // 代表预约信息
  await clickBtn(page, ['代表预约信息', '代表預約信息', '代表预订信息']);
  await sleep(1500);
  for (const id of RESV_IDS) {
    await page.evaluate((rid) => {
      const el =
        document.getElementById(rid) ||
        document.querySelector(`[id="${rid}"]`) ||
        document.querySelector(`input[id*="${rid.replace('-required', '')}"]`);
      if (!el) return;
      const row = el.closest('label,div,li,tr') || el;
      const box = row.querySelector('[role=checkbox]') || el;
      box.click();
    }, id);
    await sleep(80);
  }
  await sleep(400);
  await clickBtn(page, ['已选', '已選']);
  await sleep(1000);

  // voucher
  await clickBtn(page, ['选择优惠券', '選擇優惠券', '代金券', '选择凭证']);
  await sleep(1200);
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('div,li,button')).find((e) =>
      /예약정보로 확인|无需换货|無需換貨|预约信息确认|用预约信息确认/.test(e.innerText || ''),
    );
    card?.click();
  });
  await sleep(500);
  await clickBtn(page, ['已选', '已選', '完成', '节省', '節省']);
  await sleep(1000);

  const saved = await clickSaveThen(page, 'regs');
  if (!saved) {
    await tempSave(page);
    // try stepper 选项管理
    await clickBtn(page, ['选项管理', '選項管理']);
    await sleep(2000);
  }
  return saved;
}

async function createOneOption(page, opt, index) {
  console.log('\n=== OPTION', index + 1, opt.name);
  if (index === 0) {
    // may already show add button
  }
  await clickBtn(page, ['注册/添加选项', '註冊/添加選項', '添加选项', '注册选项']);
  await sleep(2000);

  // name / desc
  await page.evaluate(
    ({ name, desc }) => {
      const set = (el, val) => {
        if (!el) return;
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const s = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        s?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const nameEl =
        document.querySelector('input[name=name]') ||
        document.querySelector('input[name=optionName]') ||
        document.querySelector('#name');
      set(nameEl, name);
      const areas = Array.from(document.querySelectorAll('textarea'));
      if (areas[0]) set(areas[0], desc);
    },
    { name: opt.name, desc: opt.desc },
  );
  await sleep(400);

  // price type
  await clickBtn(page, ['选择价格类型', '選擇價格類型', '价格类型', '가격 타입']);
  await sleep(1000);
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('div,button,span')).find((e) =>
      /其他价格|其他價格|기타 가격|직접 입력|手动输入|手動輸入/.test(e.innerText || ''),
    );
    tab?.click();
  });
  await sleep(800);
  await page.evaluate(
    ({ pn, pd }) => {
      const set = (el, val) => {
        if (!el) return;
        const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        s?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const inputs = Array.from(document.querySelectorAll('input[type=text]:not([disabled])'));
      // placeholders
      for (const el of inputs) {
        const ph = el.getAttribute('placeholder') || '';
        if (/销售渠道|銷售渠道|名稱/.test(ph) || ph.includes('输入的名称')) set(el, pn);
        if (/满 19|滿 19|例/.test(ph)) set(el, pd);
      }
      // fallback first two empty
      const empties = inputs.filter((i) => !i.value);
      if (empties[0]) set(empties[0], pn);
      if (empties[1]) set(empties[1], pd);
      // checkboxes required + representative
      for (const id of ['ETC-required-label', 'ETC-representative-label']) {
        const box = document.querySelector(`[aria-labelledby="${id}"]`);
        box?.click();
      }
    },
    { pn: opt.priceTypeName, pd: opt.priceTypeDesc },
  );
  await sleep(400);
  await clickBtn(page, ['完成', '완료', '节省', '節省']);
  await sleep(1000);

  // re-fill option name (overwrite trap)
  await page.evaluate((name) => {
    const el = document.querySelector('input[name=name], #name, input[name=optionName]');
    if (!el) return;
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, name);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, opt.name);

  // period 1 year
  await page.evaluate(() => {
    const y = document.querySelector('input[value="ONE_YEAR"]');
    if (y) y.click();
    else {
      const lab = Array.from(document.querySelectorAll('label,span,div')).find((e) =>
        /1年|一年/.test((e.innerText || '').trim()),
      );
      lab?.click();
    }
  });
  await sleep(800);

  // price
  await page.evaluate((price) => {
    const el =
      document.querySelector('input[placeholder*="价格"]') ||
      document.querySelector('input[placeholder*="價格"]') ||
      document.querySelector('input[name=price]');
    if (!el || el.disabled) return 'disabled';
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, price);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.value;
  }, opt.price);
  await sleep(400);

  // times 08:00-21:30
  await setTimesChina(page);

  // 临时保存 then 下一个
  await tempSave(page);
  await sleep(800);
  const nextOk = await clickNextOption(page);
  console.log('option saved next?', nextOk);
  return nextOk;
}

async function setTimesChina(page) {
  // open: 设置时间 OR ⋯더 보기 → 编辑
  let opened = await clickBtn(page, ['设置时间', '設定時間', '设置时间段']);
  if (!opened) {
    const more = page.locator('[class*="time-slots-field"] button[aria-label="더 보기"]');
    if (await more.count()) {
      await more.click({ force: true });
      await sleep(500);
      await page.evaluate(() => {
        const leaf = Array.from(document.querySelectorAll('div,button,span')).find((el) => {
          const t = (el.innerText || '').trim();
          const r = el.getBoundingClientRect();
          return t === '编辑' && r.height > 20 && r.height < 60 && r.width > 40;
        });
        leaf?.click();
      });
      opened = '더보기-编辑';
      await sleep(1200);
    }
  } else {
    await sleep(1200);
  }
  console.log('time open', opened);

  // delete existing wrong rows
  for (let i = 0; i < 40; i++) {
    const del = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (x) => (x.innerText || '').trim() === '删除' || (x.innerText || '').trim() === '刪除',
      );
      if (!b) return false;
      b.click();
      return true;
    });
    if (!del) break;
    await sleep(150);
  }

  await clickBtn(page, ['重复 小时 添加', '重复时间添加', '반복 시간 추가', '重复添加']);
  await sleep(800);

  const hasGen = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).some((b) =>
      /生成|一代|생성/.test((b.innerText || '').trim()),
    ),
  );
  if (!hasGen) {
    console.log('time UI not opened fully — skip times for now');
    await page.keyboard.press('Escape');
    return false;
  }

  // pick times similar to itami but 08:00
  async function pick(idx, hour, minute) {
    await page.evaluate((i) => {
      const fields = Array.from(document.querySelectorAll('button')).filter((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '选择' || t === '選擇' || /^\d{2}:\d{2}$/.test(t)) && r.height > 0;
      });
      fields[i]?.click();
    }, idx);
    await sleep(400);
    await page.evaluate((h) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === h,
      );
      opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      (opts[0] || Array.from(document.querySelectorAll('div,li,span')).find(
        (el) => (el.innerText || '').trim() === h && el.children.length === 0,
      ))?.click();
    }, hour);
    await sleep(200);
    await page.evaluate((m) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === m,
      );
      opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
      opts[0]?.click();
    }, minute);
    await sleep(300);
  }

  await pick(0, '08', '00');
  await pick(1, '21', '30');
  await clickBtn(page, ['分钟', '分鐘']);
  await sleep(300);
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('[role=option],button,li,div')).find((e) => {
      const t = (e.innerText || '').trim();
      return t === '30' && e.getBoundingClientRect().width > 0;
    });
    el?.click();
  });
  await sleep(300);
  await clickBtn(page, ['生成', '一代', '생성']);
  await sleep(2000);
  await clickBtn(page, ['保存', '节省', '節省', '完成']);
  await sleep(1200);
  return true;
}

async function main() {
  const { page } = await getPage();
  console.log('phase', PHASE, 'start', page.url());

  if (PHASE === 'create' || PHASE === 'all' || PHASE === 'attr') {
    await ensureCreateOrResume(page);
    const id = new URL(page.url()).searchParams.get('id');
    console.log('productId', id);
    if (id) fs.writeFileSync('/tmp/nol-oriental-pearl-id.txt', id);
    await fillAttributes(page);
  }

  if (PHASE === 'intro' || PHASE === 'all') {
    if (!page.url().includes('registration')) {
      /* keep */
    }
    await fillIntro(page);
  }

  if (PHASE === 'regs' || PHASE === 'all') {
    await fillRegs(page);
  }

  if (PHASE === 'options' || PHASE === 'all') {
    if (!page.url().includes('/option')) {
      await clickBtn(page, ['选项管理', '選項管理']);
      await sleep(2500);
    }
    // count existing cards
    let cards = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('div,button')).filter((e) =>
          /판매중|可销售|可供出售|销售中/.test(e.innerText || ''),
        ).length,
    );
    console.log('existing sale badges', cards);
    for (let i = 0; i < OPTIONS.length; i++) {
      // skip if name already on page
      const body = await page.locator('body').innerText();
      if (body.includes(OPTIONS[i].name)) {
        console.log('skip existing', OPTIONS[i].name);
        continue;
      }
      await createOneOption(page, OPTIONS[i], i);
      await sleep(1500);
    }
  }

  // final: never approval
  await tempSave(page);
  const finalBottom = await bottomState(page);
  console.log('FINAL bottom', finalBottom);
  console.log('DONE — stopped without approval. url=', page.url());
  fs.writeFileSync(
    '/tmp/nol-oriental-pearl-result.json',
    JSON.stringify({ url: page.url(), bottom: finalBottom, phase: PHASE }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
