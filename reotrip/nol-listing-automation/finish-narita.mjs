/**
 * Finish Narita NRT draft: includes, times, images verify, temp-save only.
 * NEVER click 批准請求 / 승인 요청
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PRODUCT_ID = '60557c54-6c11-4b0e-9e04-df85c0d3e78b';
const BASE = 'https://tour.triple.partners/product-management/registration';
const PRODUCT_NAME = '도쿄 시내 호텔 ↔ 나리타공항(NRT) 단독 차량 편도 이동 서비스';
const INTERNAL_NAME = '东京市区-成田机场(NRT)';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/narita-airport';
const IMAGES = ['narita-1.jpg', 'narita-2.jpg', 'narita-3.jpg'].map((f) => path.join(IMG_DIR, f));

const INCLUDE_TRANSPORT =
  '도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동 및 주차비 포함';
const INCLUDE_PICKUP = '픽업/샌딩 서비스 및 주차비 포함';
const EXCLUDE =
  '항공권, 공항 이용료, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

const OPTIONS = [
  {
    name: '도쿄 시내 호텔 출발 → 나리타공항(NRT) 편도 이동 (7인승 차량)',
    price: '112',
  },
  {
    name: '도쿄 시내 호텔 출발 → 나리타공항(NRT) 편도 이동 (10인승 차량)',
    price: '175',
  },
  {
    name: '나리타공항(NRT) 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)',
    price: '112',
  },
  {
    name: '나리타공항(NRT) 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)',
    price: '175',
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage(browser) {
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().includes('tour.triple.partners'));
  if (!page) throw new Error('no NOL tab');
  await page.bringToFront();
  return page;
}

async function tempSave(page) {
  const bad = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => /批准請求|승인 요청|提交審核/.test((b.innerText || '').trim()))
      .map((b) => b.innerText.trim()),
  );
  console.log('approval buttons present (NOT clicking):', bad);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return {
          i,
          text: (b.innerText || '').trim(),
          disabled: b.disabled,
          y: Math.round(r.y),
        };
      })
      .filter((b) => b.text === '臨時存儲' && !b.disabled)
      .sort((a, b) => b.y - a.y);
    if (buttons[0]) {
      document.querySelectorAll('button')[buttons[0].i].click();
    }
  });
  await sleep(2500);
  const t = await page.locator('body').innerText();
  console.log('temp save toast?', /임시저장|暂时保存|臨時|저장되었습니다|저장됐/.test(t));
}

async function dismissOverlays(page) {
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
  }
  // leave-confirm dialogs
  await page.evaluate(() => {
    const leave = Array.from(document.querySelectorAll('button')).find((b) =>
      /离开|나가기|离开页面|確認离开|确认|確認|예|离开而不|저장하지/.test((b.innerText || '').trim()),
    );
    // only click leave-style if dialog visible with leave wording
    const body = document.body.innerText || '';
    if (/离开|변경 사항|未保存|저장하지/.test(body) && leave) leave.click();
  });
  await sleep(500);
}

async function clickExactButton(page, texts) {
  const list = Array.isArray(texts) ? texts : [texts];
  return page.evaluate((list) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const t of list) {
      const b = buttons.find((x) => (x.innerText || '').trim() === t && !x.disabled);
      if (b) {
        b.click();
        return t;
      }
    }
    // partial includes
    for (const t of list) {
      const b = buttons.find((x) => (x.innerText || '').includes(t) && !x.disabled);
      if (b) {
        b.click();
        return (b.innerText || '').trim();
      }
    }
    return null;
  }, list);
}

async function setTimeSlots(page) {
  // Open time modal if not open
  let body = await page.locator('body').innerText();
  if (!body.includes('반복 시간 추가') && !body.includes('생성')) {
    await clickExactButton(page, ['設定時間', '시간 설정']);
    await sleep(1200);
  }
  body = await page.locator('body').innerText();
  if (!body.includes('반복 시간 추가')) {
    console.log('time modal not open');
    return { ok: false, reason: 'no modal' };
  }

  // Ensure 반복 tab
  await page.getByText('반복 시간 추가', { exact: true }).click({ force: true }).catch(() => {});
  await sleep(800);

  // Helper: click li role=option or visible text node for hour/minute
  async function pickTime(which /* start|end */, hour, minute) {
    // which: 0 = first select, 1 = second select
    const selectBtns = page.locator('button').filter({ hasText: /^选择$/ });
    // also time-looking buttons
    const timeBtns = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    const nSelect = await selectBtns.count();
    const nTime = await timeBtns.count();
    console.log(`pick ${which} ${hour}:${minute} select=${nSelect} timeBtns=${nTime}`);

    if (which === 'start') {
      if (nSelect > 0) await selectBtns.nth(0).click({ force: true });
      else if (nTime > 0) await timeBtns.nth(0).click({ force: true });
    } else {
      if (nSelect >= 2) await selectBtns.nth(1).click({ force: true });
      else if (nTime >= 2) await timeBtns.nth(1).click({ force: true });
      else if (nSelect === 1) await selectBtns.nth(0).click({ force: true });
      else if (nTime === 1) await timeBtns.nth(0).click({ force: true });
    }
    await sleep(500);

    // Prefer role=option
    const hourOpt = page.getByRole('option', { name: hour, exact: true });
    if (await hourOpt.count()) {
      // pick leftmost if multiple
      await hourOpt.first().click({ force: true });
    } else {
      await page.evaluate((h) => {
        const els = Array.from(document.querySelectorAll('[role=option],li,div,button,span')).filter(
          (el) =>
            (el.innerText || '').trim() === h &&
            el.children.length === 0 &&
            el.getBoundingClientRect().width > 0 &&
            el.getBoundingClientRect().height > 0,
        );
        els.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
        els[0]?.click();
      }, hour);
    }
    await sleep(250);

    const minOpt = page.getByRole('option', { name: minute, exact: true });
    if (await minOpt.count()) {
      // rightmost for minutes column
      const c = await minOpt.count();
      await minOpt.nth(c - 1).click({ force: true });
    } else {
      await page.evaluate((m) => {
        const els = Array.from(document.querySelectorAll('[role=option],li,div,button,span')).filter(
          (el) =>
            (el.innerText || '').trim() === m &&
            el.children.length === 0 &&
            el.getBoundingClientRect().width > 0 &&
            el.getBoundingClientRect().height > 0,
        );
        els.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
        els[0]?.click();
      }, minute);
    }
    await sleep(400);

    // If dropdown still open, try 確定 but only inside dropdown — skip if auto-closed
    const still = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role=listbox],[role=option]')).some(
        (el) => el.getBoundingClientRect().height > 0,
      );
    });
    if (still) {
      // try dropdown confirm carefully
      await page.evaluate(() => {
        const opts = Array.from(document.querySelectorAll('[role=option]'));
        if (!opts.length) return;
        // do not click modal 節省; only small confirm near list
        const conf = Array.from(document.querySelectorAll('button')).find((b) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return (t === '確定' || t === '확인') && r.width < 120 && r.y > 200;
        });
        conf?.click();
      });
      await sleep(300);
    }
  }

  await pickTime('start', '07', '00');
  // verify not 00:00
  let mid = await page.locator('body').innerText();
  console.log('after start, has 07:00?', mid.includes('07:00'), 'has 00:00 button?', /00:00/.test(mid));

  await pickTime('end', '21', '30');
  mid = await page.locator('body').innerText();
  console.log('after end, has 21:30?', mid.includes('21:30'));

  // Interval 30 min
  await clickExactButton(page, ['分鐘', '분']);
  await sleep(400);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role=option],button,li,div')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '30' && r.width > 0 && r.height > 0 && el.children.length <= 1;
    });
    els[els.length - 1]?.click();
  });
  await sleep(400);

  // Generate
  const gen = await clickExactButton(page, ['생성', '生成']);
  console.log('generate clicked', gen);
  await sleep(2500);

  body = await page.locator('body').innerText();
  const times = [...body.matchAll(/\b([01]\d|2[0-3]):[0-5]\d\b/g)].map((m) => m[1] + m[0].slice(2));
  // fix match - use full
  const allTimes = [...body.matchAll(/\b([01]\d|2[0-3]):[0-5]\d\b/g)].map((m) => m[0]);
  const unique = [...new Set(allTimes)].filter((t) => {
    // exclude page clocks that look like timestamps near 11:xx if not in range? keep 07-21
    const [h, mi] = t.split(':').map(Number);
    return h >= 7 && h <= 21 && (mi === 0 || mi === 30);
  });
  const hasLine = /07:00 · 07:30/.test(body) || (unique.includes('07:00') && unique.includes('21:30') && unique.length >= 28);
  console.log('unique slots', unique.length, 'first', unique[0], 'last', unique[unique.length - 1], 'ok?', hasLine);

  // Save time popup
  const saved = await clickExactButton(page, ['節省', '저장', '완료']);
  console.log('time save', saved);
  await sleep(1500);
  return { ok: hasLine, unique: unique.length, sample: unique.slice(0, 3).concat(unique.slice(-2)) };
}

