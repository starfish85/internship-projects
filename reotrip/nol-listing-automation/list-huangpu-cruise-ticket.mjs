/**
 * Huangpu River Sightseeing Cruise Ticket (国内景区门票)
 * Family A style: adult-only, day/night options, email ticket, passport+name
 * Excel (12) rows 25-26: sale 152.33 each; never 提交审核/批准
 *
 * usage: node list-huangpu-cruise-ticket.mjs [bootstrap|attrs|intro|regs|options|all]
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DRAFT_FILE = join(__dir, '.huangpu-cruise-draft-id');
const PHASE = process.argv[2] || 'all';
const PRICE = '190';
const PRODUCT_KO = '상하이 황푸강 관광 유람선 티켓';
const INTERNAL = 'Huangpu River Sightseeing Cruise Ticket';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/huangpu-cruise';
const IMAGES = ['huangpu-1.jpg', 'huangpu-2.jpg', 'huangpu-3.jpg']
  .map((f) => path.join(IMG_DIR, f))
  .filter((f) => fs.existsSync(f));

const HEADLINE =
  '상하이 황푸강 유람선으로 낮과 밤의 스카이라인을 한눈에 즐겨보세요!';
const HIGHLIGHT = [
  '황푸강 주간·야간 유람선 티켓 선택 가능',
  '동방명주·와이탄 등 상하이 대표 경관을 선상에서 관람',
  '성인 전용 티켓 · 이메일로 이용 안내/전자티켓 수령',
].join('\n');
const INTRO = `상하이 황푸강(Huangpu River) 관광 유람선 티켓입니다.
주간(18:00 이전 출항)과 야간(18:00 이후 출항) 옵션 중 선택하여, 선상에서 동방명주와 와이탄 일대의 스카이라인을 여유롭게 감상할 수 있습니다.

포함 사항:
- 선택한 시간대(주간 또는 야간) 황푸강 관광 유람선 승선권 1매

이용 안내:
- 티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 시 입력한 이메일로 발송됩니다. 이메일 주소가 정확하고 첨부파일을 수신할 수 있는지 확인해 주세요.
- 모든 이용자의 영문 성명과 여권번호를 예약 시 정확히 입력해 주세요.
- 취표 시간대·취표 장소·승선 부두는 이메일로 발송되는 전자티켓/이용 안내에 표기된 내용을 기준으로 하며, 안내된 시간 전에 취표 장소에 도착해 주세요.
- 본 상품은 성인 전용입니다.

상하이 야경·스카이라인을 배로 즐기고 싶은 분들께 추천합니다.`;

const MUST_KNOW = `1. 티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 이메일로 발송됩니다. 이메일이 실제 수신 가능하고 첨부파일을 받을 수 있는지 확인해 주세요.

2. 예약 시 모든 이용자의 영문 성명과 여권번호를 정확히 입력해 주세요. 미입력 시 이용이 제한될 수 있습니다.

3. 【주간 옵션】 출항 시각이 18:00 이전인 주간 유람선입니다.
   【야간 옵션】 출항 시각이 18:00 이후인 야간 유람선입니다.
   예약한 옵션(주간/야간)과 출항 시간대가 일치하는지 확인해 주세요.

4. 취표 시간대·취표 장소·승선 부두는 이메일 전자티켓/이용 안내에 명시됩니다. 안내에 따라 취표 후 지정 부두에서 승선해 주세요. 안내에 없는 부두·시간으로 임의 승선할 수 없습니다.

5. 본 상품은 성인 전용이며 아동/노인 요금은 판매하지 않습니다.

6. 기상·항로·선사 사정으로 운항 일정이 변경·취소될 수 있으며, 이 경우 안내에 따라 조치됩니다.`;

const HOW_TO = `1. 예약 확정 후, 이용일 기준 보통 7일 이내에 이메일로 전자티켓 또는 이용 안내를 수령합니다.

2. 이메일에 기재된 취표 시간대·취표 장소에서 티켓을 확인하고, 안내된 승선 부두·출항 시간에 맞춰 승선합니다.

3. 승선 시 여권 등 신분 확인이 필요할 수 있으니 여권을 지참해 주세요.

4. 문의: agency@reotrip.com / +852 3428 81 82`;

const FAQ = [
  {
    q: '티켓은 언제 이메일로 받나요?',
    a: '이용일 기준 보통 7일 이내에 예약 시 입력한 이메일로 발송됩니다. 스팸함도 확인해 주세요.',
  },
  {
    q: '주간과 야간 옵션 차이는 무엇인가요?',
    a: '주간은 18:00 이전 출항, 야간은 18:00 이후 출항 유람선입니다. 예약하신 옵션의 출항 시간대를 확인해 주세요.',
  },
  {
    q: '취표 장소와 승선 부두는 어디인가요?',
    a: '이메일로 발송되는 전자티켓/이용 안내에 취표 시간대·취표 장소·승선 부두가 표기됩니다. 해당 안내에 따라 이용해 주세요.',
  },
  {
    q: '아동 티켓도 구매할 수 있나요?',
    a: '본 상품은 성인 전용으로, 아동/노인 요금은 판매하지 않습니다.',
  },
  {
    q: '여권 정보가 왜 필요한가요?',
    a: '예약 및 이용 확인을 위해 모든 이용자의 영문 성명과 여권번호가 필요합니다.',
  },
];

const OPTIONS = [
  {
    key: 'day',
    name: '주간 유람선 티켓 (18:00 이전 출항)',
    desc: `황푸강 주간 관광 유람선 승선권 (출항 18:00 이전)
성인 전용
취표 시간대·취표 장소·승선 부두는 이메일 전자티켓/이용 안내 기준
예약 시 영문 성명·여권번호 필수`,
    pt: '성인',
    ptd: '성인 전용',
    price: PRICE,
  },
  {
    key: 'night',
    name: '야간 유람선 티켓 (18:00 이후 출항)',
    desc: `황푸강 야간 관광 유람선 승선권 (출항 18:00 이후)
성인 전용
취표 시간대·취표 장소·승선 부두는 이메일 전자티켓/이용 안내 기준
예약 시 영문 성명·여권번호 필수`,
    pt: '성인',
    ptd: '성인 전용',
    price: PRICE,
  },
];

// Family A reservation: phone+email order-level; EN name + passport per qty
const RESV_REP = ['CELLPHONE-required', 'EMAIL-required'];
const RESV_QTY = [
  'ENGLISH_LAST_NAME-required',
  'ENGLISH_FIRST_NAME-required',
  'PASSPORT_NUMBER-required',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readDraft() {
  if (process.env.HPC_DRAFT) return process.env.HPC_DRAFT.trim();
  if (fs.existsSync(DRAFT_FILE)) return fs.readFileSync(DRAFT_FILE, 'utf8').trim();
  return null;
}
function saveDraft(id) {
  fs.writeFileSync(DRAFT_FILE, id + '\n');
  console.log('DRAFT', id);
}

async function getPage() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().includes('tour.triple.partners'));
  if (!page) throw new Error('no NOL tab on CDP :9222');
  await page.bringToFront().catch(() => {});
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  return { browser, page };
}

async function dismiss(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /^(消除|关闭|關閉|取消)$/.test((b.innerText || '').trim()))
      ?.click();
  });
  await sleep(300);
}

async function saveThen(page, label) {
  const ok = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '保存然后' || t === '保存然後') && !x.disabled;
    });
    if (!b) return false;
    b.scrollIntoView({ block: 'center' });
    b.click();
    return true;
  });
  console.log(`[${label}] 保存然后`, ok);
  await sleep(4000);
  return ok;
}

async function bottomState(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b) => ({ t: (b.innerText || '').trim(), d: !!b.disabled }))
      .filter((b) => /保存然后|保存然後|临时保存|臨時存儲|提交审核|批准|下一个|下個/.test(b.t)),
  );
}

async function yixuan(page) {
  const b = page.getByRole('button', { name: /^(已选|已選)$/ });
  if ((await b.count()) > 0) {
    await b.last().click();
    await sleep(1000);
    return true;
  }
  return false;
}

function extractId(url) {
  const m = url.match(/[?&]id=([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

// ───────── bootstrap ─────────
async function bootstrap(page) {
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  await dismiss(page);

  const body = await page.locator('body').innerText();
  if (/황푸강|Huangpu|黄浦江/.test(body)) {
    console.log('Resume existing draft from list');
    const card = page
      .locator('div[class*="slot___StyledContainer4"]')
      .filter({ hasText: /황푸강|Huangpu|黄浦/ })
      .first();
    if ((await card.count()) > 0) {
      await card.click({ force: true });
      await sleep(3500);
      const id = extractId(page.url());
      if (id) saveDraft(id);
      return id;
    }
  }

  const existing = readDraft();
  if (existing) {
    console.log('Open known draft', existing);
    await page.goto(
      `https://tour.triple.partners/product-management/registration/properties?id=${existing}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded' },
    );
    await sleep(3000);
    return existing;
  }

  console.log('Create new TICKET_PASS product');
  await page.evaluate(() => {
    const search = Array.from(document.querySelectorAll('input')).find((i) =>
      /搜索|搜尋|검색|search/i.test(i.placeholder || ''),
    );
    if (search?.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button,a,div'))
      .find((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '新产品注册' || t === '新產品註冊') && r.height > 20 && r.height < 80;
      })
      ?.click();
  });
  await sleep(1800);

  await page.evaluate((name) => {
    const d = document.querySelector('[role=dialog]');
    const inp = d
      ? Array.from(d.querySelectorAll('input')).find((i) => i.type === 'text' || i.type === '')
      : null;
    if (!inp) throw new Error('no modal name input');
    if (/搜索|搜尋|검색/i.test(inp.placeholder || '')) throw new Error('refused search box');
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(inp, name);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }, PRODUCT_KO);
  await sleep(400);

  // 通票 TICKET_PASS
  await page.evaluate(() => {
    const radio = document.querySelector('input[type=radio][value=TICKET_PASS]');
    if (!radio) throw new Error('no TICKET_PASS');
    const lab = radio.closest('label') || radio;
    lab.click();
    if (!radio.checked) radio.click();
  });
  await sleep(400);

  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      /开始创建|開始創建|만들기|创建/.test((x.innerText || '').trim()),
    );
    if (!b || b.disabled) throw new Error('create button missing/disabled');
    b.click();
  });
  await sleep(5000);

  const id = extractId(page.url());
  if (!id) throw new Error('no draft id after create: ' + page.url());
  saveDraft(id);
  console.log('created', page.url());
  return id;
}

// ───────── attributes ─────────
async function attrs(page) {
  let id = readDraft();
  if (!id) id = await bootstrap(page);
  await page.goto(
    `https://tour.triple.partners/product-management/registration/properties?id=${id}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(3000);
  await dismiss(page);

  await page.locator('#title').fill(PRODUCT_KO);
  await page.locator('#managementTitle').fill(INTERNAL);
  console.log('titles ok');

  // date / use / nationality
  for (const [name, val] of [
    ['productDateRule', 'FIXED_DATE_RULE'],
    ['useType', 'USE_DATE'],
    ['nationalityType', 'ANOTHER_NATIONALITY'],
  ]) {
    const radio = page.locator(`input[name="${name}"][value="${val}"]`);
    if ((await radio.count()) > 0) {
      await radio.first().scrollIntoViewIfNeeded();
      const rid = await radio.first().getAttribute('id');
      if (rid) {
        const lab = page.locator(`label[for="${rid}"]`);
        if ((await lab.count()) > 0) await lab.first().click({ force: true });
        else await radio.first().click({ force: true });
      } else await radio.first().click({ force: true });
    }
  }

  // person limit NO (ticket)
  const passNo = page.locator('input[name=isPassengerLimit][value="0"]');
  if ((await passNo.count()) > 0) {
    await passNo.first().scrollIntoViewIfNeeded();
    await passNo.first().click({ force: true });
    console.log('passenger limit NO');
  } else {
    // try label
    const noLab = page.locator('label').filter({ hasText: /^(否|아니요|无)$/ });
    if ((await noLab.count()) > 0) await noLab.first().click({ force: true });
  }

  // theme — scenic / tourism related
  const themeBtn = page.getByRole('button', { name: /选择类别（主题）|選擇類別（主題）/ });
  if ((await themeBtn.count()) > 0) {
    await themeBtn.first().click();
    await sleep(1500);
    const dlg = page.locator('[role=dialog]');
    await dlg.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    // dump options briefly
    const themes = await dlg.evaluate(() =>
      Array.from(document.querySelectorAll('label, [role=checkbox], div'))
        .map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t.length > 1 && t.length < 40)
        .slice(0, 80),
    );
    console.log('theme candidates sample', themes.slice(0, 30));

    const picks = [
      '观光',
      '觀光',
      '景点',
      '景點',
      '游览',
      '遊覽',
      '투어',
      '관광',
      '액티비티',
      '체험',
      '体验',
      '體驗',
    ];
    let picked = false;
    for (const p of picks) {
      const opt = dlg.getByText(p, { exact: true });
      if ((await opt.count()) > 0) {
        await opt.first().click();
        picked = true;
        console.log('theme pick', p);
        break;
      }
    }
    if (!picked) {
      // first checkbox in dialog
      const cb = dlg.locator('[role=checkbox]').first();
      if ((await cb.count()) > 0) {
        await cb.click();
        console.log('theme first checkbox');
      }
    }
    await sleep(400);
    await yixuan(page);
  }

  // language 韩语
  await page.getByRole('button', { name: /选择语言|選擇語言|选择你的语言/ }).first().click();
  await sleep(1500);
  const langDlg = page.locator('[role=dialog]');
  await langDlg.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  if ((await langDlg.getByText('韩语', { exact: true }).count()) > 0)
    await langDlg.getByText('韩语', { exact: true }).first().click();
  else if ((await langDlg.getByText('韓語', { exact: true }).count()) > 0)
    await langDlg.getByText('韓語', { exact: true }).first().click();
  else await page.getByText('韩语', { exact: true }).first().click();
  await sleep(400);
  await yixuan(page);
  console.log('lang ok');

  // POI 黄浦江 / Huangpu
  const hasCard = await page.evaluate(() => /删除|刪除/.test(document.body.innerText));
  if (!hasCard) {
    await page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ }).first().click();
    await sleep(2000);
    const dlg = page.locator('[role=dialog]');
    const search = dlg.locator('input').first();
    await search.waitFor({ state: 'visible', timeout: 10000 });
    let selected = false;
    for (const q of ['黄浦江', 'Huangpu', '황푸', '上海 游船', '外滩']) {
      await search.fill(q);
      await search.press('Enter');
      await sleep(2200);
      const candidates = dlg
        .locator('div')
        .filter({ hasText: /旅游地|旅遊地|景点|景點/ })
        .filter({ hasText: /黄浦|Huangpu|上海|Shanghai|외탄|外滩|유람|游船|Cruise/i });
      const n = await candidates.count();
      console.log('POI query', q, 'n', n);
      for (let i = 0; i < Math.min(n, 10); i++) {
        const el = candidates.nth(i);
        const box = await el.boundingBox().catch(() => null);
        if (!box || box.height < 30 || box.height > 200 || box.width < 150) continue;
        await el.click({ force: true });
        selected = true;
        console.log('POI clicked', (await el.innerText()).slice(0, 100).replace(/\s+/g, ' '));
        break;
      }
      if (selected) break;
    }
    if (selected) {
      await sleep(800);
      const addPlace = page.getByRole('button', { name: /添加地点|添加地點/ });
      if ((await addPlace.count()) > 0) {
        await addPlace.last().click();
        await sleep(1200);
      }
      const typeLab = page.locator('label').filter({ hasText: /^(旅游地|旅遊地)$/ });
      if ((await typeLab.count()) > 0) await typeLab.first().click({ force: true });
      else {
        const radio = page.locator('input[value="TRAVEL_PLACE"]');
        if ((await radio.count()) > 0) await radio.first().click({ force: true });
      }
      await sleep(400);
      const addFinal = page.getByRole('button', { name: /^添加$/ });
      const cnt = await addFinal.count();
      for (let i = cnt - 1; i >= 0; i--) {
        if (!(await addFinal.nth(i).isDisabled())) {
          await addFinal.nth(i).click();
          console.log('POI added');
          break;
        }
      }
      await sleep(1500);
    } else {
      console.log('POI NOT selected — need manual');
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  console.log('bottom', await bottomState(page));
  const saved = await saveThen(page, 'attrs');
  if (!saved) {
    console.log('attrs hard fields:', await page.evaluate(() => {
      const t = document.body.innerText;
      return (t.match(/请选择[^\n]{0,50}|請選擇[^\n]{0,50}|请至少[^\n]{0,50}|必須[^\n]{0,50}/g) || []).slice(0, 15);
    }));
  }
  return saved;
}

// ───────── introduction ─────────
async function intro(page) {
  const id = readDraft();
  if (!id) throw new Error('no draft');
  await page.goto(
    `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(3000);
  await dismiss(page);

  const setField = async (sels, val, label) => {
    for (const sel of sels) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) === 0) continue;
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await loc.click({ force: true }).catch(() => {});
      await loc.fill(val);
      console.log('fill', label);
      return true;
    }
    // fallback by evaluate name
    const ok = await page.evaluate(
      ({ keys, val }) => {
        for (const k of keys) {
          const el = document.querySelector(`[name="${k}"], #${k}`);
          if (!el) continue;
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const s = Object.getOwnPropertyDescriptor(proto, 'value').set;
          s.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return k;
        }
        return null;
      },
      { keys: sels.map((s) => s.replace(/[#\[\]]/g, '').replace('name=', '')), val },
    );
    console.log('fill eval', label, ok);
    return !!ok;
  };

  await setField(['#headline', 'textarea[name=headline]', 'input[name=headline]'], HEADLINE, 'headline');
  await setField(['#highlight', 'textarea[name=highlight]', 'textarea[name=summary]'], HIGHLIGHT, 'highlight');
  await setField(
    ['#description', 'textarea[name=description]', 'textarea[name=productDescription]'],
    INTRO,
    'description',
  );
  await setField(['#checkList', 'textarea[name=checkList]', 'textarea[name=mustKnow]'], MUST_KNOW, 'mustKnow');
  await setField(['#usage', 'textarea[name=usage]', 'textarea[name=howToUse]'], HOW_TO, 'howTo');

  // schedule NONE
  await page.evaluate(() => {
    const r = document.querySelector('input[name=scheduleType][value=NONE], input[value=NONE]');
    if (r) {
      (r.closest('label') || r).click();
      return;
    }
    const lab = Array.from(document.querySelectorAll('label,span,div')).find((e) =>
      /没有单独的时间表|沒有單獨|없음|NONE/.test((e.innerText || '').trim()) && (e.innerText || '').length < 30,
    );
    lab?.click();
  });
  console.log('schedule NONE');

  // images → 썸네일 first file input
  if (IMAGES.length >= 3) {
    const inputs = page.locator('input[type=file][accept*="image"]');
    const n = await inputs.count();
    console.log('file inputs', n, 'images', IMAGES.length);
    if (n > 0) {
      // prefer first under 썸네일 / 상품
      await inputs.first().setInputFiles(IMAGES.slice(0, 3));
      await sleep(4000);
      console.log('images uploaded');
    }
  } else {
    console.log('WARN images missing', IMAGES);
  }

  console.log('bottom', await bottomState(page));
  const saved = await saveThen(page, 'intro');
  if (!saved) {
    console.log('intro blockers', await page.evaluate(() => {
      const t = document.body.innerText;
      return (t.match(/请[^\n]{0,40}|請[^\n]{0,40}|必須[^\n]{0,40}|至少[^\n]{0,40}/g) || []).slice(0, 20);
    }));
  }
  return saved;
}

// ───────── regulations ─────────
async function regs(page) {
  const id = readDraft();
  if (!id) throw new Error('no draft');
  await page.goto(
    `https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(3000);
  await dismiss(page);

  // min book day 0, confirmation manual 3 days if fields exist
  await page.evaluate(() => {
    const set = (el, v) => {
      if (!el) return;
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    // shortest book
    const short = document.querySelector(
      'input[name=minDaysBeforeUse], input[name=minimumDaysBeforeUse], #minDaysBeforeUse',
    );
    set(short, '0');
    // confirmation days
    const conf = document.querySelector('input[name=confirmationDays], #confirmationDays');
    set(conf, '3');
  });

  // manual confirm if radio
  await page.evaluate(() => {
    const r = document.querySelector(
      'input[value=MANUAL], input[name*=confirm][value*=MANUAL], input[value="MANUAL_CONFIRMATION"]',
    );
    if (r) (r.closest('label') || r).click();
  });

  // include: 시설 입장료
  const includeBtn = page.getByRole('button', { name: /撰写|撰寫|包含事项|포함|添加包含|填写包含/ });
  if ((await includeBtn.count()) > 0) {
    await includeBtn.first().click();
    await sleep(1500);
  } else {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,a'))
        .find((b) => /包含|포함|inclusions/i.test(b.innerText || '') && (b.innerText || '').length < 40)
        ?.click();
    });
    await sleep(1500);
  }

  await page.evaluate(() => {
    // try open category / common include
    const set = (sel, v) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const s = Object.getOwnPropertyDescriptor(proto, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    };
    // check FACILITY or TICKET inclusion types
    for (const id of [
      'inclusions_FACILITY',
      'inclusions_TICKET',
      'inclusions_ENTRANCE',
      'inclusions_OTHER',
      'inclusions_ADMISSION',
    ]) {
      const cb = document.querySelector(`#${id}, input[name="${id}"], [id*="${id}"]`);
      if (cb && !cb.checked) cb.click();
    }
    // fill description fields
    const areas = Array.from(document.querySelectorAll('[role=dialog] textarea, textarea')).filter(
      (t) => t.getBoundingClientRect().height > 20,
    );
    if (areas[0] && !areas[0].value) {
      const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      s.call(areas[0], '시설 입장료 (황푸강 관광 유람선 승선)');
      areas[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
    // exclude
    if (areas[1]) {
      const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      s.call(areas[1], '개인 경비, 포함 사항에 명시되지 않은 기타 비용');
      areas[1].dispatchEvent(new Event('input', { bubbles: true }));
    }
    set('#inclusions_FACILITY_description', '시설 입장료 (황푸강 관광 유람선 승선)');
    set('#inclusions_OTHER_description', '시설 입장료 (황푸강 관광 유람선 승선)');
  });
  await sleep(500);
  // save include modal
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('[role=dialog] button, button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '节省' || t === '節省' || t === '保存' || t === '완료' || t === '完成') && !x.disabled;
    });
    b?.click();
  });
  await sleep(1500);
  console.log('include attempted');

  // reservation modal
  const resvBtn = page.getByRole('button', { name: /代表预约|代表預約|预订信息|預約信息|예약 정보/ });
  if ((await resvBtn.count()) > 0) {
    await resvBtn.first().click();
    await sleep(1500);
  } else {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,a,div'))
        .find((b) => /代表.*预约|代表.*預約|预订信息|예약 정보/.test(b.innerText || '') && (b.innerText || '').length < 40)
        ?.click();
    });
    await sleep(1500);
  }

  // tick required fields
  await page.evaluate((ids) => {
    for (const id of ids) {
      const box =
        document.querySelector(`[aria-labelledby="${id}"]`) ||
        document.getElementById(id) ||
        document.querySelector(`#${id}`);
      if (box && box.getAttribute('aria-checked') !== 'true' && !box.checked) {
        box.click();
      }
      // also label click
      const lab = document.querySelector(`label[for="${id}"], [id="${id}"]`);
      lab?.click();
    }
    // by text for passport / english name / phone / email
    const want = /手机|手機|电话|電話|邮箱|郵箱|영문|英文|护照|護照|passport|email|phone|성|이름/i;
    document.querySelectorAll('[role=checkbox], input[type=checkbox]').forEach((c) => {
      const t = (c.closest('label,div,li')?.innerText || '').replace(/\s+/g, ' ');
      if (want.test(t) && c.getAttribute('aria-checked') !== 'true' && !c.checked) c.click();
    });
  }, [...RESV_REP, ...RESV_QTY]);
  await sleep(600);
  await yixuan(page);
  // confirm 已选
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      /^(已选|已選|节省|節省|完成|확인)$/.test((x.innerText || '').trim()),
    );
    b?.click();
  });
  await sleep(1500);
  console.log('resv attempted');

  // voucher 예약정보로 확인 / 无需换货
  await page.evaluate(() => {
    const pick = (re) => {
      const el = Array.from(document.querySelectorAll('label,div,span,button,li')).find((e) => {
        const t = (e.innerText || '').replace(/\s+/g, ' ').trim();
        return re.test(t) && t.length < 80;
      });
      el?.click();
    };
    pick(/예약정보로 확인|用预约信息|预约信息确认|無需換貨|无需换货|교환 불필요/);
  });
  await sleep(500);

  // FAQ if fields exist
  await page.evaluate((faqs) => {
    const qInputs = Array.from(document.querySelectorAll('input, textarea')).filter((el) =>
      /question|faq|질문|问题|問題/i.test(el.name + el.id + (el.placeholder || '')),
    );
    // simple: fill first few textareas pairs
    const areas = Array.from(document.querySelectorAll('textarea')).filter(
      (t) => t.getBoundingClientRect().y > 200 && t.getBoundingClientRect().height > 30,
    );
    // if FAQ section uses structured fields, best effort
    let ai = 0;
    for (const f of faqs) {
      // skip if already filled main fields
      void f;
      ai++;
    }
    void qInputs;
    void areas;
    void ai;
  }, FAQ);

  // cancellation: if present, conservative cancellable manual 2 days 0%
  await page.evaluate(() => {
    const can = Array.from(document.querySelectorAll('label,span')).find((e) =>
      /^(可取消|취소 가능|가능)$/.test((e.innerText || '').trim()),
    );
    can?.click();
    const manual = Array.from(document.querySelectorAll('label,span')).find((e) =>
      /手动取消|수동취소|예 \(수동/.test(e.innerText || ''),
    );
    manual?.click();
  });

  // must-know / how-to on regs page if separate
  await page.evaluate(({ must, how }) => {
    const set = (sel, v) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('textarea[name=mustKnow]', must);
    set('textarea[name=needToKnow]', must);
    set('textarea[name=usage]', how);
    set('textarea[name=howToUse]', how);
  }, { must: MUST_KNOW, how: HOW_TO });

  console.log('bottom', await bottomState(page));
  const saved = await saveThen(page, 'regs');
  if (!saved) {
    console.log('regs blockers', await page.evaluate(() => {
      const t = document.body.innerText;
      return (t.match(/请[^\n]{0,60}|請[^\n]{0,60}|必須[^\n]{0,60}|须填写[^\n]{0,60}/g) || []).slice(0, 25);
    }));
  }
  return saved;
}

// ───────── options ─────────
async function tempThenNext(page, label) {
  await dismiss(page);
  const temps = page.locator('button').filter({ hasText: /^(临时保存|臨時存儲)$/ });
  let tempIdx = -1;
  let minW = Infinity;
  for (let i = 0; i < (await temps.count()); i++) {
    if (await temps.nth(i).isDisabled()) continue;
    const box = await temps.nth(i).boundingBox();
    if (box && box.width < minW) {
      minW = box.width;
      tempIdx = i;
    }
  }
  if (tempIdx >= 0) {
    await temps.nth(tempIdx).click();
    console.log(label, 'tempSave w=', minW);
    await sleep(1800);
  } else console.log(label, 'tempSave MISSING');

  const nexts = page.locator('button').filter({ hasText: /^(下一个|下個|下个)$/ });
  let nextIdx = -1;
  let maxW = 0;
  for (let i = 0; i < (await nexts.count()); i++) {
    if (await nexts.nth(i).isDisabled()) continue;
    const box = await nexts.nth(i).boundingBox();
    if (box && box.width > maxW) {
      maxW = box.width;
      nextIdx = i;
    }
  }
  if (nextIdx >= 0) {
    await nexts.nth(nextIdx).click();
    console.log(label, 'next w=', maxW);
    await sleep(3500);
  } else console.log(label, 'next MISSING');
  await dismiss(page);
}

async function createOption(page, opt, index) {
  console.log('\n=== option', index, opt.key, opt.price);
  const body = await page.locator('body').innerText();
  if (body.includes(opt.name)) {
    console.log('already exists, skip');
    return true;
  }

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /注册.?添加选项|註冊.?添加選項|添加选项|등록/.test(b.innerText || ''))
      ?.click();
  });
  await sleep(2500);
  await page.locator('#name').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if ((await page.locator('#name').count()) > 0) await page.locator('#name').fill(opt.name);
  else await page.locator('input[name=name]').first().fill(opt.name);
  if ((await page.locator('#description').count()) > 0) await page.locator('#description').fill(opt.desc);
  else await page.locator('textarea').first().fill(opt.desc);

  // min qty 1
  await page.evaluate(() => {
    const set = (sel, v) => {
      const el = document.querySelector(sel);
      if (!el) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('input[name=minimumPurchaseQuantity]', '1');
    set('#minimumPurchaseQuantity', '1');
  });

  // price type
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /选择价格类型|選擇價格類型|가격 타입/.test(b.innerText || ''))
      ?.click();
  });
  await sleep(1500);

  // other / manual tab
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('div,button,span,a')).find((e) => {
      const t = (e.innerText || '').trim();
      return /其他价格|其他價格|기타 가격|手动输入|手動輸入|직접 입력/.test(t) && t.length < 40;
    });
    tab?.click();
  });
  await sleep(800);

  await page.evaluate(
    ({ pt, ptd }) => {
      const set = (el, v) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const inputs = Array.from(
        document.querySelectorAll('[role=dialog] input[type=text], input[type=text]'),
      ).filter((i) => !i.disabled && i.getBoundingClientRect().y > 0);
      const empty = inputs.filter((i) => !i.value);
      if (empty[0]) set(empty[0], pt);
      else if (inputs[0]) set(inputs[0], pt);
      if (empty[1]) set(empty[1], ptd);
      else if (inputs[1]) set(inputs[1], ptd);

      const tels = Array.from(document.querySelectorAll('input[type=tel], input[type=number]')).filter(
        (i) => i.getBoundingClientRect().y > 0 && !i.disabled,
      );
      if (tels.length >= 2) {
        set(tels[tels.length - 2], '1');
        // max blank for adult
      } else if (tels[0]) set(tels[0], '1');

      for (const id of ['ETC-required-label', 'ETC-representative-label']) {
        const box = document.querySelector(`[aria-labelledby="${id}"]`);
        if (box && box.getAttribute('aria-checked') !== 'true') box.click();
      }
      document.querySelectorAll('[role=checkbox]').forEach((c) => {
        const t = (c.closest('label,div')?.innerText || '').replace(/\s+/g, ' ');
        if (/必需|必须|代表|대표|required/i.test(t) && c.getAttribute('aria-checked') !== 'true') c.click();
      });
    },
    { pt: opt.pt, ptd: opt.ptd },
  );
  await sleep(400);

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /^(完成|완료|节省|節省)$/.test((b.innerText || '').trim()) && !b.disabled)
      ?.click();
  });
  await sleep(1500);

  // re-fill name
  if ((await page.locator('#name').count()) > 0) await page.locator('#name').fill(opt.name);

  // ONE_YEAR
  await page.evaluate(() => {
    const y = document.querySelector('input[value="ONE_YEAR"]');
    if (y) {
      y.click();
      return;
    }
    const lab = Array.from(document.querySelectorAll('label,span,div')).find((e) => {
      const t = (e.innerText || '').trim();
      return (t === '1年' || t === '一年' || t.startsWith('1年')) && t.length < 10;
    });
    lab?.click();
  });
  await sleep(1200);

  // price once
  await page.evaluate((price) => {
    const el = Array.from(document.querySelectorAll('input')).find((i) => {
      const ph = i.placeholder || '';
      return /价格|價格|price/i.test(ph + i.name) && !i.disabled;
    });
    if (!el) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, price);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, opt.price);
  console.log('price set', opt.price);
  await sleep(500);

  // tickets often need no time slots — skip if no 设置时间 required
  // try next
  await tempThenNext(page, opt.key);

  const after = await page.locator('body').innerText();
  const ok = after.includes(opt.name) || after.includes(opt.pt);
  console.log('option result', opt.key, ok);
  return ok;
}

async function options(page) {
  const id = readDraft();
  if (!id) throw new Error('no draft');
  const LIST = `https://tour.triple.partners/product-management/registration/option?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
  await page.goto(LIST, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await dismiss(page);

  for (let i = 0; i < OPTIONS.length; i++) {
    await createOption(page, OPTIONS[i], i + 1);
    await page.goto(LIST, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await dismiss(page);
  }

  const finalBody = await page.locator('body').innerText();
  console.log(
    'FINAL cards day?',
    finalBody.includes('주간'),
    'night?',
    finalBody.includes('야간'),
    'url',
    page.url(),
  );
  console.log('STOP on 选项管理 — never 提交审核');
  return true;
}

// ───────── main ─────────
const { page } = await getPage();
console.log('START phase=', PHASE, 'url=', page.url());

if (PHASE === 'bootstrap' || PHASE === 'all') await bootstrap(page);
if (PHASE === 'attrs' || PHASE === 'all') await attrs(page);
if (PHASE === 'intro' || PHASE === 'all') await intro(page);
if (PHASE === 'regs' || PHASE === 'all') await regs(page);
if (PHASE === 'options' || PHASE === 'all') await options(page);

console.log('DONE draft=', readDraft());
process.exit(0);
