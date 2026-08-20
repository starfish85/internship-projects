/**
 * §40 中国时段 — 唯一已验证实现（Hongqiao 2026-08-07 live PASS ×2）
 *
 * ⛔ 禁止在 list-/fix-/hq-/pek- 脚本内再写一套 setTimes。
 * ⛔ 任一步读回失败 → throw（禁止 retry 碰运气 / 禁止手搓第二套）。
 * 失败时改本文件再跑；调用方只 import setTimesChina。
 *
 * 8 步验收字段（动手前须复述）：
 * 1 open      — 时段弹窗可见（「重复 小时 添加」或已有时钟）
 * 2 repeat    — 点「重复 小时 添加」后：同排 ≥2 个时钟钮（文案 选择|HH:MM，宽 180–300）
 * 3 start     — 左时钟钮文案含 08:00（或 opts.start）
 * 4 end       — 右时钟钮文案含 21:30（或 opts.end）
 * 5 interval  — exact「分钟」→ option「30」；一代/生成/생성 disabled===false
 * 6 generate  — 点生成后（弹窗内列表可选验）
 * 7 modalSave — 弹窗底「保存」；表单「时间段」compact count/first/last
 * 8 compact   — China: count===28 && first==='08:00' && last==='21:30'
 * 9 tempSaveNext — 窄临时保存 → 轮询「下一个」enabled(5–10s) → 验收 #name 消失/修改选项
 *                 FAIL 必须 SetTimesStepError('tempSaveNext') + footer dump
 *
 * Live 分批：node *-fix-times.mjs 0  与  1  分开；holidays 另批；一卡失败只重跑该 index
 * 实际 click 顺序与选择器 — 见 skill §40「已验证路径」。
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEFAULTS = Object.freeze({
  startHour: '08',
  startMin: '00',
  endHour: '21',
  endMin: '30',
  intervalMin: '30',
  expectCount: 28,
});

export class SetTimesStepError extends Error {
  /**
   * @param {string} step - open|repeat|start|end|interval|generate|modalSave|compact|tempSaveNext
   * @param {string} message
   * @param {object} [readback]
   */
  constructor(step, message, readback = null) {
    super(`[setTimesChina·${step}] ${message}`);
    this.name = 'SetTimesStepError';
    this.step = step;
    this.readback = readback;
  }
}

function log(step, msg, extra) {
  if (extra !== undefined) console.log(`  【${step}】${msg}`, extra);
  else console.log(`  【${step}】${msg}`);
}

/** 表单「时间段」下一行 compact */
export async function readTimesCompact(page) {
  return page.evaluate(() => {
    const lines = document.body.innerText.split('\n');
    const idx = lines.findIndex((l) => l.trim() === '时间段');
    if (idx < 0) return { count: 0, first: undefined, last: undefined, raw: null };
    const slots = (lines[idx + 1] || '')
      .split(/[·.\s]+/)
      .map((s) => s.trim())
      .filter((x) => /^\d{2}:\d{2}$/.test(x));
    return {
      count: slots.length,
      first: slots[0],
      last: slots[slots.length - 1],
      raw: (lines[idx + 1] || '').slice(0, 160),
    };
  });
}

/** 同排时钟钮：文案 选择|選擇|HH:MM，宽 180–300，按 y 分行、x 排序 */
async function listClockPair(page) {
  return page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          t: (b.innerText || '').trim(),
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
        };
      })
      .filter(
        (x) =>
          (x.t === '选择' || x.t === '選擇' || /^\d{2}:\d{2}$/.test(x.t)) &&
          x.w > 180 &&
          x.w < 300 &&
          x.h > 20 &&
          x.y > 0,
      );
    btns.sort((a, b) => a.y - b.y || a.x - b.x);
    const row = {};
    for (const b of btns) {
      const key = Math.round(b.y / 5) * 5;
      (row[key] ||= []).push(b);
    }
    let pair = Object.values(row).find((arr) => arr.length >= 2);
    if (!pair) pair = btns;
    pair = [...pair].sort((a, b) => a.x - b.x);
    return pair.map((p) => ({
      t: p.t,
      x: Math.round(p.x),
      y: Math.round(p.y),
      w: Math.round(p.w),
    }));
  });
}