async function fillOptionInclude(page) {
  // Option-level include: look for 编辑 near 포함 / 包含
  const body = await page.locator('body').innerText();
  if (!body.includes('포함 사항 작성') && !body.includes('包含') && !body.includes('포함')) {
    console.log('no include section visible on option?');
  }

  // Try edit buttons
  const editClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    // Prefer 编辑 near include area
    const edit = buttons.find((b) => {
      const t = (b.innerText || '').trim();
      return t === '编辑' || t === '편집' || t === '編輯';
    });
    if (edit) {
      edit.click();
      return true;
    }
    // more menu
    const more = buttons.find((b) => /more|더보기|更多/.test((b.innerText || '').trim()) || b.getAttribute('aria-label')?.includes('more'));
    return false;
  });
  await sleep(1000);

  // Also try clicking text 포함 사항 작성
  if (!editClicked) {
    await page.getByText('포함 사항 작성 부탁드립니다').first().click({ force: true }).catch(() => {});
    await sleep(800);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) =>
        /编辑|편집|編輯|설정|작성/.test((x.innerText || '').trim()),
      );
      b?.click();
    });
    await sleep(1000);
  }

  // Fill transport/pickup/other
  const filled = await page.evaluate(
    ({ transport, pickup, exclude }) => {
      const result = { transport: false, pickup: false, other: false, exclude: false };
      // checkboxes by id
      for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP', 'inclusions_OTHER', 'inclusions_ETC']) {
        const el = document.getElementById(id);
        if (el && !el.checked) {
          (el.closest('label') || el.parentElement || el).click();
        }
      }
      // also click by text
      for (const label of ['運輸', 'TRANSPORTATION', '交通', '其他', '픽업', 'PICK_UP', '接送']) {
        const el = Array.from(document.querySelectorAll('label,div,span,button')).find(
          (e) => (e.innerText || '').trim() === label || (e.innerText || '').includes(label),
        );
        if (el && (el.innerText || '').length < 40) el.click();
      }

      const tDesc =
        document.getElementById('inclusions_TRANSPORTATION_description') ||
        document.querySelector('textarea[id*="TRANSPORTATION"]') ||
        document.querySelector('textarea[name*="TRANSPORTATION"]');
      if (tDesc) {
        tDesc.focus();
        tDesc.value = transport;
        tDesc.dispatchEvent(new Event('input', { bubbles: true }));
        tDesc.dispatchEvent(new Event('change', { bubbles: true }));
        result.transport = true;
      }
      const pDesc =
        document.getElementById('inclusions_PICK_UP_description') ||
        document.querySelector('textarea[id*="PICK_UP"]');
      if (pDesc) {
        pDesc.focus();
        pDesc.value = pickup;
        pDesc.dispatchEvent(new Event('input', { bubbles: true }));
        pDesc.dispatchEvent(new Event('change', { bubbles: true }));
        result.pickup = true;
      }
      // OTHER textareas
      const other =
        document.getElementById('inclusions_OTHER_description') ||
        document.getElementById('inclusions_ETC_description') ||
        Array.from(document.querySelectorAll('textarea')).find((ta) => {
          const lab = ta.getAttribute('id') || ta.getAttribute('name') || '';
          return /OTHER|ETC|其他/.test(lab);
        });
      if (other) {
        other.focus();
        other.value = pickup;
        other.dispatchEvent(new Event('input', { bubbles: true }));
        other.dispatchEvent(new Event('change', { bubbles: true }));
        result.other = true;
      }
      // all empty textareas in modal - last resort fill first empty with transport
      const tas = Array.from(document.querySelectorAll('textarea')).filter((ta) => ta.offsetParent !== null);
      if (!result.transport && tas[0]) {
        tas[0].value = transport;
        tas[0].dispatchEvent(new Event('input', { bubbles: true }));
        result.transport = true;
      }
      if (!result.pickup && tas[1]) {
        tas[1].value = pickup;
        tas[1].dispatchEvent(new Event('input', { bubbles: true }));
        result.pickup = true;
      }
      const excl = document.getElementById('exclusions') || document.querySelector('textarea[id*="exclusion"]');
      if (excl) {
        excl.value = exclude;
        excl.dispatchEvent(new Event('input', { bubbles: true }));
        result.exclude = true;
      }
      return { result, taCount: tas.length, ids: tas.map((t) => t.id || t.name || t.placeholder) };
    },
    { transport: INCLUDE_TRANSPORT, pickup: INCLUDE_PICKUP, exclude: EXCLUDE },
  );
  console.log('include fill', JSON.stringify(filled));

  // Also use playwright fill for known ids
  if (await page.locator('#inclusions_TRANSPORTATION_description').count()) {
    await page.locator('#inclusions_TRANSPORTATION_description').fill(INCLUDE_TRANSPORT);
  }
  if (await page.locator('#inclusions_PICK_UP_description').count()) {
    await page.locator('#inclusions_PICK_UP_description').fill(INCLUDE_PICKUP);
  }
  if (await page.locator('#inclusions_OTHER_description').count()) {
    await page.locator('#inclusions_OTHER_description').fill(INCLUDE_PICKUP);
  }
  if (await page.locator('#exclusions').count()) {
    await page.locator('#exclusions').fill(EXCLUDE);
  }

  await sleep(400);
  const closed = await clickExactButton(page, ['節省', '완료', '完成', '저장']);
  console.log('include modal close', closed);
  await sleep(1200);
  return filled;
}

