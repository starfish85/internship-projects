/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Fix Haneda HND: 代表预约 + 价格类型韩文
 * 保存顺序（用户硬规则）: 临时保存 → 下一个
 * 出现「有变化…离开」= 未保存，禁止点确定丢改
 * 绝不点 提交审核 / 批准請求
 * UI: 简体中文
 */
import { chromium } from 'playwright';

const PRODUCT_ID = 'b6e560d4-d4d3-4726-b08c-f5623499895a';
const BASE = 'https://tour.triple.partners/product-management/registration';
const Q = `id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`;

const RESV_IDS = [
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

const OPTIONS = [
  {
    match: '도쿄 시내 호텔 출발 → 하네다공항(HND) 편도 이동 (7인승 차량)',
    fullName: '도쿄 시내 호텔 출발 → 하네다공항(HND) 편도 이동 (7인승 차량)',
    ptName: '7인승 가는',
    ptDesc: '7인승 차량',
  },
  {
    match: '도쿄 시내 호텔 출발 → 하네다공항(HND) 편도 이동 (10인승 차량)',
    fullName: '도쿄 시내 호텔 출발 → 하네다공항(HND) 편도 이동 (10인승 차량)',
    ptName: '10인승 가는',
    ptDesc: '10인승 차량',
  },
  {
    match: '하네다공항(HND) 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)',
    fullName: '하네다공항(HND) 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)',
    ptName: '7인승 오는',
    ptDesc: '7인승 차량',
  },
  {
    match: '하네다공항(HND) 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)',
    fullName: '하네다공항(HND) 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)',
    ptName: '10인승 오는',
    ptDesc: '10인승 차량',
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Stay on page if leave dialog shows (never 确定 discard) */
async function stayIfLeaveDialog(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    if (!/有變化|有变化|更改將丟失|更改将丢失|確定要離開|确定要离开/.test(body)) {
      return { has: false };
    }
    const stay = Array.from(document.querySelectorAll('button')).find((b) => {
      const t = (b.innerText || '').trim();
      return t === '消除' || t === '取消';
    });
    if (stay) {
      stay.click();
      return { has: true, stayed: true };
    }
    return { has: true, stayed: false };
  });
}

async function listBottomButtons(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        const t = (b.innerText || '').trim();
        return {
          i,
          t,
          d: b.disabled || b.getAttribute('aria-disabled') === 'true',
          w: Math.round(r.width),
          y: Math.round(r.y),
          vis: r.width > 0 && r.height > 0,
        };
      })
      .filter((b) => b.vis && b.t && /临时保存|臨時存儲|下一个|下個|保存然后|保存然後|提交审核|批准/.test(b.t)),
  );
}

/**
 * 临时保存 only — exact text match, never 提交审核
 */
async function clickTempSave(page, label = '') {
  const leave = await stayIfLeaveDialog(page);
  if (leave.has) console.log(`[${label}] leave dialog, stayed`, leave);

  const result = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        const t = (b.innerText || '').trim();
        return {
          i,
          t,
          d: b.disabled || b.getAttribute('aria-disabled') === 'true',
          w: Math.round(r.width),
          y: Math.round(r.y),
          vis: r.width > 0 && r.height > 0,
        };
      })
      .filter((b) => b.vis && !b.d && (b.t === '临时保存' || b.t === '臨時存儲' || b.t === '임시저장'));
    // Prefer form-footer narrower button (option form) first if both exist; else bottom bar
    // User rule: must click 临时保存. Prefer largest y (bottommost) among same width group,
    // but if form has 临时保存 (w~120) and bar has (w~359), prefer BOTH path: form first for option.
    if (!candidates.length) return { ok: false, candidates: [] };
    // Prefer the one with smaller width if on option form (form footer), else largest y
    candidates.sort((a, b) => {
      // prefer form-level temp save near 下一个 (smaller w, similar y)
      if (a.w !== b.w) return a.w - b.w;
      return b.y - a.y;
    });
    const pick = candidates[0];
    document.querySelectorAll('button')[pick.i].click();
    return { ok: true, pick, all: candidates };
  });
  console.log(`[${label}] 临时保存`, result);
  await sleep(2500);
  // toast check
  const toast = await page.evaluate(() => {
    const t = document.body?.innerText || '';
    return /临时|臨時|저장|已保存|저장되었습니다|저장 완료/.test(t.slice(0, 3000));
  });
  console.log(`[${label}] after temp save toast-ish`, toast);
  return result.ok;
}