async function clickClockSide(page, which /* 'start'|'end' */) {
  const meta = await page.evaluate((w) => {
    const nodes = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          b,
          t: (b.innerText || '').trim(),
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
        };
      })
      .filter(
        (x) =>
          (x.t === '选择' || x.t === '選擇' || /^\d{2}:\d{2}$/.test(x.t)) &&
          x.w > 180 &&
          x.w < 300 &&
          x.h > 20 &&
          x.y > 0,
      );
    nodes.sort((a, b) => a.y - b.y || a.x - b.x);
    const row = {};
    for (const n of nodes) {
      const key = Math.round(n.y / 5) * 5;
      (row[key] ||= []).push(n);
    }
    let pair = Object.values(row).find((arr) => arr.length >= 2);
    if (!pair) pair = nodes;
    pair = [...pair].sort((a, b) => a.x - b.x);
    const target = w === 'start' ? pair[0] : pair[1];
    if (!target) return null;
    target.b.click();
    return {
      t: target.t,
      x: Math.round(target.x),
      y: Math.round(target.y),
      pairLen: pair.length,
    };
  }, which);
  return meta;
}

async function pickClockOption(page, hour, minute) {
  // 小时：同文案 option 取 x 较小（左列）
  const hOk = await page.evaluate((h) => {
    const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
      (el) => (el.innerText || '').trim() === h,
    );
    if (!opts.length) return { ok: false, n: 0 };
    opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
    opts[0].click();
    return { ok: true, n: opts.length };
  }, hour);
  if (!hOk.ok) throw new SetTimesStepError('start', `无小时 option「${hour}」`, hOk);
  await sleep(350);

  // 分钟：同文案 option 取 x 较大（右列）
  const mOk = await page.evaluate((m) => {
    const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
      (el) => (el.innerText || '').trim() === m,
    );
    if (!opts.length) return { ok: false, n: 0 };
    opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
    opts[0].click();
    return { ok: true, n: opts.length };
  }, minute);
  if (!mOk.ok) throw new SetTimesStepError('start', `无分钟 option「${minute}」`, mOk);
  await sleep(500);
}

async function readClockSideText(page, which) {
  const pair = await listClockPair(page);
  if (which === 'start') return pair[0]?.t || null;
  return pair[1]?.t || pair[0]?.t || null;
}

/**
 * 在已打开的选项表单上设置中国时段 08:00–21:30×28。
 * @param {import('playwright').Page} page
 * @param {object} [opts]
 * @returns {Promise<{count:number,first?:string,last?:string,raw?:string|null}>}
 */
