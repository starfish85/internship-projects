import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DRAFT = 'e5845150-f3bc-47c0-8923-41188c293ad1';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const CITY = '베이징 시내 호텔';
const DEST = '베이징 수도국제공항(PEK)';
const isRtn = process.argv[2] === 'rtn';
const OPT = isRtn ? {
  key: '7rtn',
  name: `${DEST} 출발 → ${CITY} 편도 이동 (7인승 차량)`,
  desc: `${DEST} 출발 → ${CITY} 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 4개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
  pt: '7인승 오는', ptd: '7인승 차량', price: '320',
} : {
  key: '7go',
  name: `${CITY} 출발 → ${DEST} 편도 이동 (7인승 차량)`,
  desc: `${CITY} 출발 → ${DEST} 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 4개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
  pt: '7인승 가는', ptd: '7인승 차량', price: '218',
};

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('triple.partners'));
await page.bringToFront();

async function dismiss() {
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => (b.innerText||'').trim()==='消除')?.click());
  await sleep(300);
}
async function clickBtn(src) {
  const t = await page.evaluate((src) => {
    const re = new RegExp(src);
    const b = Array.from(document.querySelectorAll('button')).find(x => re.test((x.innerText||'').trim()) && !x.disabled);
    if (!b) return null;
    b.scrollIntoView({ block: 'center' }); b.click();
    return (b.innerText||'').trim().slice(0,40);
  }, src);
  console.log('click', src, t);
  await sleep(600);
  return t;
}
async function reactFill(sel, val) {
  const loc = page.locator(sel).first();
  await loc.click({ force: true });
  await loc.fill(String(val));
}

console.log('CREATE', OPT.key);
await dismiss();
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
if (await page.evaluate((n) => document.body.innerText.includes(n.slice(0,28)), OPT.name)) {
  // §51/§54: 已存在也要读回验收，不能 silent exit 0 当“做好”
  const mods = await page.getByRole('button', { name: /修改选项/ }).count();
  console.log('【读回值】option exists mods=', mods, 'name snippet ok');
  if (mods < 1) {
    console.log('【失败】name visible but no 修改选项');
    process.exit(2);
  }
  console.log('【结果】exists PASS');
  process.exit(0);
}
await clickBtn('注册/添加选项');
await sleep(2500);
await page.waitForSelector('#name', { timeout: 15000 });
await reactFill('#name', OPT.name);
await reactFill('#description', OPT.desc);
await reactFill('input[name="rule.bookingRule.minimumPurchaseQuantityPerSession"]', '1');
await reactFill('input[name="rule.bookingRule.maximumPurchaseQuantityPerSession"]', '10');

await clickBtn('选择价格类型'); await sleep(1800);
await clickBtn('其他价格类型'); await sleep(1200);
await reactFill('input[placeholder*="输入的名称"], input[placeholder*="輸入的名稱"], input[placeholder*="销售渠道"]', OPT.pt);
await reactFill('input[placeholder*="滿 19"], input[placeholder*="满 19"], input[placeholder*="例)"]', OPT.ptd);
await page.evaluate(() => {
  for (const id of ['ETC-required-label','ETC-representative-label']) {
    const box = document.querySelector(`[aria-labelledby="${id}"]`);
    if (box && box.getAttribute('aria-checked') !== 'true') box.click();
  }
});
await sleep(300);
await clickBtn('^完成$'); await sleep(1800);
await reactFill('#name', OPT.name);

await page.evaluate(() => {
  const r = document.querySelector('input[value=ONE_YEAR]');
  if (r && !r.checked) (r.closest('label')||r).click();
});
await page.getByText('1年', { exact: true }).click({ force: true }).catch(()=>{});
await sleep(1500);
await page.evaluate((p) => {
  const el = Array.from(document.querySelectorAll('input')).find(i => /请输入价格|請輸入價格/.test(i.placeholder||''));
  if (!el || el.disabled) return;
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  s.call(el,p); el.dispatchEvent(new Event('input',{bubbles:true}));
  const pk = Object.keys(el).find(k=>k.startsWith('__reactProps'));
  el[pk]?.onChange?.({target:{value:p},currentTarget:{value:p},preventDefault(){},stopPropagation(){},persist(){}});
}, OPT.price);
console.log('price', await page.evaluate(() => Array.from(document.querySelectorAll('input')).find(i=>/价格|價格/.test(i.placeholder||''))?.value));