/**
 * 下一个 — only AFTER 临时保存
 */
async function clickNext(page, label = '') {
  const result = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        const t = (b.innerText || '').trim();
        return {
          i,
          t,
          d: b.disabled || b.getAttribute('aria-disabled') === 'true',
          w: Math.round(r.width),
          y: Math.round(r.y),
          vis: r.width > 0 && r.height > 0,
        };
      })
      .filter((b) => b.vis && !b.d && (b.t === '下一个' || b.t === '下個' || b.t === '다음') && b.w > 200)
      .sort((a, b) => b.y - a.y || b.w - a.w);
    if (!candidates.length) return { ok: false };
    document.querySelectorAll('button')[candidates[0].i].click();
    return { ok: true, pick: candidates[0] };
  });
  console.log(`[${label}] 下一个`, result);
  await sleep(3500);
  const leave = await stayIfLeaveDialog(page);
  if (leave.has) {
    console.log(`[${label}] WARN leave after 下一个 — means still dirty`, leave);
  }
  return result.ok;
}

/** Save sequence: 临时保存 → 下一个 */
async function tempSaveThenNext(page, label) {
  console.log(`\n>>> ${label}: 临时保存 → 下一个`);
  const bottoms = await listBottomButtons(page);
  console.log(`[${label}] buttons`, bottoms);
  const ok1 = await clickTempSave(page, label);
  if (!ok1) throw new Error(`[${label}] 临时保存 not found/clicked`);
  await sleep(800);
  const ok2 = await clickNext(page, label);
  if (!ok2) throw new Error(`[${label}] 下一个 not found/clicked after temp save`);
  // If leave dialog, stay and retry temp save
  let leave = await stayIfLeaveDialog(page);
  if (leave.has) {
    console.log(`[${label}] leave after next — retry 临时保存 then 下一个`);
    await clickTempSave(page, label + '-retry');
    await sleep(500);
    await clickNext(page, label + '-retry');
    leave = await stayIfLeaveDialog(page);
  }
  return !leave.has;
}

