/**
 * Japan transfer audit helpers — §43 element locate, §48 save, never 提交审核.
 * ① price (Excel HKD) ② times 07:00–21:30×30 ③ reservation fields
 */
import { setTimesChinaOnOption, readTimesCompact, dismissLeave, SetTimesStepError } from './set-times-china.mjs';

export const JAPAN_TIMES = Object.freeze({
  startHour: '07',
  startMin: '00',
  endHour: '21',
  endMin: '30',
  expectCount: 30,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function dismiss(page) {
  await dismissLeave(page);
  await page.getByText(/^消除$/).first().click({ timeout: 400 }).catch(() => {});
}

export function optionUrl(id) {
  return `https://tour.triple.partners/product-management/registration/option?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}
export function regsUrl(id) {
  return `https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

/** Read option list card texts + open each option and read price input / compact times */
export async function auditOptions(page, draftId) {
  const list = optionUrl(draftId);
  await dismiss(page);
  await page.goto(list, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  await dismiss(page);

  const mods = page.getByRole('button', { name: /修改选项|修改選項/ });
  const n = await mods.count();
  const out = [];
  for (let i = 0; i < n; i++) {
    await page.goto(list, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1800);
    await dismiss(page);
    const btn = page.getByRole('button', { name: /修改选项|修改選項/ }).nth(i);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await sleep(2200);
    // wait form
    for (let w = 0; w < 25; w++) {
      const v = await page.locator('#name').inputValue().catch(() => '');
      if (v) break;
      await sleep(200);
    }
    const name = await page.locator('#name').inputValue().catch(() => '');
    const tv = await readTimesCompact(page).catch(() => ({ count: 0, first: null, last: null, raw: '' }));
    // scroll price/calendar section into view
    await page.getByText(/销售日历|銷售日曆|期间选择|期間選擇/).first().scrollIntoViewIfNeeded().catch(() => {});
    await sleep(300);
    // read calendar day\\nprice samples (skill: container 日\\n价)
    const cal = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      const pairs = [];
      const re = /(?:^|\n)(\d{1,2})\n(\d{2,5})(?=\n|$)/g;
      let m;
      while ((m = re.exec(body)) && pairs.length < 40) {
        pairs.push({ day: m[1], price: m[2] });
      }
      // unique prices
      const prices = [...new Set(pairs.map((p) => String(p.price).replace(/,/g,'')))];
      // also look for chips like 7인승
      const chips = Array.from(document.querySelectorAll('button,div,span'))
        .map((e) => (e.innerText || '').trim())
        .filter((t) => /인승|座/.test(t) && t.length < 20)
        .slice(0, 8);
      return { pairs: pairs.slice(0, 12), prices, chips };
    });
    // dominant calendar price
    const price2 = cal.prices.length === 1 ? cal.prices[0] : cal.prices[0] || '';
    out.push({
      i,
      name: name.slice(0, 80),
      price: price2,
      calPrices: cal.prices,
      calSample: cal.pairs.slice(0, 5),
      times: tv,
      timesOk: tv.count === 30 && tv.first === '07:00' && tv.last === '21:30',
    });
    // leave without save if clean — click 下一个 if enabled else escape+消除
    const next = page.locator('button').filter({ hasText: /^下一个$|^下個$/ }).first();
    if (await next.isEnabled().catch(() => false)) {
      await next.click().catch(() => {});
      await sleep(1200);
    } else {
      await page.keyboard.press('Escape').catch(() => {});
      await dismiss(page);
    }
  }
  return out;
}

/**
 * Set normal price on option i to target HKD (fill price field + tempSaveNext).
 * Assumes ONE_YEAR period already exists.
 */
export async function fixOptionPrice(page, draftId, optionIndex, targetPrice) {
  const list = optionUrl(draftId);
  const target = String(targetPrice);
  await dismiss(page);
  await page.goto(list, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(optionIndex).click();
  await sleep(2200);
  for (let w = 0; w < 25; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await sleep(200);
  }
  const name = await page.locator('#name').inputValue().catch(() => '');
  console.log(`  【将要】改价 option${optionIndex} → ${target}`, name.slice(0, 40));

  // find price input
  let filled = false;
  const candidates = [
    page.getByPlaceholder(/请输入价格|請輸入價格/),
    page.locator('input[placeholder*="价格"]'),
    page.locator('input[placeholder*="價格"]'),
  ];
  for (const loc of candidates) {
    if (await loc.count()) {
      const el = loc.first();
      const dis = await el.isDisabled().catch(() => true);
      if (dis) {
        // need sale period first
        const year = page.locator('input[value="ONE_YEAR"], label').filter({ hasText: /1年|一年/ });
        await page.getByText(/1年|一年/).first().click({ timeout: 2000 }).catch(() => {});
        await sleep(500);
      }
      await el.click({ force: true }).catch(() => {});
      await el.fill('');
      await el.fill(target);
      filled = true;
      break;
    }
  }
  if (!filled) {
    filled = await page.evaluate((val) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const p = inputs.find((el) => /价格|價格|請輸入|请输入/.test(el.placeholder || ''));
      if (!p) return false;
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      desc.set.call(p, val);
      p.dispatchEvent(new Event('input', { bubbles: true }));
      p.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, target);
  }
  const read = await page.getByPlaceholder(/请输入价格|請輸入價格/).inputValue().catch(() =>
    page.evaluate(() => {
      const p = Array.from(document.querySelectorAll('input')).find((el) =>
        /价格|價格/.test(el.placeholder || ''),
      );
      return p ? p.value : '';
    }),
  );
  console.log('  【读回】price input', read);

  // close any price-type sheet intercepting footer
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);
  // temp save via evaluate (avoid overlay intercept)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { el: b, t: (b.innerText || '').trim(), d: b.disabled, w: r.width, y: r.y };
      })
      .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d && x.w > 40)
      .sort((a, b) => a.w - b.w || b.y - a.y);
    btns[0]?.el.click();
  });
  await sleep(2200);
  // next
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { el: b, t: (b.innerText || '').trim(), d: b.disabled, w: r.width, y: r.y };
      })
      .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d && x.w > 80)
      .sort((a, b) => b.w - a.w);
    btns[0]?.el.click();
  });
  await sleep(2000);
  await dismiss(page);
  return { name, read, target, ok: String(read).replace(/,/g, '') === target || String(read).includes(target) };
}

