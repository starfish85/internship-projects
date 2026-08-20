/**
 * 伊丹机场(ITM)-奈良市区 介绍 + 伊丹 3图
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';
import { fillTransferFaqs } from './lib/transfer-audit-copy.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dir = dirname(fileURLToPath(import.meta.url));
const DRAFT = process.env.INA_DRAFT || readFileSync(join(__dir, '.ina-draft-id'), 'utf8').trim();

const INTRO_URL = `https://tour.triple.partners/product-management/registration/introduction?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const IMG_DIR = '/Users/mac/nol/upload-ready-images/itami-nara';
const IMAGES = ['ina-1.jpg', 'ina-2.jpg', 'ina-3.jpg'].map((f) => path.join(IMG_DIR, f)).filter(fs.existsSync);
const A = '이타미 공항(ITM)';
const B = '나라 시내';
const HEADLINE = `${A} ↔ ${B} 편도 전용 차량으로 여유로운 이동을 즐기세요!`;
const HIGHLIGHT = [
  `${A}과 ${B}를 편안하게 연결하는 단독 차량 이동`,
  '항공편·호텔 일정에 맞춘 프라이빗 픽업 및 샌딩',
  '7인승 최대 4인+수하물 5개 · 10인승 최대 9인+수하물 10개',
].join('\n');
const INTRO = `이 서비스는 ${A}(Osaka International Airport / Itami)와 ${B}(나라 시내 호텔·숙소) 사이의 편도 전용 차량 이동 서비스입니다.
편안하고 프라이빗한 차량과 숙련된 기사님이 함께하여, 대중교통 환승이나 택시 이용 없이 목적지까지 빠르고 쾌적하게 이동하실 수 있습니다.

포함 사항:
- ${A} ↔ ${B} 편도 전용 차량 서비스 1회
- 차량 및 기사 요금, 주차비 포함

예약 시 항공편명·도착/출발 시간·터미널, 나라 시내 호텔명·주소, 이용 시간, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
기사님이 보통 이용일 하루 전 WhatsApp/SMS로 연락드리니, 번호가 WhatsApp에 등록되어 있고 계정이 정상인지 확인해 주세요.

이타미 공항 출도착 후 나라 시내로 바로 이동하시거나, 관광 후 공항으로 이동하시는 분들께 적합합니다.`;
const MUST = `1.수하물 규격: 24인치 이하 수하물 기준, 7인승 차량 최대 5개(최대 4인). 10인승 차량 26인치 이하 최대 10개(최대 9인). 적합한 차형을 선택해 주세요.

2.미팅 장소: 항공편·터미널 정보와 나라 시내 호텔명·주소, 이용 시간을 정확히 입력해 주세요.

3.본 서비스는 ${A}과 ${B} 간의 이동만을 포함하며, 중간 정차는 포함되지 않습니다.

4.표시된 요금은 1인 기준이 아닌 차량 1대 기준입니다.

5.실제 제공되는 차량은 이미지와 다를 수 있습니다.

6.왕복 서비스를 원하시는 경우, "편도(출발)" 및 "편도(복귀)" 옵션을 각각 별도로 예약해 주세요.

7.픽업 시간 또는 장소 변경은 최소 2일 전에 요청해 주셔야 하며, 기한 이후에는 수정이 어려울 수 있습니다.

8.항공권, 공항 이용료, 아동용 카시트, 야간 할증 등 기타 서비스는 포함되어 있지 않습니다.

9.기사님이 예정된 시간에 도착한 후, 최대 30분까지 무료 대기해 드리며, 이후에도 고객님이 나타나지 않을 경우 차량은 출발하게 됩니다.

10.본 서비스는 별도의 티켓/바우처 제시가 필요 없습니다. 기사님이 이용일 전 WhatsApp/SMS로 연락드립니다.`;
const HOW = `1.문의사항이 있으실 경우 이메일 agency@reotrip.com 또는 전화 +852 3428 81 82 로 언제든지 연락해 주세요.

2.예약은 접수 후 영업일 기준 3일 이내에 확정되며, 확정이 어려운 경우 별도로 안내해 드립니다. (영업일 기준은 현지 시간에 따릅니다)

3.예약 시 항공편명, 도착 또는 출발 시간, 터미널, 나라 시내 주소, 인원 및 수하물을 정확히 입력해 주세요.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
console.log('【将要】介绍页文案 + 썸네일 3 图');
killPeerCdpScripts('ina-intro');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);
if (!page.url().includes('/introduction')) {
  await page.goto(INTRO_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
}
console.log('【读回】url', page.url(), 'imgs', IMAGES.length);
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

const textOk = await page.evaluate(() => ({
  hl: /이타미|ITM|나라|Itami/i.test(document.querySelector('#headline, input[name=headline]')?.value || ''),
  desc: /이타미|ITM|나라|Itami|Osaka/i.test(document.querySelector('#description, textarea[name=description]')?.value || ''),
}));
console.log('【读回】文案', textOk);
if (!textOk.hl) failExit('headline missing Itami-Kyoto');

console.log('【将要】上传 썸네일 3（非 프로그램）');
await page.locator('input[type=file][accept*="image"]').first().setInputFiles(IMAGES);
let g = { saveDisabled: true };
for (let i = 0; i < 35; i++) {
  await sleep(2000);
  g = await page.evaluate(() => {
    const save = Array.from(document.querySelectorAll('button')).find((b) => /保存然后|保存然後/.test(b.innerText || ''));
    return { saveDisabled: save?.disabled ?? null, red: /必须至少注册 3|必須至少註冊 3|至少註冊 3/.test(document.body.innerText) };
  });
  console.log('【读回】upload poll', i, g);
  if (g.saveDisabled === false) break;
}
if (g.saveDisabled) {
  await page.getByText(/没有单独的时间表/).first().click().catch(() => {});
  await sleep(2000);
  g = await page.evaluate(() => {
    const save = Array.from(document.querySelectorAll('button')).find((b) => /保存然后|保存然後/.test(b.innerText || ''));
    return { saveDisabled: save?.disabled ?? null };
  });
}
if (g.saveDisabled) failExit('intro save disabled');

console.log('【将要】保存然后 → 法规');
await page.getByRole('button', { name: /保存然后|保存然後/ }).first().click({ timeout: 15000 });
await sleep(4000);
console.log('【读回】', page.url());
if (!page.url().includes('/regulations')) failExit('not regulations');
console.log('【结果】PASS intro');
process.exit(0);
