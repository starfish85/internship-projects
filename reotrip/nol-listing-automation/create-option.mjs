import { chromium } from 'playwright';

const PRODUCT_ID = 'b6e560d4-d4d3-4726-b08c-f5623499895a';
const BASE = `https://tour.triple.partners/product-management/registration/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`;

const OPTIONS = [
  {
    name: '도쿄 시내 호텔 출발 → 하네다공항(HND) 편도 이동 (10인승 차량)',
    desc: '도쿄 시내 호텔 출발 → 하네다공항(HND) 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '10seat go',
    priceTypeDesc: '10인승 차량',
    price: '105',
  },
  {
    name: '하네다공항(HND) 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)',
    desc: '하네다공항(HND) 출발 → 도쿄 시내 호텔 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '7seat rtn',
    priceTypeDesc: '7인승 차량',
    price: '70',
  },
  {
    name: '하네다공항(HND) 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)',
    desc: '하네다공항(HND) 출발 → 도쿄 시내 호텔 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
    priceTypeName: '10seat rtn',
    priceTypeDesc: '10인승 차량',
    price: '105',
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
  await page.bringToFront();

  // Close any open option form
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(500);

  for (const opt of OPTIONS) {
    console.log('\n=== Creating', opt.name, '===');
    await createOption(page, opt);
    await sleep(2000);
  }

  // Final list check + temp save
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const text = await page.locator('body').innerText();
  console.log('\n=== FINAL LIST ===');
  console.log(text.slice(0, 3500));

  // Temporary save exact button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) => (b.innerText || '').trim() === '臨時存儲' && !b.disabled);
    buttons[buttons.length - 1]?.click();
  });
  await sleep(2000);
  console.log('temp save done');
  console.log((await page.locator('body').innerText()).slice(-400));
  await page.screenshot({ path: '/tmp/nol-haneda-final.png', fullPage: true });
  await browser.close();
}

async function createOption(page, opt) {
  // Open new option form
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '註冊/添加選項');
    b?.click();
  });
  await sleep(2000);
  if (!(await page.locator('#name').count())) throw new Error('form not open');

  await page.locator('#name').fill(opt.name);
  await page.locator('#description').fill(opt.desc);
  await page.locator('input[name="rule.bookingRule.minimumPurchaseQuantityPerSession"]').fill('1');
  await page.locator('input[name="rule.bookingRule.maximumPurchaseQuantityPerSession"]').fill('10');

  // Price type
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').includes('가격 타입 선택'));
    b?.click();
  });
  await sleep(800);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').includes('기타 가격 타입'));
    b?.click();
  });
  await sleep(1000);
  await page.locator('input[placeholder="輸入的名稱將顯示在銷售渠道上。"]').fill(opt.priceTypeName);
  await page.locator('input[placeholder="例) 滿 19 歲以上"]').fill(opt.priceTypeDesc);
  const nameless = page.locator('input[type=tel]:not([name])');
  if ((await nameless.count()) >= 2) {
    await nameless.nth(0).fill('1');
    await nameless.nth(1).fill('10');
  }
  // required + representative
  await page.locator('[aria-labelledby="ETC-required-label"]').click({ force: true }).catch(() => {});
  await page.locator('[aria-labelledby="ETC-representative-label"]').click({ force: true }).catch(() => {});
  await sleep(200);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '완료');
    b?.click();
  });
  await sleep(1500);

  // Refill name (can be overwritten)
  await page.locator('#name').fill(opt.name);
  await page.locator('#description').fill(opt.desc);

  // 1 year + price
  await page.locator('input[value="ONE_YEAR"]').check({ force: true }).catch(async () => {
    await page.locator('label').filter({ hasText: /^1年$/ }).click({ force: true });
  });
  await sleep(1200);
  const price = page.locator('input[placeholder="請輸入價格"]');
  await price.click({ force: true });
  await price.fill(opt.price);
  await sleep(500);
  await page.locator('#name').click();
  await sleep(800);
  console.log('price set', await price.inputValue().catch(() => '?'));

  // Times
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').includes('設定時間'));
    b?.click();
  });
  await sleep(1200);
  await page.getByText('반복 시간 추가', { exact: true }).click({ force: true });
  await sleep(1000);

  // Start 07:00
  await page.locator('button').filter({ hasText: /^选择$/ }).nth(0).click();
  await sleep(600);
  await page.evaluate(() => {
    const hours = Array.from(document.querySelectorAll('*')).filter(
      (el) => (el.innerText || '').trim() === '07' && el.children.length === 0 && el.getBoundingClientRect().width > 0,
    );
    hours.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
    hours[0]?.click();
  });
  await sleep(200);
  await page.evaluate(() => {
    const mins = Array.from(document.querySelectorAll('*')).filter(
      (el) => (el.innerText || '').trim() === '00' && el.children.length === 0 && el.getBoundingClientRect().width > 0,
    );
    mins.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
    mins[0]?.click();
  });
  await sleep(400);
  // End 21:30 - second 选择
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      return t === '选择' || /^\d{2}:\d{2}$/.test(t);
    });
    // click the one still saying 选择 for end time, or second field
    const endBtn = buttons.find((b, i) => i > 0 && (b.innerText || '').trim() === '选择') || buttons[1];
    endBtn?.click();
  });
  await sleep(600);
  await page.evaluate(() => {
    const hours = Array.from(document.querySelectorAll('*')).filter(
      (el) => (el.innerText || '').trim() === '21' && el.children.length === 0 && el.getBoundingClientRect().width > 0,
    );
    hours.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
    hours[0]?.click();
  });
  await sleep(200);
  await page.evaluate(() => {
    const mins = Array.from(document.querySelectorAll('*')).filter(
      (el) => (el.innerText || '').trim() === '30' && el.children.length === 0 && el.getBoundingClientRect().width > 0,
    );
    mins.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
    mins[0]?.click();
  });
  await sleep(400);

  // Interval 30 min
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '分鐘');
    b?.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button,div,li')).filter(
      (el) => (el.innerText || '').trim() === '30' && el.getBoundingClientRect().width > 0 && el.children.length <= 1,
    );
    els[els.length - 1]?.click();
  });
  await sleep(300);

  // Generate
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '생성');
    b?.click();
  });
  await sleep(2000);
  const body = await page.locator('body').innerText();
  const times = [...body.matchAll(/\b([01]\d|2[0-3]):[0-5]\d\b/g)].map((m) => m[0]);
  const unique = [...new Set(times)].filter((t) => t !== '11:01' && t !== '11:14' && t !== '11:15');
  console.log('times', unique.length, unique[0], unique[unique.length - 1]);

  // Save time
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '節省');
    b?.click();
  });
  await sleep(1500);

  // Refill name again and save option
  await page.locator('#name').fill(opt.name);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) => (b.innerText || '').trim() === '下個' && !b.disabled);
    buttons[buttons.length - 1]?.click();
  });
  await sleep(3000);
  const listText = await page.locator('body').innerText();
  console.log('card present?', listText.includes(opt.name.slice(0, 20)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
