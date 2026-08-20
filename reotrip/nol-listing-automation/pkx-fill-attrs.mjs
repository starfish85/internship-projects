/**
 * PKX 属性 — §51 真选中门禁 · §56 POI 真验收
 * draft 44a8e429-cd58-4630-9c9b-b4ef0ad3899e
 * §52: no setViewport by default; innerWidth gate; one CDP only
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { clickSaveThenAfterPoiGate, PoiGateError } from './lib/poi-gate.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DRAFT = '44a8e429-cd58-4630-9c9b-b4ef0ad3899e';
const PRODUCT_KO =
  '베이징 시내 호텔 ↔ 베이징 다싱국제공항(PKX) 단독 차량 편도 이동 서비스';
const INTERNAL = '北京市区酒店-北京大兴机场';
const URL = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;

const { page } = await connectNolPage({ selfHint: 'pkx-fill-attrs', killPeers: true });
await page.keyboard.press('Escape').catch(() => {});
await sleep(200);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(3500);

async function setInput(sel, val) {
  console.log('【将要】fill', sel, val);
  const before = await page.locator(sel).first().inputValue().catch(() => null);
  console.log('【点前】', sel, before);
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.focus();
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, String(val));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { sel, val },
  );
  await page.locator(sel).first().fill(String(val)).catch(() => {});
  await sleep(200);
  const after = await page.locator(sel).first().inputValue().catch(() => '?');
  console.log('【读回】', sel, after);
  return after === String(val);
}

// 标题
console.log('【将要】标题/内部名');
await page.locator('#title, input[name=title]').first().fill(PRODUCT_KO);
await page.locator('#managementTitle, input[name=managementTitle]').first().fill(INTERNAL);

// 人数限制 是
console.log('【将要】人数限制=是');
await page.evaluate(() => {
  const yes = document.querySelector('input[name=isPassengerLimit][value="1"]');
  if (yes && !yes.checked) {
    yes.scrollIntoView({ block: 'center' });
    const lab = yes.id ? document.querySelector(`label[for="${yes.id}"]`) : null;
    (lab || yes).click();
  }
});
await sleep(400);
await setInput('#requiredNumberOfPeople', '1');
await setInput('#availableNumberOfPeople', '4');

// 私人的 — 视口外：scroll + 可见 label 文案（§4/§51）
console.log('【将要】私人的');
const priv1 = await page.evaluate(() => {
  const inp = document.querySelector('input[name=tourTypes][value="0"]');
  return { checked: !!inp?.checked, id: inp?.id, aria: inp?.getAttribute('aria-checked') };
});
console.log('【点前】private', priv1);
if (!priv1.checked) {
  // scroll into view via evaluate then click label text
  await page.evaluate(() => {
    const inp = document.querySelector('input[name=tourTypes][value="0"]');
    if (!inp) return;
    inp.scrollIntoView({ block: 'center' });
    const lab =
      (inp.id && document.querySelector(`label[for="${inp.id}"]`)) ||
      Array.from(document.querySelectorAll('label')).find((l) =>
        (l.innerText || '').trim().startsWith('私人的'),
      );
    if (lab) {
      lab.scrollIntoView({ block: 'center' });
      lab.click();
    } else {
      inp.click();
    }
  });
  await sleep(500);
}
let priv2 = await page.evaluate(() => {
  const inp = document.querySelector('input[name=tourTypes][value="0"]');
  return { checked: !!inp?.checked, aria: inp?.getAttribute('aria-checked') };
});
console.log('【读回】private', priv2);
if (!priv2.checked) {
  // retry: Playwright getByText 私人的 then parent
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('label,div,span')).find((e) => {
      const t = (e.innerText || '').trim();
      return t.startsWith('私人的') && t.length < 40;
    });
    el?.scrollIntoView({ block: 'center' });
    el?.click();
  });
  await sleep(400);
  priv2 = await page.evaluate(() => ({
    checked: !!document.querySelector('input[name=tourTypes][value="0"]')?.checked,
  }));
  console.log('【读回2】private', priv2);
}
if (!priv2.checked) {
  console.log('【失败】私人的未真选中 — 停');
  process.exit(2);
}

async function tickSheet(openRe, itemExact, tag) {
  console.log(`\n【将要】${tag} sheet → 「${itemExact}」`);
  await page.getByRole('button', { name: openRe }).first().click();
  await sleep(1800);

  // dump
  const dump = await page.evaluate((want) => {
    const cbs = Array.from(document.querySelectorAll('[role=checkbox]')).map((cb) => {
      const lab = cb.closest('label') || cb.parentElement;
      const t = (lab?.innerText || cb.getAttribute('aria-label') || '').trim().split('\n')[0];
      return { t: t.slice(0, 40), aria: cb.getAttribute('aria-checked') };
    });
    const hit = cbs.filter((c) => c.t === want || c.t.includes(want));
    return { dialog: !!document.querySelector('[role=dialog]'), hit, sample: cbs.slice(0, 15) };
  }, itemExact);
  console.log('【DOM】', JSON.stringify(dump));

  // click exact checkbox by accessible name
  const byRole = page.getByRole('checkbox', { name: itemExact, exact: true });
  let n = await byRole.count();
  console.log('【定位】getByRole checkbox exact', n);
  if (!n) {
    // partial name
    const partial = page.getByRole('checkbox', { name: new RegExp(`^${itemExact}`) });
    n = await partial.count();
    console.log('【定位】checkbox startsWith', n);
    if (n) {
      const aria = await partial.first().getAttribute('aria-checked');
      console.log('【点前】aria', aria);
      if (aria !== 'true') await partial.first().click();
      await sleep(400);
      console.log('【读回】aria', await partial.first().getAttribute('aria-checked'));
    }
  } else {
    const aria = await byRole.first().getAttribute('aria-checked');
    console.log('【点前】aria', aria);
    if (aria !== 'true') await byRole.first().click();
    await sleep(400);
    console.log('【读回】aria', await byRole.first().getAttribute('aria-checked'));
  }

  // evaluate fallback
  let ok = await page.evaluate((want) => {
    const cbs = Array.from(document.querySelectorAll('[role=checkbox], input[type=checkbox]'));
    for (const cb of cbs) {
      const lab = cb.closest('label');
      const t = (lab?.innerText || cb.getAttribute('aria-label') || '').trim().split('\n')[0].trim();
      if (t !== want) continue;
      const on = cb.getAttribute('aria-checked') === 'true' || cb.checked;
      if (!on) {
        (lab || cb).scrollIntoView({ block: 'center' });
        (lab || cb).click();
      }
      return {
        t,
        aria: cb.getAttribute('aria-checked'),
        checked: !!cb.checked,
      };
    }
    return null;
  }, itemExact);
  console.log('【读回】evaluate', ok);
  await sleep(300);

  // re-verify
  ok = await page.evaluate((want) => {
    for (const cb of document.querySelectorAll('[role=checkbox], input[type=checkbox]')) {
      const lab = cb.closest('label');
      const t = (lab?.innerText || cb.getAttribute('aria-label') || '').trim().split('\n')[0].trim();
      if (t === want) {
        return cb.getAttribute('aria-checked') === 'true' || !!cb.checked;
      }
    }
    return false;
  }, itemExact);
  console.log('【读回】真选中?', ok, itemExact);

  if (!ok) {
    console.log('【失败】未选中', itemExact, '— 不点已选，停');
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  const conf = page.getByRole('button', { name: /^(已选|已選)$/ });
  console.log('【将要】已选', await conf.count());
  if (await conf.count()) {
    await conf.last().click();
    await sleep(1500);
  }
  // 读回页面：红字应消失相关
  const area = await page.evaluate((kw) => {
    const body = document.body.innerText;
    const i = body.indexOf(kw);
    return i >= 0 ? body.slice(i, i + 90) : null;
  }, tag === '主题' ? '选择类别（主题）' : '选择语言');
  console.log('【读回】页摘要', area);
  return true;
}

const themeOk = await tickSheet(/选择类别（主题）|選擇類別/, '司机提供车辆', '主题');
if (!themeOk) process.exit(2);
const langOk = await tickSheet(/选择语言|選擇語言/, '韩语', '语言');
if (!langOk) process.exit(2);

// re people + private（POI 前保证人数/私人）
await setInput('#requiredNumberOfPeople', '1');
await setInput('#availableNumberOfPeople', '4');
await page.evaluate(() => {
  const inp = document.querySelector('input[name=tourTypes][value="0"]');
  if (inp && !inp.checked) {
    const lab =
      (inp.id && document.querySelector(`label[for="${inp.id}"]`)) ||
      Array.from(document.querySelectorAll('label')).find((l) =>
        (l.innerText || '').startsWith('私人的'),
      );
    (lab || inp).click();
  }
});
await sleep(300);

const gate = await page.evaluate(() => {
  const body = document.body.innerText;
  return {
    private: document.querySelector('input[name=tourTypes][value="0"]')?.checked,
    min: document.querySelector('#requiredNumberOfPeople')?.value,
    max: document.querySelector('#availableNumberOfPeople')?.value,
    reds: body
      .split('\n')
      .filter((l) => /^请选择|^请输入|^请至少/.test(l.trim()) && l.length < 55)
      .slice(0, 10),
    themeArea: (body.match(/选择类别（主题）[\s\S]{0,90}/) || [])[0],
    langArea: (body.match(/选择语言[\s\S]{0,70}/) || [])[0],
  };
});
console.log('\n【结果】gate', JSON.stringify(gate, null, 2));
if (!gate.private || gate.max !== '4') {
  console.log('【失败】私人/人数未齐');
  process.exit(2);
}

// §56 POI 真验收（PKX）→ 通过后才点保存然后
try {
  await clickSaveThenAfterPoiGate(page, {
    profileId: 'PKX',
    productKo: PRODUCT_KO,
    internal: INTERNAL,
    autoFix: true,
    maxRetries: 2,
  });
} catch (e) {
  if (e instanceof PoiGateError) {
    console.log('【结果】FAIL §56', e.step, e.message, e.readback);
    process.exit(2);
  }
  throw e;
}
await sleep(4500);
console.log('【结果】url', page.url());
if (!/introduction|intro/i.test(page.url())) {
  console.log('【警告】未进入介绍页', page.url());
}