export async function setTimesChina(page, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const startLabel = `${cfg.startHour}:${cfg.startMin}`;
  const endLabel = `${cfg.endHour}:${cfg.endMin}`;

  // --- 1 open ---
  log('1/open', '将要 设置时间 或 ⋯编辑');
  const setBtn = page.getByRole('button', { name: /^设置时间$/ });
  if (await setBtn.count()) {
    await setBtn.first().click({ timeout: 10000 });
    await sleep(1800);
  } else {
    await page.locator('button[aria-label="더 보기"]').first().click({ force: true }).catch(() => {});
    await sleep(400);
    const edit = page.getByText(/^编辑$/).first();
    if (await edit.count()) {
      await edit.click({ timeout: 8000 });
      await sleep(1200);
    }
  }
  const hasRep = await page.getByRole('button', { name: /重复\s*小时\s*添加/ }).count();
  if (!hasRep) {
    // 可能已在弹窗
    const any = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).some((b) =>
        /重复\s*小时\s*添加|新增各别时间/.test((b.innerText || '').trim()),
      ),
    );
    if (!any) {
      throw new SetTimesStepError('open', '未打开时段弹窗（无「重复 小时 添加」）');
    }
  }
  log('1/open', 'PASS 弹窗就绪');

  // 删旧行（enabled 删除）
  for (let i = 0; i < 6; i++) {
    const del = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (x) => (x.innerText || '').trim() === '删除' && !x.disabled,
      );
      if (!b) return false;
      b.click();
      return true;
    });
    if (!del) break;
    await sleep(350);
  }

  // --- 2 repeat ---
  log('2/repeat', '将要 重复 小时 添加');
  const rep = page.getByRole('button', { name: /重复\s*小时\s*添加/ });
  if (!(await rep.count())) throw new SetTimesStepError('repeat', '无按钮「重复 小时 添加」');
  if (!(await rep.isDisabled())) {
    await rep.click({ timeout: 10000 });
    await sleep(1500);
  } else {
    log('2/repeat', '已展开(disabled)');
  }
  const pairAfter = await listClockPair(page);
  log('2/repeat', '时钟对', pairAfter);
  if (pairAfter.length < 2) {
    throw new SetTimesStepError(
      'repeat',
      `同排时钟钮 <2（需起止）；读回=${JSON.stringify(pairAfter)}`,
      { pair: pairAfter },
    );
  }
  log('2/repeat', 'PASS pairLen=' + pairAfter.length);

  // --- 3 start ---
  log('3/start', `将要 ${startLabel}`);
  const cStart = await clickClockSide(page, 'start');
  if (!cStart) throw new SetTimesStepError('start', '未定位到开始时钟钮（左）');
  log('3/start', '已点', cStart);
  await sleep(500);
  await pickClockOption(page, cfg.startHour, cfg.startMin);
  const startShown = await readClockSideText(page, 'start');
  log('3/start', '读回', startShown);
  if (!startShown || !new RegExp(`${cfg.startHour}\\s*:\\s*${cfg.startMin}`).test(startShown)) {
    throw new SetTimesStepError('start', `开始时钟未读回 ${startLabel}`, { startShown });
  }
  log('3/start', 'PASS');

  // --- 4 end ---
  log('4/end', `将要 ${endLabel}`);
  const cEnd = await clickClockSide(page, 'end');
  if (!cEnd) throw new SetTimesStepError('end', '未定位到结束时钟钮（右）');
  log('4/end', '已点', cEnd);
  await sleep(500);
  // pickClockOption reuses same option pick — step tag for error: end
  try {
    await pickClockOption(page, cfg.endHour, cfg.endMin);
  } catch (e) {
    if (e instanceof SetTimesStepError) {
      throw new SetTimesStepError('end', e.message.replace(/^\[setTimesChina·start\] /, ''), e.readback);
    }
    throw e;
  }
  const endShown = await readClockSideText(page, 'end');
  log('4/end', '读回', endShown);
  if (!endShown || !new RegExp(`${cfg.endHour}\\s*:\\s*${cfg.endMin}`).test(endShown)) {
    throw new SetTimesStepError('end', `结束时钟未读回 ${endLabel}`, { endShown });
  }
  log('4/end', 'PASS');

  // --- 5 interval ---
  log('5/interval', `将要 分钟 + option ${cfg.intervalMin}`);
  const minBtn = page.getByRole('button', { name: /^分钟$|^分鐘$/ });
  if (!(await minBtn.count())) {
    const clicked = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) =>
        /^(分钟|分鐘)$/.test((x.innerText || '').trim()),
      );
      if (!b) return false;
      b.click();
      return true;
    });
    if (!clicked) throw new SetTimesStepError('interval', '无按钮「分钟」');
  } else {
    await minBtn.first().click({ timeout: 8000 });
  }
  await sleep(500);

  let optN = page.getByRole('option', { name: new RegExp(`^${cfg.intervalMin}$`) });
  if (!(await optN.count())) {
    // 间隔位可能是第 3 个宽「选择」— 仅此一条后备，仍须读回一代
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '选择' || t === '選擇') && r.width > 300;
      });
      btns[0]?.click();
    });
    await sleep(400);
    optN = page.getByRole('option', { name: new RegExp(`^${cfg.intervalMin}$`) });
  }
  if (!(await optN.count())) {
    const ok = await page.evaluate((m) => {
      const o = Array.from(document.querySelectorAll('[role=option]')).find(
        (el) => (el.innerText || '').trim() === m,
      );
      if (!o) return false;
      o.click();
      return true;
    }, cfg.intervalMin);
    if (!ok) throw new SetTimesStepError('interval', `无 option「${cfg.intervalMin}」`);
  } else {
    await optN.last().click({ timeout: 8000 });
  }
  await sleep(600);

  let genState = null;
  for (let i = 0; i < 12; i++) {
    genState = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) =>
        /^(一代|生成|생성)$/.test((x.innerText || '').trim()),
      );
      return b ? { t: (b.innerText || '').trim(), disabled: !!b.disabled } : null;
    });
    log('5/interval', '一代读回', genState);
    if (genState && !genState.disabled) break;
    await sleep(350);
  }
  if (!genState || genState.disabled) {
    throw new SetTimesStepError('interval', '一代/生成仍灰 — 分钟间隔未真生效', { genState });
  }
  log('5/interval', 'PASS 一代 enabled');

  // --- 6 generate ---
  log('6/generate', '将要点 一代/生成');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => /^(一代|生成|생성)$/.test((x.innerText || '').trim()) && !x.disabled)
      ?.click();
  });
  await sleep(3000);
  log('6/generate', 'PASS 已点生成');

  // --- 7 modalSave ---
  log('7/modalSave', '将要点弹窗「保存」');
  const saved = await page.evaluate(() => {
    const saves = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { b, t: (b.innerText || '').trim(), y: r.y, w: r.width };
      })
      .filter((x) => x.t === '保存' && x.w > 100 && x.y > 0);
    if (!saves.length) return false;
    saves.sort((a, b) => b.y - a.y);
    saves[0].b.click();
    return true;
  });
  if (!saved) throw new SetTimesStepError('modalSave', '未找到弹窗「保存」');
  await sleep(1800);
  log('7/modalSave', 'PASS 已点保存');

  // --- 8 compact ---
  const tv = await readTimesCompact(page);
  log('8/compact', '读回', tv);
  if (
    tv.count !== cfg.expectCount ||
    tv.first !== startLabel ||
    tv.last !== endLabel
  ) {
    throw new SetTimesStepError(
      'compact',
      `期望 ${cfg.expectCount}/${startLabel}…${endLabel}，读回 count=${tv.count} first=${tv.first} last=${tv.last}`,
      tv,
    );
  }
  log('8/compact', 'PASS');
  return tv;
}

