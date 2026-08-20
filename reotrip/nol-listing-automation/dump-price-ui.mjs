import { connectNolPage } from './lib/cdp-session.mjs';
const { page } = await connectNolPage({ selfHint: 'dump-price', killPeers: true, forceViewport: true, viewport: { width: 1440, height: 900 } });
const id = 'b6e560d4-d4d3-4726-b08c-f5623499895a';
await page.goto(`https://tour.triple.partners/product-management/registration/option?id=${id}&status=UNPUBLISHED&lang=zh-tw`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /修改选项/ }).first().click();
await page.waitForTimeout(2500);
const dump = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input,textarea,select')).map(el => ({
    tag: el.tagName, name: el.name, id: el.id, ph: el.placeholder||'', type: el.type||'',
    v: (el.value||'').slice(0,40), dis: el.disabled,
    y: Math.round(el.getBoundingClientRect().y),
  })).filter(x => x.y>0 && x.y<2000 && x.type!=='hidden' && x.type!=='checkbox' && x.type!=='radio' && x.type!=='file');
  const btns = Array.from(document.querySelectorAll('button')).map(b=>({t:(b.innerText||'').trim().slice(0,30), d:b.disabled})).filter(b=>/价格|價|日历|日曆|销售|期間|期间|时间|時間|保存|下一个/.test(b.t));
  return { inputs, btns };
});
console.log(JSON.stringify(dump, null, 2));
// try open 销售日历
await page.getByText(/销售日历|銷售日曆|销售日历管理/).first().click({timeout:3000}).catch(()=>{});
await page.waitForTimeout(1500);
const cal = await page.evaluate(() => {
  const cells = Array.from(document.querySelectorAll('[class*="custom-day"], td.rdp-cell, [class*="sale-period"]')).slice(0,20).map(e=>(e.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean);
  const body = (document.body.innerText||'').match(/\d+\n\d+/g)?.slice(0,10);
  return { cells: cells.slice(0,15), body };
});
console.log('cal', cal);
process.exit(0);
