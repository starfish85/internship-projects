/**
 * Fill intro fields by id/name with Playwright fill + images + NONE.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IMG_DIR = '/Users/mac/nol/upload-ready-images/shanghai-oriental-pearl';
const IMAGES = ['oriental-pearl-1.jpg', 'oriental-pearl-2.jpg', 'oriental-pearl-3.jpg']
  .map((f) => path.join(IMG_DIR, f))
  .filter((f) => fs.existsSync(f));

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

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
console.log('URL', page.url());
await page.bringToFront().catch(() => {});

// Fill fields with Playwright native fill (works with React)
async function fillBy(sel, val, label) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) {
    console.log(label, 'NOT FOUND', sel);
    return false;
  }
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ force: true });
  await loc.fill(val);
  console.log(label, 'ok len=', val.length);
  return true;
}

await fillBy('#headline, input[name=headline]', HEADLINE, 'headline');
await fillBy('#highlight, textarea[name=highlight]', HIGHLIGHT, 'highlight');
await fillBy('#description, textarea[name=description]', INTRO, 'description');
await fillBy('#checkList, textarea[name=checkList]', MUST_KNOW, 'checkList');
await fillBy('#usage, textarea[name=usage]', HOW_TO, 'usage');

// Schedule NONE — click label
await page.evaluate(() => {
  const radio = document.querySelector('input[name=scheduleType][value=NONE]');
  if (radio) {
    const label = radio.closest('label') || radio.parentElement;
    label?.click();
    radio.click();
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
});
// also mouse click visible text
const noneLabel = page.getByText(/没有单独的时间表|沒有單獨的時間表/);
if ((await noneLabel.count()) > 0) {
  await noneLabel.first().click({ force: true });
  console.log('clicked NONE label');
}
await sleep(400);
const sched = await page.evaluate(
  () => document.querySelector('input[name=scheduleType][value=NONE]')?.checked,
);
console.log('schedule NONE checked?', sched);

// Upload 3 images to first file input (缩略图)
console.log('images', IMAGES);
const fi = page.locator('input[type=file][accept*="image"]').first();
await fi.setInputFiles(IMAGES);
console.log('setInputFiles done');
await sleep(8000);

// Verify
const state = await page.evaluate(() => {
  const g = (sel) => {
    const el = document.querySelector(sel);
    return el ? { len: (el.value || '').length, head: (el.value || '').slice(0, 30) } : null;
  };
  const imgs = Array.from(document.querySelectorAll('img')).filter((img) => {
    const r = img.getBoundingClientRect();
    return r.width > 50 && r.height > 50;
  });
  const redMsgs = [];
  document.querySelectorAll('p, span, div').forEach((el) => {
    if (el.children.length > 2) return;
    const cs = getComputedStyle(el);
    const m = cs.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const txt = (el.innerText || '').trim();
    if (!txt || txt.length > 80) return;
    if (m && +m[1] > 180 && +m[2] < 100 && +m[3] < 100) redMsgs.push(txt);
  });
  const saveThen = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  return {
    headline: g('#headline'),
    highlight: g('#highlight'),
    description: g('#description'),
    checkList: g('#checkList'),
    usage: g('#usage'),
    none: document.querySelector('input[name=scheduleType][value=NONE]')?.checked,
    imgCount: imgs.length,
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
  };
});
console.log('STATE', JSON.stringify(state, null, 2));

if (state.saveThenDisabled === false) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).click();
  console.log('✓ 保存然后');
  await sleep(3500);
  console.log('AFTER', page.url());
} else {
  // temp save at least
  const temp = page.getByRole('button', { name: /临时保存|臨時存儲/ });
  if ((await temp.count()) > 0 && !(await temp.first().isDisabled())) {
    await temp.first().click();
    console.log('temp saved');
    await sleep(2000);
  }
  console.log('save-then still disabled');
}

process.exit(0);
