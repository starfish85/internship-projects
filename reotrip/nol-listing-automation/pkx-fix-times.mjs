/**
 * PKX 时段 — 纯文字定位
 * 1) 重复 小时 添加
 * 2) 选择 nth0=开始 08:00 / nth1=结束 21:30  (getByRole option)
 * 3) 按钮 exact「分钟」→ option「30」→ 读回「一代」enabled
 * 4) 一代 → 弹窗保存 → compact 28 → 临时保存→下一个
 * §52: no setViewport by default; innerWidth gate; one CDP only
 */
import { connectNolPage } from './lib/cdp-session.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DRAFT = '44a8e429-cd58-4630-9c9b-b4ef0ad3899e';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;

const { page } = await connectNolPage({ selfHint: 'pkx-fix-times', killPeers: true });

async function dismiss() {
  await page.keyboard.press('Escape').catch(() => {});
  const elim = page.getByRole('button', { name: /^消除$/ });
  if (await elim.count()) await elim.last().click().catch(() => {});
  await sleep(350);
}

async function listClean() {
  await dismiss();
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  return page.getByRole('button', { name: /修改选项/ }).count();
}

async function readTimes() {
  return page.evaluate(() => {
    const lines = document.body.innerText.split('\n');
    const idx = lines.findIndex((l) => l.trim() === '时间段');
    if (idx < 0) return { count: 0 };
    const slots = (lines[idx + 1] || '')
      .split(/[·.\s]+/)
      .map((s) => s.trim())
      .filter((x) => /^\d{2}:\d{2}$/.test(x));
    return { count: slots.length, first: slots[0], last: slots[slots.length - 1] };
  });
}

async function clockSelectButtons() {
  // 弹窗内「选择」时钟：仅精确文案，按 y 排序
  return page.locator('button').filter({ hasText: /^(选择|選擇)$/ });
}

async function pickClock(selectNth, hour, minute) {
  // 重复添加后：选择[0]=开始 选择[1]=结束（按 y 序）
  const all = page.locator('button').filter({ hasText: /^(选择|選擇)$/ });
  // 取 y 较小的两个时钟（排除底部宽「选择」）
  const idx = await page.evaluate((nth) => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return { i, t, y: r.y, w: r.width, h: r.height, vis: r.height > 10 && r.width > 50 };
      })
      .filter((b) => b.vis && (b.t === '选择' || b.t === '選擇') && b.w < 400)
      .sort((a, b) => a.y - b.y || a.i - b.i);
    return btns[nth]?.i ?? -1;
  }, selectNth);
  if (idx < 0) throw new Error('无时钟选择 nth=' + selectNth);
  const sel = page.locator('button').nth(idx);
  console.log('  pickClock nth', selectNth, 'domIndex', idx);
  await sel.click();
  await sleep(500);
  // 小时 option — 左侧优先：全部匹配后取第一个
  const hourOpt = page.getByRole('option', { name: new RegExp(`^${hour}$`) });
  const hc = await hourOpt.count();
  if (!hc) throw new Error('无小时 option ' + hour);
  // 若多个同文案，取 x 较小的：evaluate click among options
  await page.evaluate((h) => {
    const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
      (el) => (el.innerText || '').trim() === h,
    );
    opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
    opts[0].click();
  }, hour);
  await sleep(300);
  await page.evaluate((m) => {
    const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
      (el) => (el.innerText || '').trim() === m,
    );
    opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
    opts[0].click();
  }, minute);
  await sleep(400);
  const shown = await sel.innerText();
  console.log(`  选择[${selectNth}] →`, shown.trim());
  if (!shown.includes(`${hour}:${minute}`) && !shown.match(new RegExp(`${hour}\\s*:\\s*${minute}`))) {
    // 有的 UI 显示 08:00
    console.log('  warn clock display', shown.trim());
  }
  return shown.trim();
}

async function setIntervalMin30() {
  // 精确文案「分钟」
  const minBtn = page.getByRole('button', { name: /^分钟$/ });
  if (!(await minBtn.count())) throw new Error('无按钮「分钟」');
  await minBtn.click();
  console.log('  已点「分钟」');
  await sleep(500);

  let opt30 = page.getByRole('option', { name: /^30$/ });
  if (!(await opt30.count())) {
    // 再点间隔值「选择」第 3 个
    const third = page.getByRole('button', { name: /^(选择|選擇)$/ }).nth(2);
    if (await third.count()) {
      await third.click();
      await sleep(500);
    }
    opt30 = page.getByRole('option', { name: /^30$/ });
  }
  if (!(await opt30.count())) throw new Error('无 option「30」— 分钟间隔未打开');
  await opt30.last().click();
  console.log('  已点 option「30」');
  await sleep(500);

  // 读回：一代 must enable
  for (let i = 0; i < 10; i++) {
    const gen = page.getByRole('button', { name: /^(一代|生成|생성)$/ });
    const dis = await gen.isDisabled().catch(() => true);
    const t = await gen.innerText().catch(() => '');
    console.log('  生成读回', { t: t.trim(), disabled: dis });
    if (!dis) return true;
    await sleep(300);
  }
  throw new Error('一代仍灰：分钟30未生效');
}