/** footer 相关按钮快照（文案/disabled/宽）— 失败时打印，禁止只抛「无可用」 */
export async function dumpFooterButtons(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          t: (b.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 48),
          d: !!b.disabled,
          w: Math.round(r.width),
          h: Math.round(r.height),
          y: Math.round(r.y),
        };
      })
      .filter(
        (x) =>
          x.h > 8 &&
          x.w > 8 &&
          (x.y > 400 || /临时|臨時|下一个|下個|提交|保存/.test(x.t)),
      )
      .slice(0, 40),
  );
}

async function listModCount(page) {
  return page.getByRole('button', { name: /修改选项|修改選項/ }).count();
}

/**
 * 选项 footer：窄「临时保存」→ 轮询「下一个」enabled 再点 → 验收离开表单
 *
 * 硬规则（迪士尼-吴淞 2026-08-07 事故）：
 * - 禁止固定 sleep 2.2s 后硬找「下一个」
 * - 轮询 5–10s 等 enabled 再点
 * - 找不到时 dump footer 按钮列表
 * - 点后须 #name 消失 或 列表 修改选项 count 可见
 * - 失败一律 SetTimesStepError('tempSaveNext', …)
 *
 * @param {import('playwright').Page} page
 * @param {{ waitNextMs?: number, pollMs?: number, leaveMs?: number, modsBefore?: number|null }} [opts]
 */
