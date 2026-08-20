/**
 * 浦东机场 PVG 时段 — 仅调用 lib/set-times-china.mjs
 * usage: node hsz-fix-times.mjs <0|1|…>   # Live 按卡分批；禁止默认 all 与 holidays 同链
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import {
  setTimesChinaOnOption,
  readTimesCompact,
  dismissLeave,
  SetTimesStepError,
} from './lib/set-times-china.mjs';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __hszDir = dirname(fileURLToPath(import.meta.url));
const DRAFT = process.env.HSZ_DRAFT || readFileSync(join(__hszDir, '.hsz-draft-id'), 'utf8').trim();

const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const arg = process.argv[2];
if (!arg) {
  console.error('用法: node hsz-fix-times.mjs <optionIndex|all>  — Live 请按卡: 0 然后 1；勿与 holidays 同链');
  process.exit(2);
}
if (arg === 'all') console.warn('【警告】all 会连跑多卡；Live 推荐分批 0 / 1');


const { page } = await connectNolPage({ selfHint: 'hsz-fix-times', killPeers: true });

console.log(`
【本轮验收·时段 8 步】
1 open  2 repeat(≥2时钟)  3 start→08:00  4 end→21:30
5 分钟+30→一代enabled  6 生成  7 弹窗保存  8 compact 28
实现：lib/set-times-china.mjs · FAIL 即停 · 禁止 retry / 禁止手搓第二套
`);

await dismissLeave(page);
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
const n = await page.getByRole('button', { name: /修改选项/ }).count();
const indices =
  arg === 'all' ? [...Array(n).keys()] : [Number(arg)].filter((i) => i >= 0 && i < n);

for (const i of indices) {
  try {
    const r = await setTimesChinaOnOption(page, { listUrl: LIST, optionIndex: i });
    console.log('【结果】PASS', i, r.tv);
  } catch (e) {
    const step = e instanceof SetTimesStepError ? e.step : (e?.step || 'unknown');
    console.log('【失败】option', i, 'step=', step);
    console.log('【失败】message', e?.message || e);
    if (e?.readback) console.log('【失败】readback', JSON.stringify(e.readback, null, 2));
    console.log('【提示】只重跑本卡: node hsz-fix-times.mjs', i, '；勿 silent 换第二套 setTimes');
    process.exit(2);
  }
}

// 二次只读
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
  console.log(ok ? '二次 PASS' : '二次 FAIL', i, tv);
  if (!ok) process.exit(2);
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
process.exit(0);
