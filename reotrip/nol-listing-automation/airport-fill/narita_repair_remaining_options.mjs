import { chromium } from 'playwright';

const include = '도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동 및 주차비 포함';
const exclude = '항공권 / 아동용 카시트 / 야간 할증 / 개인 경비 / 팁 / 기타 추가 서비스';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
await page.setViewportSize({ width: 960, height: 900 });

async function optionScroller() {
  return page.evaluate(() => {
    const scroller = Array.from(document.querySelectorAll('div'))
      .find((el) => String(el.className).includes('action-popup__ScrollContainer'));
    if (!scroller) throw new Error('Option scroll container not found');
    return { scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight };
  });
}

async function setOptionScroll(y) {
  await page.evaluate((top) => {
    const scroller = Array.from(document.querySelectorAll('div'))
      .find((el) => String(el.className).includes('action-popup__ScrollContainer'));
    if (scroller) scroller.scrollTop = top;
  }, y);
  await page.waitForTimeout(250);
}

async function openOption(index) {
  const edits = page.getByText('옵션 수정하기', { exact: true });
  await edits.nth(index).click();
  await page.waitForTimeout(1400);
  await optionScroller();
}

async function fillIncludeExclude() {
  await setOptionScroll(1220);
  await page.locator('button[aria-label="more"]').click();
  await page.waitForTimeout(250);
  await page.getByText('编辑', { exact: true }).last().click();
  await page.waitForTimeout(600);

  if (await page.locator('#inclusions_TRANSPORTATION_description').count() === 0) {
    await page.getByText('運輸', { exact: true }).last().click();
    await page.waitForTimeout(300);
  }
  await page.locator('#inclusions_TRANSPORTATION_description').fill(include);
  await page.locator('#exclusions').fill(exclude);
  await page.getByText('節省', { exact: true }).last().click();
  await page.waitForTimeout(900);
}

async function selectTime(buttonIndexAmongVisibleSelects, hour, minute) {
  await page.locator('button').filter({ hasText: '选择' }).nth(buttonIndexAmongVisibleSelects).click();
  await page.waitForTimeout(250);
  await page.locator('li[role="option"]').filter({ hasText: new RegExp(`^${hour}$`) }).last().click();
  await page.waitForTimeout(80);
  if (minute) {
    await page.locator('li[role="option"]').filter({ hasText: new RegExp(`^${minute}$`) }).last().click();
    await page.waitForTimeout(80);
  }
  const confirm = page.getByText('確定', { exact: true }).last();
  if (await confirm.count()) {
    await confirm.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function repairTimeSlots() {
  await setOptionScroll(1220);
  await page.locator('button[aria-label="더 보기"]').click();
  await page.waitForTimeout(250);
  await page.getByText('编辑', { exact: true }).last().click();
  await page.waitForTimeout(700);

  // Remove any stale single time row. If a generated list already exists, this loop is skipped after repairs.
  for (let guard = 0; guard < 40; guard += 1) {
    const enabledDelete = page.getByText('刪除', { exact: true }).filter({ hasNotText: '' }).last();
    const count = await page.getByText('刪除', { exact: true }).count();
    if (count === 0) break;
    const buttons = await page.locator('button').evaluateAll((all) => all.map((b, i) => ({
      i,
      text: (b.innerText || '').trim(),
      disabled: b.disabled,
      visible: (() => {
        const r = b.getBoundingClientRect();
        const s = getComputedStyle(b);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      })(),
    })).filter((b) => b.text === '刪除' && b.visible && !b.disabled));
    if (!buttons.length) break;
    await page.locator('button').nth(buttons[buttons.length - 1].i).click();
    await page.waitForTimeout(120);
  }

  await page.getByText('반복 시간 추가', { exact: true }).last().click();
  await page.waitForTimeout(500);
  await selectTime(0, '07', null);
  await selectTime(0, '21', '30');
  await page.locator('button').filter({ hasText: '分鐘' }).last().click();
  await page.waitForTimeout(200);
  await page.locator('li[role="option"]').filter({ hasText: /^30$/ }).last().click();
  await page.waitForTimeout(100);
  const confirm = page.getByText('確定', { exact: true }).last();
  if (await confirm.count()) await confirm.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(250);

  await page.getByText('생성', { exact: true }).last().click();
  await page.waitForTimeout(800);
  const popupTimes = await page.evaluate(() => {
    const text = document.body.innerText;
    const expected = [];
    for (let h = 7; h <= 21; h += 1) {
      expected.push(`${String(h).padStart(2, '0')}:00`);
      if (h !== 21) expected.push(`${String(h).padStart(2, '0')}:30`);
    }
    expected.push('21:30');
    const uniqueExpected = Array.from(new Set(expected));
    return {
      uniqueExpected,
      missing: uniqueExpected.filter((time) => !text.includes(time)),
    };
  });
  if (popupTimes.missing.length) throw new Error(`Missing generated times: ${popupTimes.missing.join(', ')}`);

  await page.getByText('節省', { exact: true }).last().click();
  await page.waitForTimeout(900);
}

async function saveOption() {
  const count = await page.locator('button').filter({ hasText: '下個' }).count();
  await page.locator('button').filter({ hasText: '下個' }).nth(count - 1).click();
  await page.waitForTimeout(1800);
}

const start = Number(process.argv[2] || '1');
const end = Number(process.argv[3] || '3');
const results = [];
for (let index = start; index <= end; index += 1) {
  await openOption(index);
  const name = await page.locator('input[name="name"]').inputValue();
  await fillIncludeExclude();
  await repairTimeSlots();
  await saveOption();
  results.push({ index, name, status: 'saved' });
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