async function fixOneOption(page, opt, index) {
  console.log('\n=== fix option', index, opt.name.slice(0, 30), '===');
  await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);
  await dismissOverlays(page);

  // Click 옵션 수정하기 for this card
  const opened = await page.evaluate((name) => {
    const cards = Array.from(document.querySelectorAll('div')).filter(
      (d) => d.innerText && d.innerText.includes(name) && d.innerText.includes('옵션 수정하기'),
    );
    // find smallest card containing the name
    cards.sort((a, b) => a.innerText.length - b.innerText.length);
    const card = cards[0];
    if (!card) return false;
    const btn = Array.from(card.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === '옵션 수정하기',
    );
    if (btn) {
      btn.click();
      return true;
    }
    // global nth
    return false;
  }, opt.name);

  if (!opened) {
    const btns = page.getByRole('button', { name: '옵션 수정하기', exact: true });
    const c = await btns.count();
    console.log('edit buttons', c, 'using index', index);
    if (c > index) await btns.nth(index).click({ force: true });
    else if (c > 0) await btns.nth(0).click({ force: true });
    else {
      console.log('no edit button');
      return { name: opt.name, ok: false };
    }
  }
  await sleep(2000);

  // Fill include
  const inc = await fillOptionInclude(page);

  // Times
  const times = await setTimeSlots(page);

  // Re-fill name if wiped
  if (await page.locator('#name').count()) {
    const cur = await page.locator('#name').inputValue().catch(() => '');
    if (!cur.includes('나리타') && !cur.includes('도쿄 시내')) {
      await page.locator('#name').fill(opt.name);
    } else if (cur !== opt.name) {
      await page.locator('#name').fill(opt.name);
    }
  }

  // Save option via 下個
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
  await sleep(3000);
  await dismissOverlays(page);

  return { name: opt.name, include: inc, times };
}