async function setTimesOnOpenForm() {
  // 打开时段
  const setBtn = page.getByRole('button', { name: /^设置时间$/ });
  if (await setBtn.count()) {
    await setBtn.click();
    await sleep(1800);
  } else {
    await page.locator('button[aria-label="더 보기"]').first().click({ force: true }).catch(() => {});
    await sleep(400);
    await page.getByText(/^编辑$/).first().click().catch(() => {});
    await sleep(1200);
  }

  // 必须先 重复 小时 添加（enabled 时）
  const rep = page.getByRole('button', { name: /重复\s*小时\s*添加/ });
  if (!(await rep.count())) throw new Error('无 重复 小时 添加');
  if (!(await rep.isDisabled())) {
    await rep.click();
    console.log('  已点 重复 小时 添加');
  } else {
    console.log('  重复 小时 添加 已展开(disabled)');
  }
  // 等展开：≥2 个窄「选择」时钟 + 分钟 + 一代
  let clockN = 0;
  for (let i = 0; i < 20; i++) {
    clockN = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).filter((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '选择' || t === '選擇') && r.height > 10 && r.width > 50 && r.width < 400;
      }).length,
    );
    const hasMin = await page.getByRole('button', { name: /^分钟$/ }).count();
    console.log('  等待展开 clocks', clockN, '分钟', hasMin);
    if (clockN >= 2 && hasMin) break;
    await sleep(300);
  }
  if (clockN < 2) throw new Error('选择不足，重复添加未生效 clocks=' + clockN);

  console.log('  【将要】开始 08:00');
  await pickClock(0, '08', '00');
  // 开始填完后钮文案变 08:00，结束 = 仍显示「选择」的第一个窄时钟
  console.log('  【将要】结束 21:30');
  await pickClock(0, '21', '30');
  console.log('  【将要】间隔 分钟 + 30');
  await setIntervalMin30();

  // 一代 — 须 enabled
  const gen = page.getByRole('button', { name: /^(一代|生成|생성)$/ });
  for (let i = 0; i < 15; i++) {
    if (!(await gen.isDisabled().catch(() => true))) break;
    await sleep(200);
  }
  if (await gen.isDisabled()) throw new Error('一代仍灰');
  await gen.click();
  console.log('  已点一代');
  await sleep(2800);

  // 弹窗保存（dialog 内）
  await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role=dialog]'));
    const last = dialogs[dialogs.length - 1];
    Array.from(last?.querySelectorAll('button') || [])
      .find((b) => (b.innerText || '').trim() === '保存' && !b.disabled)
      ?.click();
  });
  console.log('  已点弹窗保存');
  await sleep(1500);

  const tv = await readTimes();
  console.log('  compact', tv);
  return tv;
}

async function tempSaveNext() {
  // 文案 临时保存 / 下一个；宽窄仅区分同文案
  const temps = page.getByRole('button', { name: /^(临时保存|臨時存儲)$/ });
  const tc = await temps.count();
  // 选较窄的：evaluate among matching text
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b) => ({ el: b, t: (b.innerText || '').trim(), d: b.disabled, w: b.getBoundingClientRect().width }))
      .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d)
      .sort((a, b) => a.w - b.w);
    c[0].el.click();
  });
  console.log('  临时保存 clicked, count was', tc);
  await sleep(2200);
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b) => ({ el: b, t: (b.innerText || '').trim(), d: b.disabled, w: b.getBoundingClientRect().width }))
      .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d)
      .sort((a, b) => b.w - a.w);
    c[0].el.click();
  });
  console.log('  下一个 clicked');
  await sleep(3200);
  await dismiss();
}

// ---- main ----
let n = await listClean();
console.log('【结果】选项', n);
const results = [];

for (let i = 0; i < n; i++) {
  console.log('\n======== option', i, '========');
  await listClean();
  await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
  await sleep(2800);
  for (let w = 0; w < 30; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await sleep(200);
  }
  const name = await page.locator('#name').inputValue();
  console.log('【将要】时段', name.slice(0, 42));

  let tv = { count: 0 };
  try {
    tv = await setTimesOnOpenForm();
  } catch (e) {
    console.log('FAIL', e.message);
  }
  if (tv.count !== 28 || tv.first !== '08:00' || tv.last !== '21:30') {
    console.log('retry');
    try {
      // 可能弹窗还开着
      await dismiss();
      await sleep(500);
      // 重新打开修改? 若仍在 form
      if (!(await page.locator('#name').count())) {
        await listClean();
        await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
        await sleep(2500);
      }
      tv = await setTimesOnOpenForm();
    } catch (e) {
      console.log('FAIL2', e.message);
      tv = await readTimes();
    }
  }

  console.log('【将要】临时保存→下一个');
  await tempSaveNext();
  results.push({ i, name: name.slice(0, 40), tv });
}

// 二次验收
console.log('\n【二次验收】');
const verify = [];
n = await listClean();
for (let i = 0; i < n; i++) {
  await listClean();
  await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
  await sleep(2500);
  for (let w = 0; w < 30; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await sleep(200);
  }
  const tv = await readTimes();
  const name = (await page.locator('#name').inputValue()).slice(0, 40);
  const ok = tv.count === 28 && tv.first === '08:00' && tv.last === '21:30';
  console.log(ok ? 'PASS' : 'FAIL', i, name, tv);
  verify.push({ i, name, tv, ok });
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b) => ({ el: b, t: (b.innerText || '').trim(), d: b.disabled, w: b.getBoundingClientRect().width }))
      .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d)
      .sort((a, b) => b.w - a.w);
    c[0]?.el.click();
  });
  await sleep(2000);
  await dismiss();
}

await listClean();
await page.getByRole('button', { name: /^临时保存$/ }).first().click().catch(() => {});
await sleep(1200);
console.log('DONE', JSON.stringify({ results, verify }, null, 2));
process.exit(verify.every((v) => v.ok) ? 0 : 2);