async function setNativeValue(page, selector, value) {
  const loc = page.locator(selector).first();
  if (!(await loc.count())) return false;
  await loc.click({ force: true }).catch(() => {});
  await loc.fill('');
  await loc.fill(String(value));
  await loc.evaluate((node, v) => {
    const proto = Object.getPrototypeOf(node);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) desc.set.call(node, v);
    else node.value = v;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
  const got = await loc.inputValue().catch(() => '');
  return got === String(value);
}

async function mouseClickCheckbox(page, rid) {
  // scroll into view + real mouse click on label/checkbox area
  for (let attempt = 0; attempt < 35; attempt++) {
    const box = await page.evaluate((rid) => {
      const el = document.getElementById(rid);
      if (!el) {
        const scrollers = Array.from(document.querySelectorAll('*')).filter((e) => {
          const s = getComputedStyle(e);
          return (
            (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
            e.scrollHeight > e.clientHeight + 40 &&
            e.clientHeight > 60
          );
        });
        scrollers.sort((a, b) => b.clientHeight - a.clientHeight);
        if (scrollers[0]) scrollers[0].scrollTop += 160;
        return null;
      }
      el.scrollIntoView({ block: 'center' });
      if (el.checked) return { already: true };
      // find clickable: label[for], parent, or adjacent
      let target = document.querySelector(`label[for="${rid}"]`);
      if (!target) {
        let n = el;
        for (let i = 0; i < 8 && n; i++) {
          if (n.tagName === 'LABEL' || n.getAttribute('role') === 'checkbox') {
            target = n;
            break;
          }
          n = n.parentElement;
        }
      }
      if (!target) target = el;
      const r = target.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) {
        // try parent
        const p = target.parentElement?.getBoundingClientRect();
        if (p && p.width > 2) {
          return { x: p.x + 14, y: p.y + p.height / 2, checked: el.checked };
        }
        return null;
      }
      return { x: r.x + Math.min(14, r.width / 2), y: r.y + r.height / 2, checked: el.checked };
    }, rid);

    if (box?.already) return true;
    if (box && typeof box.x === 'number') {
      await page.mouse.click(box.x, box.y);
      await sleep(80);
      const checked = await page.evaluate((rid) => !!document.getElementById(rid)?.checked, rid);
      if (checked) return true;
      // force as last resort on this attempt
      await page.evaluate((rid) => {
        const el = document.getElementById(rid);
        if (!el || el.checked) return;
        el.click();
        if (!el.checked) {
          el.checked = true;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      }, rid);
      if (await page.evaluate((rid) => !!document.getElementById(rid)?.checked, rid)) return true;
    }
    await sleep(50);
  }
  return await page.evaluate((rid) => !!document.getElementById(rid)?.checked, rid);
}

async function fixReservation(page) {
  console.log('\n========== STEP1 代表预约 ==========');
  await stayIfLeaveDialog(page);
  await page.goto(`${BASE}/regulations?${Q}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await stayIfLeaveDialog(page);
  console.log('url', page.url());

  // open modal
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(
      (x) => (x.innerText || '').trim() === '代表预约信息' || (x.innerText || '').trim() === '代表預約信息',
    );
    b?.click();
  });
  await sleep(2000);

  const results = {};
  for (const rid of RESV_IDS) {
    const ok = await mouseClickCheckbox(page, rid);
    results[rid] = ok;
    console.log(rid, ok ? 'OK' : 'FAIL');
  }

  // 已选
  const conf = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '已选' || t === '已選' || /^已选/.test(t) || /^已選/.test(t)) && !x.disabled;
    });
    if (!b) return null;
    const t = (b.innerText || '').trim();
    b.click();
    return t;
  });
  console.log('confirm', conf);
  await sleep(2500);

  let body = await page.locator('body').innerText();
  let red = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
  console.log('red after confirm?', red);
  console.log(
    'snippet',
    (body.match(/代表预约信息[\s\S]{0,300}/) || body.match(/代表預約信息[\s\S]{0,300}/) || ['n/a'])[0],
  );

  // 法规页：先临时保存；若 保存然后 可用再点（不跳过临时保存）
  const bottoms = await listBottomButtons(page);
  console.log('regs bottoms', bottoms);
  const tempOk = await clickTempSave(page, 'regs');
  if (!tempOk) throw new Error('regs 临时保存 failed');

  // re-check red
  await page.goto(`${BASE}/regulations?${Q}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  body = await page.locator('body').innerText();
  red = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
  console.log('AFTER 临时保存 red?', red);
  console.log(
    'AFTER snippet',
    (body.match(/代表预约信息[\s\S]{0,350}/) || ['n/a'])[0],
  );

  // if still red, re-open and retry once with force
  if (red) {
    console.log('retry resv fill...');
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((x) => (x.innerText || '').trim() === '代表预约信息')
        ?.click();
    });
    await sleep(2000);
    for (const rid of RESV_IDS) {
      await mouseClickCheckbox(page, rid);
    }
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((x) => {
          const t = (x.innerText || '').trim();
          return t === '已选' || t.startsWith('已选');
        })
        ?.click();
    });
    await sleep(2000);
    await clickTempSave(page, 'regs-retry');
    await page.goto(`${BASE}/regulations?${Q}`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    body = await page.locator('body').innerText();
    red = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
    console.log('retry red?', red);
  }

  // 保存然后 if enabled
  const b2 = await listBottomButtons(page);
  console.log('after resv bottoms', b2);
  const saveThen = b2.find((x) => (x.t === '保存然后' || x.t === '保存然後') && !x.d);
  if (saveThen) {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((x) => {
          const t = (x.innerText || '').trim();
          return (t === '保存然后' || t === '保存然後') && !x.disabled;
        })
        ?.click();
    });
    await sleep(3000);
    console.log('clicked 保存然后');
  } else {
    console.log('保存然后 still disabled — kept 临时保存 only');
  }

  return { results, red };
}