async function fixProductIncludes(page) {
  console.log('\n=== product regulations includes ===');
  await page.goto(`${BASE}/regulations?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);
  await dismissOverlays(page);

  const editBtn = page.locator('button').filter({ hasText: /^编辑$|^編輯$|^편집$/ });
  if (await editBtn.count()) {
    await editBtn.first().click();
    await sleep(1200);
  } else {
    await page.getByText('포함 사항').first().click({ force: true }).catch(() => {});
    await sleep(500);
    await clickExactButton(page, ['编辑', '編輯', '편집']);
    await sleep(1000);
  }

  await page.evaluate(() => {
    for (const id of ['inclusions_TRANSPORTATION', 'inclusions_PICK_UP', 'inclusions_OTHER']) {
      const el = document.getElementById(id);
      if (el && !el.checked) (el.closest('label') || el.parentElement || el).click();
    }
  });
  await sleep(300);

  if (await page.locator('#inclusions_TRANSPORTATION_description').count()) {
    await page.locator('#inclusions_TRANSPORTATION_description').fill(INCLUDE_TRANSPORT);
  }
  if (await page.locator('#inclusions_PICK_UP_description').count()) {
    await page.locator('#inclusions_PICK_UP_description').fill(INCLUDE_PICKUP);
  }
  if (await page.locator('#inclusions_OTHER_description').count()) {
    await page.locator('#inclusions_OTHER_description').fill(INCLUDE_PICKUP);
  }
  // fallback textareas
  const taCount = await page.locator('textarea').count();
  console.log('textarea count in include modal', taCount);
  if (await page.locator('#exclusions').count()) {
    await page.locator('#exclusions').fill(EXCLUDE);
  }

  await clickExactButton(page, ['節省', '완료', '完成']);
  await sleep(1500);
  await tempSave(page);
}

async function ensureImages(page) {
  console.log('\n=== images ===');
  await page.goto(`${BASE}/introduction?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  const imgCount = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).filter(
      (i) =>
        (i.src || '').includes('triple') ||
        (i.src || '').includes('cms') ||
        (i.src || '').includes('cloud') ||
        ((i.alt || '') + (i.src || '')).length > 20,
    ).length,
  );
  console.log('approx images on page', imgCount);
  // count product image thumbnails more carefully
  const body = await page.locator('body').innerText();
  const hasUpload = body.includes('上傳圖片') || body.includes('이미지');
  console.log('has upload UI', hasUpload);

  // If fewer than 3, re-upload all three
  const thumbs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map((i) => ({
      src: (i.src || '').slice(0, 80),
      w: i.naturalWidth || i.width,
      h: i.naturalHeight || i.height,
    })).filter((i) => i.w > 40 && i.h > 40);
  });
  console.log('thumbs', thumbs.length, thumbs.slice(0, 5));

  if (thumbs.length < 3) {
    for (const imgPath of IMAGES) {
      if (!fs.existsSync(imgPath)) {
        console.log('missing', imgPath);
        continue;
      }
      const chooserPromise = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
      await page.getByText('上傳圖片').first().click().catch(async () => {
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button,div,label,span')).find((x) =>
            /上傳圖片|이미지 등록|이미지 추가|添加图片/.test(x.innerText || ''),
          );
          b?.click();
        });
      });
      const chooser = await chooserPromise;
      if (chooser) {
        await chooser.setFiles(imgPath);
        await sleep(3000);
        console.log('uploaded', path.basename(imgPath));
      } else {
        const fi = page.locator('input[type=file]');
        const fc = await fi.count();
        if (fc) {
          await fi.nth(fc - 1).setInputFiles(imgPath);
          await sleep(3000);
          console.log('uploaded via input', path.basename(imgPath));
        } else {
          console.log('NO file chooser for', imgPath);
        }
      }
    }
  } else {
    console.log('images already present, skip re-upload');
  }
  await tempSave(page);
}

