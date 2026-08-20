import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl } from './lib/japan-audit-fix.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = '09714a30-dc94-4378-a238-ed8a37a5d234';
const { page } = await connectNolPage({ selfHint: 'v-tks', killPeers: true, forceViewport: true, viewport: { width: 1440, height: 900 } });

async function readCal(i) {
  await dismiss(page);
  await page.goto(optionUrl(ID), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
  await sleep(2500);
  for (let w = 0; w < 20; w++) {
    if (await page.locator('#name').inputValue().catch(() => '')) break;
    await sleep(200);
  }
  // scroll down hard
  await page.evaluate(() => window.scrollTo(0, 2500));
  await sleep(400);
  await page.getByText(/销售日历|期间选择|期間/).first().scrollIntoViewIfNeeded().catch(() => {});
  await sleep(400);
  const cal = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const prices = [];
    const re = /(?:^|\n)(\d{1,2})\n(\d{2,5})(?=\n|$)/g;
    let m;
    while ((m = re.exec(body)) && prices.length < 50) prices.push(m[2]);
    return { uniq: [...new Set(prices)], sample: prices.slice(0, 8), name: document.querySelector('#name')?.value?.slice(0, 50) };
  });
  // try fill 1176 if empty
  if (!cal.uniq.includes('1176') && !cal.uniq.includes('784')) {
    console.log('  empty calendar, try set 1176');
    await page.getByText(/1年|一年/).first().click({ timeout: 2000 }).catch(() => {});
    await sleep(400);
    const ph = page.getByPlaceholder(/请输入价格|請輸入價格/);
    if (await ph.count()) {
      await ph.fill('1176');
    } else {
      await page.evaluate(() => {
        const p = Array.from(document.querySelectorAll('input')).find((e) => /价格|價格/.test(e.placeholder || ''));
        if (!p) return;
        const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        d.set.call(p, '1176');
        p.dispatchEvent(new Event('input', { bubbles: true }));
        p.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
        .filter((b) => /临时保存|臨時存儲/.test((b.innerText || '').trim()) && !b.disabled)
        .sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width);
      btns[0]?.click();
    });
    await sleep(2000);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
        .filter((b) => /下一个|下個/.test((b.innerText || '').trim()) && !b.disabled)
        .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);
      btns[0]?.click();
    });
    await sleep(2000);
    return { ...cal, fixed: true };
  }
  // leave
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /下一个|下個/.test((x.innerText || '').trim()) && !x.disabled);
    b?.click();
  });
  await sleep(1200);
  return cal;
}

for (const i of [1, 3]) {
  console.log('opt', i);
  const r = await readCal(i);
  console.log(r);
  if (r.fixed) {
    const r2 = await readCal(i);
    console.log('after', r2);
  }
}
process.exit(0);