async function fixPriceTypes(page) {
  console.log('\n========== STEP2 价格类型韩文 ==========');
  await page.goto(`${BASE}/option?${Q}`, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await stayIfLeaveDialog(page);

  const out = [];
  for (let idx = 0; idx < OPTIONS.length; idx++) {
    const opt = OPTIONS[idx];
    console.log(`\n----- OPT ${idx + 1}/4 ${opt.ptName} -----`);

    // ensure list
    await stayIfLeaveDialog(page);
    if (!page.url().includes('/option') || page.url().includes('option-form')) {
      // if still in form from previous, do temp+next
      if (await page.locator('#name').count()) {
        await tempSaveThenNext(page, `cleanup-${idx}`);
      }
    }
    if (!page.url().includes('/option')) {
      await page.goto(`${BASE}/option?${Q}`, { waitUntil: 'domcontentloaded' });
      await sleep(2500);
    }
    // close any form
    if (page.url().includes('#registration.option-form') || (await page.locator('#name').count())) {
      // should not leave without save — if dirty, save first
      const bottoms = await listBottomButtons(page);
      if (bottoms.some((b) => b.t === '临时保存' || b.t === '下一个')) {
        await tempSaveThenNext(page, `preclose-${idx}`);
      }
    }
    await page.goto(`${BASE}/option?${Q}`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await stayIfLeaveDialog(page);

    // click N-th 修改选项
    const editOk = await page.evaluate((index) => {
      const edits = Array.from(document.querySelectorAll('button')).filter((b) => {
        const t = (b.innerText || '').trim();
        return t === '修改选项' || t === '修改選項';
      });
      if (!edits[index]) return { ok: false, n: edits.length };
      edits[index].scrollIntoView({ block: 'center' });
      edits[index].click();
      return { ok: true, n: edits.length };
    }, idx);
    console.log('修改选项', editOk);
    await sleep(2500);

    if (!(await page.locator('#name').count())) {
      out.push({ pt: opt.ptName, error: 'form-not-open' });
      continue;
    }

    // 选择价格类型
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /选择价格类型|選擇價格類型|가격 타입 선택/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(1000);
    // 其他价格类型
    await page.evaluate(() => {
      const hit = Array.from(document.querySelectorAll('button,div,span,label')).find((el) => {
        const t = (el.innerText || '').trim();
        return /其他价格类型|其他價格類型|기타 가격 타입/.test(t) && t.length < 50;
      });
      hit?.click();
    });
    await sleep(1500);

    // fill Korean name/desc
    const nameSelectors = [
      'input[placeholder="輸入的名稱將顯示在銷售渠道上。"]',
      'input[placeholder="输入的名称将显示在销售渠道上。"]',
      'input[placeholder*="销售渠道"]',
      'input[placeholder*="銷售渠道"]',
    ];
    const descSelectors = [
      'input[placeholder="例) 滿 19 歲以上"]',
      'input[placeholder="例) 满 19 岁以上"]',
      'input[placeholder*="滿 19"]',
      'input[placeholder*="满 19"]',
    ];

    let nameOk = false;
    for (const s of nameSelectors) {
      if (await page.locator(s).count()) {
        nameOk = await setNativeValue(page, s, opt.ptName);
        if (nameOk) break;
      }
    }
    let descOk = false;
    for (const s of descSelectors) {
      if (await page.locator(s).count()) {
        descOk = await setNativeValue(page, s, opt.ptDesc);
        if (descOk) break;
      }
    }

    // fallback: first two visible text inputs in dialog
    if (!nameOk || !descOk) {
      const filled = await page.evaluate(
        ({ ptName, ptDesc }) => {
          const inputs = Array.from(document.querySelectorAll('input[type=text], input:not([type])'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 50 && r.height > 0 && !el.disabled;
            });
          const setVal = (el, v) => {
            const proto = Object.getPrototypeOf(el);
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc?.set) desc.set.call(el, v);
            else el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          if (inputs[0]) setVal(inputs[0], ptName);
          if (inputs[1]) setVal(inputs[1], ptDesc);
          return {
            n: inputs.length,
            v0: inputs[0]?.value,
            v1: inputs[1]?.value,
            ph0: inputs[0]?.placeholder,
            ph1: inputs[1]?.placeholder,
          };
        },
        { ptName: opt.ptName, ptDesc: opt.ptDesc },
      );
      console.log('fallback fill', filled);
      nameOk = filled.v0 === opt.ptName;
      descOk = filled.v1 === opt.ptDesc;
    }

    const readName = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 50 && r.height > 0 && el.type !== 'tel' && el.type !== 'number';
      });
      return inputs.map((i) => ({ ph: i.placeholder, v: i.value })).slice(0, 6);
    });
    console.log('fill result', { nameOk, descOk, readName });

    // required + representative
    await page.locator('[aria-labelledby="ETC-required-label"]').click({ force: true }).catch(() => {});
    await page
      .locator('[aria-labelledby="ETC-representative-label"]')
      .click({ force: true })
      .catch(() => {});

    // 完成 / 완료
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => {
        const t = (x.innerText || '').trim();
        return t === '完成' || t === '완료';
      });
      b?.click();
    });
    await sleep(1500);

    // re-fill option name if overwritten
    if (await page.locator('#name').count()) {
      await page.locator('#name').fill(opt.fullName);
    }

    // HARD RULE: 临时保存 → 下一个
    await tempSaveThenNext(page, opt.ptName);

    // verify returned to list (no leave dialog)
    await stayIfLeaveDialog(page);
    const stillForm = await page.locator('#name').count();
    console.log('after save still form?', stillForm > 0, 'url', page.url());
    out.push({ pt: opt.ptName, nameOk, descOk, stillForm: stillForm > 0 });
  }

  // deep verify stored PT names
  console.log('\n========== VERIFY PT ==========');
  await page.goto(`${BASE}/option?${Q}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const deep = [];
  for (let idx = 0; idx < OPTIONS.length; idx++) {
    const opt = OPTIONS[idx];
    await page.goto(`${BASE}/option?${Q}`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await page.evaluate((index) => {
      const edits = Array.from(document.querySelectorAll('button')).filter(
        (b) => (b.innerText || '').trim() === '修改选项',
      );
      edits[index]?.click();
    }, idx);
    await sleep(2000);
    if (!(await page.locator('#name').count())) {
      deep.push({ expected: opt.ptName, error: 'no form' });
      continue;
    }
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /选择价格类型/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(800);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,div,span'))
        .find((el) => {
          const t = (el.innerText || '').trim();
          return /其他价格类型|기타/.test(t) && t.length < 50;
        })
        ?.click();
    });
    await sleep(1000);
    const stored = await page.evaluate(() => {
      const ph =
        document.querySelector('input[placeholder*="销售渠道"]') ||
        document.querySelector('input[placeholder*="銷售渠道"]') ||
        document.querySelector('input[placeholder*="名稱"]') ||
        document.querySelector('input[placeholder*="名称"]');
      if (ph) return ph.value;
      const inputs = Array.from(document.querySelectorAll('input')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 80 && r.height > 0 && el.type !== 'tel';
      });
      return inputs[0]?.value || null;
    });
    console.log('VERIFY', opt.ptName, '=>', stored, stored === opt.ptName ? 'PASS' : 'FAIL');
    deep.push({ expected: opt.ptName, stored, ok: stored === opt.ptName });

    // close price dialog then 临时保存 → 下一个 (even if no change, to exit cleanly without leave warn)
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(400);
    // if price dialog still open, click 完成 without change
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => {
        const t = (x.innerText || '').trim();
        return t === '完成' || t === '완료';
      });
      b?.click();
    });
    await sleep(500);
    // exit form with save sequence so no leave dialog
    await tempSaveThenNext(page, `verify-exit-${opt.ptName}`);
  }

  return { out, deep };
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  let page =
    context.pages().find((p) => (p.url() || '').includes('tour.triple.partners')) ||
    context.pages()[0];
  await page.bringToFront().catch(() => {});

  // dismiss any leave dialog by staying
  await stayIfLeaveDialog(page);
  console.log('start', page.url());
  console.log('RULE: 临时保存 → 下一个; never 提交审核; leave dialog = not saved');

  const resv = await fixReservation(page);
  const pts = await fixPriceTypes(page);

  await page.goto(`${BASE}/option?${Q}`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await clickTempSave(page, 'final-list');

  // final resv check
  await page.goto(`${BASE}/regulations?${Q}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const finalBody = await page.locator('body').innerText();
  const finalRed = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(finalBody);

  console.log('\n========== DONE ==========');
  console.log(
    JSON.stringify(
      {
        resvRed: resv.red || finalRed,
        finalRed,
        resvOkCount: Object.values(resv.results).filter(Boolean).length,
        pts: pts.out,
        deep: pts.deep,
      },
      null,
      2,
    ),
  );
  console.log('提交审核 / 批准請求: NOT clicked');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
