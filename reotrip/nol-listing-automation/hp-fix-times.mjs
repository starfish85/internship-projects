/**
 * 哈利波特 时段 — Japan 07:00–21:30 ×30 via setTimesChina opts
 * usage: node hp-fix-times.mjs <0|1|2|3>
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

const __dir = dirname(fileURLToPath(import.meta.url));
const DRAFT = process.env.HP_DRAFT || readFileSync(join(__dir, '.hp-draft-id'), 'utf8').trim();
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const arg = process.argv[2];
if (arg === undefined) {
  console.error('用法: node hp-fix-times.mjs <optionIndex>');
  process.exit(2);
}

const JAPAN = { startHour: '07', startMin: '00', endHour: '21', endMin: '30', expectCount: 30 };

const { page } = await connectNolPage({ selfHint: 'hp-fix-times', killPeers: true });

console.log(`
【本轮验收·日本时段】
start 07:00 · end 21:30 · 分钟30 · compact count===30
实现：lib/set-times-china.mjs + timesOpts
`);

await dismissLeave(page);
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
const n = await page.getByRole('button', { name: /修改选项/ }).count();
const indices =
  arg === 'all' ? [...Array(n).keys()] : [Number(arg)].filter((i) => i >= 0 && i < n);

for (const i of indices) {
  try {
    const r = await setTimesChinaOnOption(page, {
      listUrl: LIST,
      optionIndex: i,
      timesOpts: JAPAN,
    });
    console.log('【结果】PASS', i, r.tv);
  } catch (e) {
    const step = e instanceof SetTimesStepError ? e.step : e?.step || 'unknown';
    console.log('【失败】option', i, 'step=', step);
    console.log('【失败】message', e?.message || e);
    if (e?.readback) console.log('【失败】readback', JSON.stringify(e.readback, null, 2));
    process.exit(2);
  }
}

// 二次只读（goto 失败不致命）
for (const i of indices) {
  try {
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
    const ok = tv.count === 30 && tv.first === '07:00' && tv.last === '21:30';
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
  } catch (e) {
    console.log('【警告】二次验收导航异常（主流程已 PASS 时可忽略）', e?.message || e);
  }
}
process.exit(0);
