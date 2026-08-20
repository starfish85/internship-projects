import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl } from './lib/japan-audit-fix.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c';
const { page } = await connectNolPage({
  selfHint: 'fix-shin',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

await page.goto(optionUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2000);
const n = await page.getByRole('button', { name: /修改选项/ }).count();
console.log('options', n);
for (let i = 0; i < n; i++) {
  await page.goto(optionUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1800);
  await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
  await sleep(2200);
  const name = await page.locator('#name').inputValue();
  const desc = await page.locator('#description').inputValue().catch(() => '');
  if (!/신오사카/.test(name + desc)) {
    console.log(i, 'clean', name.slice(0, 40));
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => /下一个|下個/.test((x.innerText || '').trim()) && !x.disabled);
      b?.click();
    });
    await sleep(1000);
    continue;
  }
  const newName = name.replace(/오사카역\/신오사카역/g, '오사카역').replace(/신오사카역/g, '오사카역');
  const newDesc = desc.replace(/오사카역\/신오사카역/g, '오사카역').replace(/신오사카역/g, '오사카역');
  console.log('【将要】去新大阪', i, name.slice(0, 50), '→', newName.slice(0, 50));
  await page.locator('#name').fill(newName);
  if (desc) await page.locator('#description').fill(newDesc);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => ({ el: b, t: (b.innerText || '').trim(), d: b.disabled, w: b.getBoundingClientRect().width }))
      .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d)
      .sort((a, b) => a.w - b.w);
    btns[0]?.el.click();
  });
  await sleep(2000);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => ({ el: b, t: (b.innerText || '').trim(), d: b.disabled, w: b.getBoundingClientRect().width }))
      .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d && x.w > 100)
      .sort((a, b) => b.w - a.w);
    btns[0]?.el.click();
  });
  await sleep(2000);
  console.log('【结果】saved', i);
}
// verify no 신오사카
await page.goto(optionUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2000);
const body = await page.locator('body').innerText();
console.log('still has 신오사카?', body.includes('신오사카'));
console.log('未点提交审核');
process.exit(0);
