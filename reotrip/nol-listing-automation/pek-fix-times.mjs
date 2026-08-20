/**
 * PEK 时段 — 仅调用 lib/set-times-china.mjs（§40 唯一实现）
 * 禁止在本文件内再写 setTimes / retry 碰运气
 * usage: node pek-fix-times.mjs [optionIndex|all]
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import {
  setTimesChinaOnOption,
  readTimesCompact,
  dismissLeave,
  SetTimesStepError,
} from './lib/set-times-china.mjs';

const DRAFT = 'e5845150-f3bc-47c0-8923-41188c293ad1';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;

const arg = process.argv[2];
if (!arg) {
  console.error('用法: node pek-fix-times.mjs <optionIndex|all>  — Live 请按卡: 0 然后 1；勿与 holidays 同链');
  process.exit(2);
}
if (arg === 'all') console.warn('【警告】all 会连跑多卡；Live 推荐分批 0 / 1');

const { page } = await connectNolPage({ selfHint: 'pek-fix-times', killPeers: true });

console.log(`
【本轮验收·时段 8 步】
1 open    设置时间/⋯编辑 → 弹窗有「重复 小时 添加」
2 repeat  同排 ≥2 时钟钮（选择|HH:MM，宽180–300）
3 start   左钮读回 08:00
4 end     右钮读回 21:30
5 interval exact「分钟」+ option 30 → 一代 enabled
6 generate 点一代/生成
7 modalSave 弹窗「保存」
8 compact count===28 && first==='08:00' && last==='21:30'
实现：lib/set-times-china.mjs · 任一步 FAIL 即停 · 禁止 retry
`);

await dismissLeave(page);
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
const n = await page.getByRole('button', { name: /修改选项/ }).count();
console.log('【结果】选项', n);

const indices =
  arg === 'all' ? [...Array(n).keys()] : [Number(arg)].filter((i) => i >= 0 && i < n);

const results = [];
for (const i of indices) {
  try {
    const r = await setTimesChinaOnOption(page, { listUrl: LIST, optionIndex: i });
    results.push({ i, ok: true, ...r });
    console.log('【结果】PASS option', i, r.tv);
  } catch (e) {
    const step = e instanceof SetTimesStepError ? e.step : e?.step || 'unknown';
    console.log('【失败】option', i, 'step=', step);
    console.log('【失败】message', e?.message || e);
    if (e?.readback) console.log('【失败】readback', JSON.stringify(e.readback, null, 2));
    console.log('【提示】只重跑本卡: node pek-fix-times.mjs', i, '；改 lib 再跑，禁止手搓第二套 / silent retry');
    process.exit(2);
  }
}

// 二次验收（只读，不改）
console.log('\n【二次验收】');
const verify = [];
for (const i of indices) {
  await dismissLeave(page);
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
  await new Promise((r) => setTimeout(r, 2500));
  for (let w = 0; w < 30; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const tv = await readTimesCompact(page);
  const ok = tv.count === 28 && tv.first === '08:00' && tv.last === '21:30';
  console.log(ok ? 'PASS' : 'FAIL', i, tv);
  verify.push({ i, tv, ok });
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b) => ({
        el: b,
        t: (b.innerText || '').trim(),
        d: b.disabled,
        w: b.getBoundingClientRect().width,
      }))
      .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d)
      .sort((a, b) => b.w - a.w);
    c[0]?.el.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  await dismissLeave(page);
}

const allOk = verify.every((v) => v.ok);
console.log('DONE', JSON.stringify({ results, verify }, null, 2));
process.exit(allOk ? 0 : 2);