// times lighter: still try; fix later if fail
await clickBtn('^设置时间$'); await sleep(1500);
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(x => {
  const t=(x.innerText||'').replace(/\s+/g,' ').trim();
  return t==='重复 小时 添加' || t.includes('반복 시간 추가');
})?.click());
await sleep(1000);
async function pickTime(idx, hour, minute) {
  const fields = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map((b,i) => {
      const t=(b.innerText||'').trim(); const r=b.getBoundingClientRect();
      return {i,t,vis:r.height>20&&r.width>80&&r.y>80};
    }).filter(b => b.vis && (b.t==='选择'||b.t==='選擇'||/^\d{2}:\d{2}$/.test(b.t)))
  );
  const target = fields[idx];
  if (!target) return console.log('no field', idx, fields);
  await page.evaluate((i) => document.querySelectorAll('button')[i].click(), target.i);
  await sleep(400);
  await page.evaluate((h) => {
    const opts = Array.from(document.querySelectorAll('[role=option]')).filter(el => (el.innerText||'').trim()===h);
    opts.sort((a,b)=>a.getBoundingClientRect().x-b.getBoundingClientRect().x);
    opts[0]?.click();
  }, hour);
  await sleep(200);
  await page.evaluate((m) => {
    const opts = Array.from(document.querySelectorAll('[role=option]')).filter(el => (el.innerText||'').trim()===m);
    opts.sort((a,b)=>b.getBoundingClientRect().x-a.getBoundingClientRect().x);
    opts[0]?.click();
  }, minute);
  await sleep(300);
}
await pickTime(0,'08','00');
await pickTime(1,'21','30');
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(x => /分钟|分鐘/.test((x.innerText||'').trim()) && (x.innerText||'').trim().length<12)?.click());
await sleep(300);
await page.evaluate(() => Array.from(document.querySelectorAll('[role=option],li,div,button')).find(e => (e.innerText||'').trim()==='30' && (e.children?.length||0)<=1)?.click());
await sleep(300);
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => /^(生成|一代|생성)$/.test((b.innerText||'').trim()) && !b.disabled)?.click());
await sleep(2500);
await page.evaluate(() => {
  const dialogs = Array.from(document.querySelectorAll('[role=dialog]'));
  const last = dialogs[dialogs.length-1];
  Array.from((last||document).querySelectorAll('button')).find(b => (b.innerText||'').trim()==='保存' && !b.disabled)?.click();
});
await sleep(1500);
const times = await page.evaluate(() => {
  const m = document.body.innerText.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
  if (!m) return {count:0};
  const slots = m[1].split(/[·.\s]+/).map(s=>s.trim()).filter(x=>/^\d{2}:\d{2}$/.test(x));
  return {count:slots.length, first:slots[0], last:slots.at(-1)};
});
console.log('times', times);
await reactFill('#name', OPT.name);

// 临时保存 → 下一个
await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll('button')).map(b => {
    const r=b.getBoundingClientRect();
    return {el:b,t:(b.innerText||'').trim(),d:b.disabled,w:r.width};
  }).filter(x => (x.t==='临时保存'||x.t==='臨時存儲')&&!x.d).sort((a,b)=>a.w-b.w);
  c[0]?.el.click();
});
await sleep(2500);
await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll('button')).map(b => {
    const r=b.getBoundingClientRect();
    return {el:b,t:(b.innerText||'').trim(),d:b.disabled,w:r.width};
  }).filter(x => (x.t==='下一个'||x.t==='下個')&&!x.d).sort((a,b)=>b.w-a.w);
  c[0]?.el.click();
});
await sleep(3500);
await dismiss();
await page.goto(LIST, { waitUntil:'domcontentloaded' });
await sleep(2500);
const list = await page.evaluate(() => ({
  mods: Array.from(document.querySelectorAll('button')).filter(b=>(b.innerText||'').includes('修改选项')).length,
  cals: Array.from(document.querySelectorAll('button')).filter(b=>(b.innerText||'').includes('销售日历管理')).length,
}));
console.log('LIST', list, 'NEVER approval');
process.exit(list.mods >= 1 ? 0 : 2);
