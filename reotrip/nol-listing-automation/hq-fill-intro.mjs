/**
 * 虹桥站 介绍页：韩文案 + 썸네일×3 + NONE + 保存然后
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { killPeerCdpScripts, assertInnerWidthOk, failExit } from './lib/cdp-session.mjs';

const DRAFT = '4128217a-55af-44c6-bbdc-f028eddd7535';
const INTRO_URL = `https://tour.triple.partners/product-management/registration/introduction?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const IMG_DIR = '/Users/mac/nol/upload-ready-images/shanghai-hongqiao-station';
const IMAGES = ['hq-1.jpg', 'hq-2.jpg', 'hq-3.jpg']
  .map((f) => path.join(IMG_DIR, f))
  .filter((f) => fs.existsSync(f));

const CITY_KO = '상하이 시내 호텔';
const DEST_KO = '상하이 훙차오역';
const DEST_KO_SHORT = '상하이 훙차오역';
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('hq-fill-intro');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
if (!page) failExit('no page');
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);
if (!page.url().includes('/introduction')) {
  console.log('【将要】goto introduction');
  await page.goto(INTRO_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
}
console.log('【读回】url', page.url());
console.log('【视口】', await assertInnerWidthOk(page));
console.log('【图片】', IMAGES.length, IMAGES.map((p) => path.basename(p)));
if (IMAGES.length < 3) failExit('images < 3');

console.log('\n【将要】填 headline/highlight/description/checkList/usage');
const fill = async (sel, val, name) => {
  const loc = page.locator(sel).first();
  const n = await loc.count();
  console.log('【元素定位】', name, sel, 'count', n);
  if (!n) return false;
  await loc.fill(val);
  const v = await loc.inputValue().catch(() => '');
  console.log('【读回】', name, 'len', v.length, 'ok', v.length > 10);
  return v.length > 5;
};

await fill('#headline, input[name=headline]', HEADLINE, 'headline');
await fill('#highlight, textarea[name=highlight]', HIGHLIGHT, 'highlight');
await fill('#description, textarea[name=description]', INTRO, 'description');
await fill('#checkList, textarea[name=checkList]', MUST_KNOW, 'checkList');
await fill('#usage, textarea[name=usage]', HOW_TO, 'usage');

console.log('\n【将要】scheduleType NONE');
await page.evaluate(() => {
  const r = document.querySelector('input[name=scheduleType][value=NONE]');
  if (r && !r.checked) (r.closest('label') || r).click();
});
await page.getByText(/没有单独的时间表|沒有單獨的時間表/).first().click().catch(() => {});
await sleep(300);
const sched = await page.evaluate(() => ({
  none: !!document.querySelector('input[name=scheduleType][value=NONE]')?.checked,
}));
console.log('【读回】schedule', sched);

console.log('\n【将要】上传 썸네일 3 图（first file input）');
const fileInputs = page.locator('input[type=file][accept*="image"]');
console.log('【元素定位】file inputs', await fileInputs.count());
// Prefer first under 썸네일 / 상품 이미지
await fileInputs.first().setInputFiles(IMAGES);
console.log('【读回】setInputFiles done, wait upload…');
await sleep(10000);

const imgGate = await page.evaluate(() => {
  const body = document.body.innerText;
  const thumbs = document.querySelectorAll('img').length;
  const red = /必须至少注册 3 个缩略图|必須至少註冊 3 個縮略圖|至少注册 3/.test(body);
  const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  return {
    thumbs,
    red,
    saveDisabled: saveBtn ? !!saveBtn.disabled : null,
    hasHeadline: !!document.querySelector('#headline, input[name=headline]')?.value,
  };
});
console.log('【读回】imgGate', imgGate);

if (imgGate.saveDisabled) {
  // wait more for upload
  await sleep(8000);
  const g2 = await page.evaluate(() => {
    const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      /保存然后/.test(b.innerText || ''),
    );
    return {
      saveDisabled: saveBtn?.disabled,
      red: /必须至少注册 3|必須至少註冊 3/.test(document.body.innerText),
      imgs: document.querySelectorAll('img').length,
    };
  });
  console.log('【读回2】', g2);
  if (g2.saveDisabled) failExit('intro save still disabled');
}

console.log('\n【将要】保存然后');
const saveThen = page.getByRole('button', { name: /保存然后|保存然後/ }).first();
console.log('【元素定位】disabled', await saveThen.isDisabled());
await saveThen.click({ timeout: 15000 });
await sleep(4000);
console.log('【读回】url', page.url());
const ok = page.url().includes('/regulations');
console.log('【结果】', ok ? 'PASS → regulations' : 'FAIL');
process.exit(ok ? 0 : 2);