export async function tempSaveNext(page, opts = {}) {
  const waitNextMs = opts.waitNextMs ?? 10_000;
  const pollMs = opts.pollMs ?? 350;
  const leaveMs = opts.leaveMs ?? 8_000;
  const modsBefore =
    opts.modsBefore != null
      ? opts.modsBefore
      : await listModCount(page).catch(() => null);

  log('tempSaveNext', '将要 窄「临时保存」');
  const tempOk = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          el: b,
          t: (b.innerText || '').trim(),
          d: b.disabled,
          w: r.width,
          y: r.y,
        };
      })
      .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d && x.w > 40)
      .sort((a, b) => a.w - b.w || b.y - a.y);
    if (!c[0]) return { ok: false };
    c[0].el.click();
    return { ok: true, w: Math.round(c[0].w) };
  });
  if (!tempOk.ok) {
    const footer = await dumpFooterButtons(page);
    throw new SetTimesStepError('tempSaveNext', '无可用「临时保存」', { footer });
  }
  log('tempSaveNext', '已点临时保存', tempOk);

  // 轮询「下一个」enabled（5–10s），禁止固定 2.2s 一锤
  log('tempSaveNext', `轮询「下一个」enabled ≤${waitNextMs}ms`);
  let nextMeta = null;
  const t0 = Date.now();
  while (Date.now() - t0 < waitNextMs) {
    nextMeta = await page.evaluate(() => {
      const c = Array.from(document.querySelectorAll('button'))
        .map((b) => {
          const r = b.getBoundingClientRect();
          return {
            el: b,
            t: (b.innerText || '').trim(),
            d: b.disabled,
            w: r.width,
            y: r.y,
            h: r.height,
          };
        })
        .filter(
          (x) =>
            (x.t === '下一个' || x.t === '下個') &&
            !x.d &&
            x.h > 10 &&
            x.w > 100,
        )
        .sort((a, b) => b.w - a.w || b.y - a.y);
      if (!c[0]) return null;
      return { w: Math.round(c[0].w), y: Math.round(c[0].y), t: c[0].t };
    });
    if (nextMeta) break;
    await sleep(pollMs);
  }

  if (!nextMeta) {
    const footer = await dumpFooterButtons(page);
    log('tempSaveNext', 'FAIL footer dump', footer);
    throw new SetTimesStepError(
      'tempSaveNext',
      `轮询 ${waitNextMs}ms 后仍无可用「下一个」(enabled 且 w>100)`,
      { footer, waitNextMs, modsBefore },
    );
  }

  log('tempSaveNext', '将要点「下一个」', nextMeta);
  const clicked = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          el: b,
          t: (b.innerText || '').trim(),
          d: b.disabled,
          w: r.width,
          y: r.y,
          h: r.height,
        };
      })
      .filter(
        (x) =>
          (x.t === '下一个' || x.t === '下個') &&
          !x.d &&
          x.h > 10 &&
          x.w > 100,
      )
      .sort((a, b) => b.w - a.w || b.y - a.y);
    if (!c[0]) return false;
    c[0].el.click();
    return true;
  });
  if (!clicked) {
    const footer = await dumpFooterButtons(page);
    throw new SetTimesStepError('tempSaveNext', '点「下一个」瞬间按钮消失/变灰', {
      footer,
      nextMeta,
    });
  }
  log('tempSaveNext', '已点下一个');

  // 点后验收：#name 消失 或 列表出现 修改选项
  const t1 = Date.now();
  let leave = null;
  while (Date.now() - t1 < leaveMs) {
    leave = await page.evaluate(() => {
      const nameEl = document.querySelector('#name');
      const nameVal = nameEl?.value || '';
      const nameVisible =
        !!nameEl &&
        nameEl.getBoundingClientRect().height > 0 &&
        nameEl.getBoundingClientRect().width > 0;
      const mods = Array.from(document.querySelectorAll('button')).filter((b) =>
        /修改选项|修改選項/.test(b.innerText || ''),
      ).length;
      return {
        nameVisible,
        nameVal: nameVal.slice(0, 24),
        mods,
        url: location.href.slice(0, 120),
      };
    });
    // 离开表单（迪士尼/浦东-火车站：列表已出 修改选项 但 #name 可能仍残留 DOM）
    // PASS 条件（任一）：
    //  A) mods≥1 且 #name 不可见或空
    //  B) mods≥modsBefore（已回到列表，优先信列表卡数）
    if (leave.mods >= 1 && (!leave.nameVisible || !leave.nameVal)) {
      log('tempSaveNext', 'PASS 离开表单(name gone)', leave);
      return { mods: leave.mods, modsBefore, leave };
    }
    if (
      leave.mods >= 1 &&
      modsBefore != null &&
      leave.mods >= modsBefore
    ) {
      log('tempSaveNext', 'PASS 列表 mods>=before（#name 可能残留 DOM）', leave);
      return { mods: leave.mods, modsBefore, leave };
    }
    await sleep(pollMs);
  }

  const footer = await dumpFooterButtons(page);
  log('tempSaveNext', 'FAIL 未离开表单', { leave, footer });
  throw new SetTimesStepError(
    'tempSaveNext',
    `点「下一个」后 ${leaveMs}ms 仍未验收离开表单（须 #name 消失 或 修改选项可见）`,
    { leave, footer, modsBefore },
  );
}

export async function dismissLeave(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click(),
  );
  await sleep(350);
}

/**
 * listClean → 修改选项 nth → setTimesChina → tempSaveNext
 * Live 推荐按卡分批：node *-fix-times.mjs 0  再 1；勿与 holidays 同链
 * 一张失败只重跑该 index（仍调本函数；禁止 silent retry 第二套 setTimes）
 * @param {import('playwright').Page} page
 * @param {{ listUrl: string, optionIndex: number, timesOpts?: object }} args
 */
export async function setTimesChinaOnOption(page, { listUrl, optionIndex, timesOpts }) {
  await dismissLeave(page);
  await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismissLeave(page);

  const modsBefore = await listModCount(page);
  await page
    .getByRole('button', { name: /修改选项|修改選項/ })
    .nth(optionIndex)
    .click({ timeout: 15000 });
  await sleep(2500);
  await page.locator('#name').waitFor({ state: 'visible', timeout: 15000 });
  for (let w = 0; w < 30; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await sleep(200);
  }
  const name = await page.locator('#name').inputValue();
  console.log(`\n【setTimesChina】option ${optionIndex}`, name.slice(0, 48));

  // 禁止 retry：一次 setTimesChina，失败即抛
  const tv = await setTimesChina(page, timesOpts);
  const leave = await tempSaveNext(page, { modsBefore });
  await dismissLeave(page);
  return { name, tv, leave, modsBefore };
}