async function verifyPrices(page) {
  console.log('\n=== verify calendar prices ===');
  const results = [];
  for (let i = 0; i < OPTIONS.length; i++) {
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(1500);
    await dismissOverlays(page);
    const btns = page.getByRole('button', { name: '판매 캘린더 관리', exact: true });
    const c = await btns.count();
    if (c <= i) {
      results.push({ i, price: OPTIONS[i].price, found: false });
      continue;
    }
    await btns.nth(i).click({ force: true });
    await sleep(1500);
    const body = await page.locator('body').innerText();
    const want = OPTIONS[i].price;
    const has = body.includes(want) || body.includes(want.replace(/(\d)(\d{3})/, '$1,$2'));
    // count cells with price
    const cellHits = (body.match(new RegExp(`\\b${want}\\b`, 'g')) || []).length;
    console.log(`option ${i} want ${want} hits ${cellHits}`);
    results.push({ i, name: OPTIONS[i].name.slice(0, 20), want, cellHits, has });
    await page.keyboard.press('Escape');
    await sleep(400);
    await clickExactButton(page, ['닫기', '关闭', '關閉', '取消']).catch(() => {});
    await sleep(500);
  }
  return results;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = await getPage(browser);
  console.log('start url', page.url());

  // Close any open hash popup by clean navigation
  await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);
  await dismissOverlays(page);

  let body = await page.locator('body').innerText();
  console.log('product title match', body.includes('나리타공항(NRT)'));
  console.log(
    'options present',
    OPTIONS.map((o) => body.includes(o.name)),
  );
  console.log('include warnings', (body.match(/포함 사항 작성/g) || []).length);

  // 1. Images
  await ensureImages(page);

  // 2. Product-level includes
  await fixProductIncludes(page);

  // 3. Fix each option include + times
  const optionResults = [];
  for (let i = 0; i < OPTIONS.length; i++) {
    try {
      const r = await fixOneOption(page, OPTIONS[i], i);
      optionResults.push(r);
      console.log('result', JSON.stringify(r, null, 0).slice(0, 300));
    } catch (e) {
      console.error('option fail', i, e.message);
      optionResults.push({ i, error: e.message });
      await dismissOverlays(page);
    }
  }

  // 4. Verify prices from calendar
  const prices = await verifyPrices(page);

  // 5. Final list + temp save
  await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);
  await dismissOverlays(page);
  body = await page.locator('body').innerText();
  fs.writeFileSync('/tmp/nol-narita-finish.txt', body);
  console.log('\n=== FINAL ===');
  console.log('productId', PRODUCT_ID);
  console.log('title', body.includes(PRODUCT_NAME));
  for (const o of OPTIONS) console.log('opt', o.name.slice(0, 28), body.includes(o.name));
  console.log('selling', (body.match(/판매중/g) || []).length);
  console.log('include warn remaining', (body.match(/포함 사항 작성/g) || []).length);
  console.log('prices', JSON.stringify(prices));
  console.log('optionResults times', optionResults.map((r) => r.times || r.error));

  await tempSave(page);
  await page.screenshot({ path: '/tmp/nol-narita-finish.png', fullPage: true });
  console.log('APPROVAL_CLICKED: false');
  console.log('done');
  // do not browser.close — keep Chrome open
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
