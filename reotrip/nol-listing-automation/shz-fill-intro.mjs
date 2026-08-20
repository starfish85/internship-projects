import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';
import { fillTransferFaqs } from './lib/transfer-audit-copy.mjs';

const DRAFT = '0bd5b8fb-991f-4313-b798-3a9a4d6bd060';
const INTRO_URL = `https://tour.triple.partners/product-management/registration/introduction?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const IMG_DIR = '/Users/mac/nol/upload-ready-images/shanghai-railway-station';
const IMAGES = ['shz-1.jpg', 'shz-2.jpg', 'shz-3.jpg'].map((f) => path.join(IMG_DIR, f)).filter(fs.existsSync);
const CITY = '상하이 시내 호텔';
const DEST = '상하이역';
const HEADLINE = `${CITY} ↔ ${DEST} 편도 전용 차량으로 여유로운 이동을 즐기세요!`;
const HIGHLIGHT = [
  `${CITY}과 ${DEST}을 편안하게 연결하는 단독 차량 이동`,
  '기차 출발/도착 일정에 맞춘 프라이빗 픽업 및 샌딩',
  '7인승 차량 · 최대 4인 + 수하물 3~5개(24인치 이하)',
].join('\n');
const INTRO = `이 서비스는 ${CITY}과 ${DEST}(上海火车站 / Shanghai Railway Station) 사이의 편도 전용 차량 이동 서비스입니다.
편안하고 프라이빗한 차량과 숙련된 기사님이 함께하여, 대중교통 환승이나 택시 이용 없이 목적지까지 빠르고 쾌적하게 이동하실 수 있습니다.

포함 사항:
- ${CITY} ↔ ${DEST} 편도 전용 차량 서비스 1회
- 차량 및 기사 요금, 주차비 포함

예약 시 상하이 시내 호텔명/주소, 픽업 장소·시간, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
기사님이 보통 이용일 하루 전 WhatsApp/SMS로 연락드리니, 번호가 WhatsApp에 등록되어 있고 계정이 정상인지 확인해 주세요.

가족, 출장, 소규모 그룹 등 상하이역을 이용하시는 분들께 적합합니다.`;
const MUST = `1.수하물 규격: 24인치 이하 수하물 기준, 7인승 차량 3~5개 적재 가능.

2.미팅 장소: 호텔 픽업 시 기사님이 호텔 로비에서 픽업해 드립니다. 역 픽업 시 출구/만남의 장소를 정확히 입력해 주세요.

3.본 서비스는 호텔(또는 도심)과 ${DEST} 간의 이동만을 포함하며, 중간 정차는 포함되지 않습니다.

4.표시된 요금은 차량 1대 기준입니다.

5.왕복 시 "편도(출발)" 및 "편도(복귀)" 옵션을 각각 예약해 주세요.

6.픽업 시간/장소 변경은 최소 2일 전 요청해 주세요.

7.아동용 카시트, 야간 할증 등은 포함되어 있지 않습니다.

8.기사님 도착 후 최대 30분 무료 대기합니다.

9.별도 티켓/바우처 제시가 필요 없습니다.`;
const HOW = `1.문의: agency@reotrip.com / +852 3428 81 82

2.예약은 영업일 기준 3일 이내 확정됩니다.

3.호텔 정보, 픽업 시간/장소, 인원 및 수하물을 정확히 입력해 주세요.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('shz-intro');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
if (!page.url().includes('/introduction')) {
  await page.goto(INTRO_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
}
console.log('url', page.url(), 'imgs', IMAGES.length);
if (IMAGES.length < 3) failExit('images < 3');

await page.locator('#headline, input[name=headline]').first().fill(HEADLINE);
await page.locator('#highlight, textarea[name=highlight]').first().fill(HIGHLIGHT);
await page.locator('#description, textarea[name=description]').first().fill(INTRO);
await page.locator('#checkList, textarea[name=checkList]').first().fill(MUST).catch(() => {});
await page.locator('#usage, textarea[name=usage]').first().fill(HOW).catch(() => {});

// §57 audit: mandatory mid-stop FAQ on all private transfers
try {
  const faqRb = await fillTransferFaqs(page);
  console.log('【结果】FAQ mid-stop fill', faqRb);
} catch (e) {
  console.log('【结果】FAQ fill skip/err', String(e?.message || e));
}

await page.evaluate(() => {
  const r = document.querySelector('input[name=scheduleType][value=NONE]');
  if (r && !r.checked) (r.closest('label') || r).click();
});
await page.getByText(/没有单独的时间表/).first().click().catch(() => {});

console.log('【将要】上传 썸네일 3');
await page.locator('input[type=file][accept*="image"]').first().setInputFiles(IMAGES);
await sleep(12000);
const g = await page.evaluate(() => {
  const save = Array.from(document.querySelectorAll('button')).find((b) => /保存然后/.test(b.innerText || ''));
  return {
    saveDisabled: save?.disabled,
    red: /必须至少注册 3|必須至少註冊 3/.test(document.body.innerText),
    imgs: document.querySelectorAll('img').length,
  };
});
console.log('【读回】', g);
if (g.saveDisabled) {
  await sleep(8000);
}
const save = page.getByRole('button', { name: /保存然后|保存然後/ }).first();
if (await save.isDisabled()) failExit('intro save disabled');
await save.click({ timeout: 15000 });
await sleep(4000);
console.log('【读回】', page.url());
process.exit(page.url().includes('/regulations') ? 0 : 2);