export async function fixOptionTimes(page, draftId, optionIndex) {
  const list = optionUrl(draftId);
  console.log(`  【将要】时段 option${optionIndex} 07:00–21:30×30`);
  const r = await setTimesChinaOnOption(page, {
    listUrl: list,
    optionIndex,
    timesOpts: JAPAN_TIMES,
  });
  console.log('  【结果】times', r.tv);
  return r;
}

/** Airport vs hub reservation id sets */
export const RESV_AIRPORT = [
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

export const RESV_HUB = [
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
  'BOOKED_TIME-required',
  'KAKAO_TALK_ID-required',
  'MESSAGING_APP_ID-required',
  'NUMBER_OF_PEOPLE-required',
  'NUMBER_OF_SUITCASES-required',
];

export async function readResvSummary(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    const empty = /您必須輸入代表|须填写「代表预约|必须输入代表/.test(body);
    // summary block often under 代表预约
    const idx = body.indexOf('代表预约');
    const slice = idx >= 0 ? body.slice(idx, idx + 500) : body.slice(0, 800);
    return {
      emptyHint: empty,
      hasPhone: /电话|手機|手机|電話|CELL/i.test(slice),
      hasFlight: /航班|항공|flight/i.test(slice),
      slice: slice.slice(0, 200),
    };
  });
}

export async function fixReservation(page, draftId, ids) {
  await dismiss(page);
  await page.goto(regsUrl(draftId), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  await dismiss(page);

  // open modal
  const entry = page.getByText(/代表预约信息|代表預約信息|代表预订信息/).first();
  await entry.scrollIntoViewIfNeeded().catch(() => {});
  await entry.click({ timeout: 5000 }).catch(() => {});
  await sleep(800);
  // if not open, try button nearby
  if (!(await page.locator(`label[for="${ids[0]}"]`).count())) {
    await page.locator('button').filter({ hasText: /选择|選擇|添加|設定|设置/ }).first().click({ timeout: 2000 }).catch(() => {});
    await sleep(600);
  }

  for (const rid of ids) {
    const lab = page.locator(`label[for="${rid}"]`);
    if (!(await lab.count())) {
      // scroll sheet
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: 'center' });
        else {
          const sc = Array.from(document.querySelectorAll('*')).filter((e) => {
            const s = getComputedStyle(e);
            return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 40;
          });
          sc.sort((a, b) => b.clientHeight - a.clientHeight);
          if (sc[0]) sc[0].scrollTop += 200;
        }
      }, rid);
      await sleep(200);
    }
    // use getElementById via evaluate for checked
    const state = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return { found: false };
      return { found: true, checked: !!el.checked };
    }, rid);
    if (!state.found) {
      // try scroll more and retry once
      await page.evaluate(() => {
        const sc = Array.from(document.querySelectorAll('*')).filter((e) => {
          const s = getComputedStyle(e);
          return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 40;
        });
        sc.sort((a, b) => b.clientHeight - a.clientHeight);
        if (sc[0]) sc[0].scrollTop += 240;
      });
      await sleep(250);
    }
    const st2 = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return { found: false, checked: false };
      if (el.checked) return { found: true, checked: true };
      const lab = document.querySelector(`label[for="${id}"]`);
      (lab || el).click();
      return { found: true, checked: !!el.checked, id };
    }, rid);
    if (st2.found && !st2.checked) {
      await page.locator(`label[for="${rid}"]`).click({ timeout: 1500 }).catch(() => {});
    }
  }

  // 已选
  await page.getByText(/^已选$|^已選$/).first().click({ timeout: 4000 }).catch(() => {});
  await sleep(800);
  const summary = await readResvSummary(page);
  console.log('  【读回】预约摘要', summary);

  // save then or temp
  const tmp = page.locator('button').filter({ hasText: /^临时保存$|^臨時存儲$/ }).first();
  if (await tmp.isEnabled().catch(() => false)) {
    await tmp.click();
    await sleep(2000);
  }
  const st = page.locator('button').filter({ hasText: /^保存然后$|^保存然後$/ }).first();
  if (await st.isEnabled().catch(() => false)) {
    await st.click();
    await sleep(2200);
  }
  return summary;
}
