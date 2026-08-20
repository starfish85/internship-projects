/**
 * Guangzhou Chimelong Paradise Admission Ticket
 * Excel/CSV 国内景区门票 R29: 一日票 · 只卖成人
 * 售价：只贴表格「售价hkd」列显示值；禁止用加价逻辑 276 自算（skill 0h）
 * Family A style: adult only, 1 option, email ticket, passport+name
 * Never 提交审核
 *
 * usage: node list-chimelong-paradise-ticket.mjs [bootstrap|attrs|intro|regs|options|all]
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DRAFT_FILE = join(__dir, '.chimelong-paradise-draft-id');
const PHASE = process.argv[2] || 'all';
// 硬规则 0h：只允许表内显示售价，禁止自算 276/0.8
// 【售价来源】售价hkd=345（CSV R29 表显示；加价逻辑=276 未用；未自算）
const PRICE = (process.env.CHIMELONG_PARADISE_PRICE || process.argv[3] || '345').trim();
const PRODUCT_KO = '광저우 침롱 파라다이스 1일 입장권';
const INTERNAL = 'Guangzhou Chimelong Paradise Admission Ticket';
const IMG_DIR = '/Users/mac/nol/upload-ready-images/chimelong-paradise';
const IMAGES = ['paradise-1.jpg', 'paradise-2.jpg', 'paradise-3.jpg']
  .map((f) => path.join(IMG_DIR, f))
  .filter((f) => fs.existsSync(f));

const HEADLINE = '광저우 침롱 파라다이스에서 스릴 넘치는 하루를 즐겨보세요!';
const HIGHLIGHT = [
  '침롱 파라다이스 1일 입장권 · 성인 전용',
  '롤러코스터·퍼레이드·테마존 자유 이용',
  '이메일로 이용 안내/전자티켓 수령',
].join('\n');
const INTRO = `광저우 침롱 파라다이스(Guangzhou Chimelong Paradise) 1일 입장권입니다.
하루 동안 파크 내 어트랙션·퍼레이드·테마 존을 자유롭게 이용할 수 있습니다.

포함 사항:
- 침롱 파라다이스 1일 입장권 1매 (성인)

이용 안내:
- 티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 시 입력한 이메일로 발송됩니다. 이메일 주소가 정확하고 첨부파일을 수신할 수 있는지 확인해 주세요.
- 모든 이용자의 영문 성명과 여권번호를 예약 시 정확히 입력해 주세요.
- 본 상품은 성인 전용입니다.

스릴 넘치는 라이드와 퍼레이드를 즐기고 싶은 분들께 추천합니다.`;

const MUST_KNOW = `1. 티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 이메일로 발송됩니다. 이메일이 실제 수신 가능하고 첨부파일을 받을 수 있는지 확인해 주세요.

2. 예약 시 모든 이용자의 영문 성명과 여권번호를 정확히 입력해 주세요. 미입력 시 이용이 제한될 수 있습니다.

3. 본 상품은 성인 전용이며 아동/노인 요금은 판매하지 않습니다.

4. 입장·이용 규정은 이메일 전자티켓/이용 안내 및 현장 공지를 따릅니다.`;

const HOW_TO = `1. 예약 확정 후, 이용일 기준 보통 7일 이내에 이메일로 전자티켓 또는 이용 안내를 수령합니다.

2. 안내에 따라 지정 입구·시간에 맞춰 입장합니다.

3. 입장 시 여권 등 신분 확인이 필요할 수 있으니 여권을 지참해 주세요.

4. 문의: agency@reotrip.com / +852 3428 81 82`;

const OPT = {
  name: '1일 입장권',
  desc: `침롱 파라다이스 1일 입장권
성인 전용
이메일 전자티켓/이용 안내 기준 입장
예약 시 영문 성명·여권번호 필수`,
  pt: '성인',
  ptd: '성인 전용 · 만 19세 이상',
  price: PRICE,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function readDraft() {
  if (process.env.CHIMELONG_PARADISE_DRAFT) return process.env.CHIMELONG_PARADISE_DRAFT.trim();
  if (fs.existsSync(DRAFT_FILE)) return fs.readFileSync(DRAFT_FILE, 'utf8').trim();
  return null;
}
function saveDraft(id) {
  fs.writeFileSync(DRAFT_FILE, id + '\n');
  console.log('DRAFT', id);
}
function extractId(url) {
  const m = url.match(/[?&]id=([0-9a-f-]{36})/i);
  return m ? m[1] : null;
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
  const w = await page.evaluate(() => window.innerWidth);
  if (w < 1280) {
    console.log('viewport narrow', w, '→ set 1440x900 once');
    await page.setViewportSize({ width: 1440, height: 900 });
  }
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

async function yixuan(page) {
  const b = page.getByRole('button', { name: /^(已选|已選)$/ });
  if ((await b.count()) > 0) {
    await b.last().click();
    await sleep(1000);
    return true;
  }
  return false;
}

async function reds(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      if (el.children.length > 2) return;
      const t = (el.innerText || '').trim();
      if (!t || t.length > 55) return;
      const m = getComputedStyle(el).color.match(/rgb\((\d+),\s*(\d+)/);
      if (m && +m[1] > 200 && +m[2] < 80) out.push(t);
    });
    return [...new Set(out)].slice(0, 15);
  });
}

// ───────── bootstrap ─────────
async function bootstrap(page) {
  console.log('【售价来源】售价hkd=' + (PRICE || '(待表显示)') + '（加价逻辑=276 未用作售价；未自算）');
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(2500);
  await dismiss(page);

  const body = await page.locator('body').innerText();
  if (/Chimelong Paradise|침롱 파라다이스|长隆欢乐世界|長隆歡樂/i.test(body)) {
    console.log('Resume existing draft from list');
    const card = page
      .locator('div[class*="slot___StyledContainer4"]')
      .filter({ hasText: /Chimelong Paradise|침롱 파라다이스|长隆欢乐世界|長隆歡樂/i })
      .first();
    if ((await card.count()) > 0) {
      await card.click();
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
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(3000);
    return existing;
  }

  console.log('【将要】创建 通票 产品', PRODUCT_KO);
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

  const tp = await page.evaluate(() => {
    const radio = document.querySelector('input[type=radio][value=TICKET_PASS]');
    if (!radio) return { ok: false };
    (radio.closest('label') || radio).click();
    if (!radio.checked) radio.click();
    return { ok: radio.checked };
  });
  console.log('【读回】TICKET_PASS', tp);
  if (!tp.ok) throw new Error('TICKET_PASS not checked');

  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return /开始創建|開始創建|开始创建|開始创建|만들기/.test(t) && !x.disabled;
    });
    if (!b) throw new Error('create button missing/disabled');
    b.click();
  });
  await sleep(5000);

  const id = extractId(page.url());
  if (!id) throw new Error('no draft id: ' + page.url());
  saveDraft(id);
  console.log('【结果】created', page.url());
  return id;
}

// ───────── attrs state / gates ─────────
async function attrsState(page) {
  return page.evaluate(() => {
    const t = document.body.innerText || '';
    const hasTheme = /主题公园|主題公園|테마파크|体验|體驗|观光|觀光|景点|景點/.test(t)
      && !/请选择类别|請選擇類別/.test(t);
    // 进度语言摘要：页上出现「韩语/韓語」且非「请选择语言」红提示
    const hasLang = /韩语|韓語|한국어/.test(t);
    const needLang = /请选择语言|請選擇語言|请选择你的语言/.test(t);
    const hasPoi = /广州|廣州|Guangzhou|长隆|長隆|Chimelong|番禺|欢乐世界|歡樂世界|Paradise|파라다이스|公园|公園/.test(t)
      && !/请添加地区|請添加地區|请选择地点/.test(t);
    const save = Array.from(document.querySelectorAll('button')).find((x) => {
      const s = (x.innerText || '').trim();
      return s === '保存然后' || s === '保存然後';
    });
    // 读进度语言附近摘要（防 stillLang 误判）
    let langSnippet = '';
    const m = t.match(/(?:进度语言|進度語言|语言|語言)[^\n]{0,40}/);
    if (m) langSnippet = m[0];
    return {
      hasTheme,
      hasLang,
      needLang,
      hasPoi,
      saveDisabled: save ? !!save.disabled : true,
      langSnippet,
      url: location.href,
    };
  });
}

// ───────── attrs ─────────
async function attrs(page) {
  let id = readDraft();
  if (!id) id = await bootstrap(page);
  // 仅 phase 入口 goto；单字段 FAIL 不 reload
  if (!/\/properties\?id=/.test(page.url()) || !page.url().includes(id)) {
    await page.goto(
      `https://tour.triple.partners/product-management/registration/properties?id=${id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(3000);
  }
  await dismiss(page);

  let st = await attrsState(page);
  console.log('【读回】attrs 起点', st);

  console.log('【将要】填标题 + 管理名');
  if ((await page.locator('#title').count()) > 0) {
    await page.locator('#title').fill(PRODUCT_KO);
    await page.locator('#managementTitle').fill(INTERNAL);
    console.log('【读回】title', await page.locator('#title').inputValue());
  }

  for (const [name, val] of [
    ['productDateRule', 'FIXED_DATE_RULE'],
    ['useType', 'USE_DATE'],
    ['nationalityType', 'ANOTHER_NATIONALITY'],
  ]) {
    const radio = page.locator(`input[name="${name}"][value="${val}"]`);
    if ((await radio.count()) > 0) {
      const already = await radio.first().isChecked().catch(() => false);
      if (already) continue;
      const rid = await radio.first().getAttribute('id');
      if (rid) {
        const lab = page.locator(`label[for="${rid}"]`);
        if ((await lab.count()) > 0) await lab.first().click({ force: true });
        else await radio.first().click({ force: true });
      }
    }
  }

  const passNo = page.locator('input[name=isPassengerLimit][value="0"]');
  if ((await passNo.count()) > 0) {
    if (!(await passNo.first().isChecked().catch(() => false))) {
      await passNo.first().click({ force: true });
    }
    console.log('【读回】人数限制 否', await passNo.first().isChecked());
  }

  // 起点已齐且保存可用 → 直接保存（勿再点联系人/主题误开弹层）
  st = await attrsState(page);
  if (st.hasTheme && st.hasLang && st.hasPoi && !st.saveDisabled) {
    console.log('【将要】字段已齐且保存然后可用 → 直接保存', st);
    const savedFast = await saveThen(page, 'attrs-fast');
    if (savedFast) {
      await sleep(1500);
      await dismiss(page);
      console.log('【结果】attrs PASS (fast) url=', page.url());
      return true;
    }
    console.log('fast save failed, continue patch');
  }

  // theme — 已有摘要则跳过（资产）
  st = await attrsState(page);
  if (!st.hasTheme) {
    console.log('【将要】主题 主题公园');
    const themeBtn = page.getByRole('button', { name: /选择类别（主题）|選擇類別（主題）/ });
    if ((await themeBtn.count()) > 0) {
      await themeBtn.first().click();
      await sleep(1500);
      const dlg = page.locator('[role=dialog]');
      await dlg.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      let picked = false;
      for (const p of ['主题公园', '主題公園', '테마파크', '体验', '體驗', '액티비티', '观光', '觀光', '景点', '景點']) {
        const opt = dlg.getByText(p, { exact: true });
        if ((await opt.count()) > 0) {
          await opt.first().click();
          picked = true;
          console.log('theme', p);
          break;
        }
      }
      if (!picked) {
        const cb = dlg.locator('[role=checkbox], label').first();
        if ((await cb.count()) > 0) await cb.click();
      }
      await sleep(400);
      await yixuan(page);
    }
  } else {
    console.log('【读回】主题已有，跳过');
  }

  // language 韩语 — 页摘要已有韩语则跳过；禁点「仅限韩语用户」
  st = await attrsState(page);
  if (!st.hasLang || st.needLang) {
    console.log('【将要】语言 exact 韩语');
    const langOpen = page.getByRole('button', { name: /选择语言|選擇語言|选择你的语言|選擇你的語言/ });
    if ((await langOpen.count()) > 0) {
      await langOpen.first().click();
      await sleep(1200);
      const langDlg = page.locator('[role=dialog]');
      await langDlg.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      // exact 韩语/韓語 only — never 仅限韩语用户
      let hit = langDlg.getByText(/^韩语$/, { exact: true });
      if ((await hit.count()) === 0) hit = langDlg.getByText(/^韓語$/, { exact: true });
      if ((await hit.count()) === 0) hit = langDlg.locator('label,span,div').filter({ hasText: /^韩语$|^韓語$/ }).first();
      if ((await hit.count()) > 0) {
        await hit.first().click();
        console.log('【读回】dialog 点了 韩语');
      } else {
        // checkbox 行内含 exact 韩语
        const ok = await page.evaluate(() => {
          const dlg = document.querySelector('[role=dialog]');
          if (!dlg) return false;
          const el = Array.from(dlg.querySelectorAll('label,span,div,li')).find((e) => {
            const s = (e.innerText || '').trim();
            return s === '韩语' || s === '韓語';
          });
          if (!el) return false;
          el.click();
          return true;
        });
        console.log('【读回】evaluate 韩语', ok);
      }
      await sleep(400);
      await yixuan(page);
      await sleep(600);
    }
  } else {
    console.log('【读回】语言摘要已有韩语，跳过', st.langSnippet);
  }

  // contact — 仅当页上仍要求选择负责人/保存因缺联系人灰时才开；误开 action-sheet 会让保存然后变灰
  st = await attrsState(page);
  const needContact = await page.evaluate(() => {
    const t = document.body.innerText || '';
    if (/请选择其他负责人|請選擇其他負責人|请选择联系人|請選擇聯絡人/.test(t)) return true;
    // 按钮文案仍是「选择…」且附近无已选人名
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      /选择联系人|選擇聯絡人|选择负责人|選擇負責人/.test((b.innerText || '').trim()),
    );
    if (!btn) return false;
    const near = (btn.closest('section,div,form')?.innerText || '').slice(0, 200);
    // 已有邮箱/人名摘要则不点
    if (/@|已选|已選/.test(near) && !/请选择|請選擇/.test(near)) return false;
    return /选择联系人|選擇聯絡人|选择负责人/.test(btn.innerText || '');
  });
  if (needContact && st.saveDisabled) {
    console.log('【将要】联系人（缺项）');
    const contact = page.getByRole('button', { name: /选择联系人|選擇聯絡人|选择负责人|選擇負責人/ });
    if ((await contact.count()) > 0) {
      await contact.first().click();
      await sleep(1000);
      await page.evaluate(() => {
        const row = Array.from(
          document.querySelectorAll('[role=dialog] li, [role=dialog] [role=option], [role=dialog] label, [role=dialog] div'),
        ).find((e) => {
          const s = (e.innerText || '').trim();
          const r = e.getBoundingClientRect();
          return s.length > 1 && s.length < 40 && r.height > 12 && r.height < 80 && !/选择|選擇|搜索|搜尋/.test(s);
        });
        row?.click();
      });
      await yixuan(page);
      await sleep(500);
    }
  } else {
    console.log('【读回】联系人跳过 needContact=', needContact, 'saveDisabled=', st.saveDisabled);
  }

  // 关掉可能残留的 action-sheet（#...action-sheet.hash 会挡住保存然后）
  if (/action-sheet|hash/.test(page.url()) || (await page.locator('[role=dialog]').count()) > 0) {
    console.log('【将要】关闭残留弹层', page.url());
    await page.keyboard.press('Escape').catch(() => {});
    await dismiss(page);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find((b) =>
        /^(消除|关闭|關閉|取消|已选|已選)$/.test((b.innerText || '').trim()),
      )?.click();
    });
    await sleep(800);
    // 若 hash 仍在，回 properties 干净 URL（定点：不 reload 整表，只清 hash）
    if (/#/.test(page.url())) {
      const clean = page.url().split('#')[0];
      await page.evaluate((u) => {
        history.replaceState(null, '', u);
      }, clean);
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(500);
    }
  }

  // POI — 广州 长隆欢乐世界 Paradise
  st = await attrsState(page);
  if (!st.hasPoi) {
    console.log('【将要】POI 广州 长隆欢乐世界 / Chimelong Paradise');
    const addPoi = page.getByRole('button', { name: /添加地区和地点|添加地區和地點|添加地点|添加地點/ });
    if ((await addPoi.count()) > 0) {
      await addPoi.first().click();
      await sleep(1500);
      const search = page.locator('[role=dialog] input[type=text], [role=dialog] input:not([type])').first();
      const queries = ['长隆欢乐世界', 'Chimelong Paradise', '广州长隆欢乐世界', 'Guangzhou Chimelong Paradise'];
      let clicked = null;
      for (const q of queries) {
        if ((await search.count()) === 0) break;
        await search.fill('');
        await search.fill(q);
        await search.press('Enter');
        await sleep(2000);
        clicked = await page.evaluate(() => {
          const items = Array.from(
            document.querySelectorAll('[role=dialog] li, [role=option], [role=dialog] button, [role=dialog] div'),
          ).filter((e) => {
            const t = (e.innerText || '').replace(/\s+/g, ' ');
            const r = e.getBoundingClientRect();
            return r.height > 20 && r.height < 140 && t.length > 3 && t.length < 140;
          });
          // 优先北京/朝阳/中国；排除 한국/Korea/酒店
          const hit =
            items.find((e) => {
              const s = e.innerText || '';
              if (/한국|Korea|首尔|서울|호텔|Hotel|酒店/i.test(s) && !/广州|廣州|Guangzhou|长隆|長隆|Chimelong|番禺|中国|中國/i.test(s))
                return false;
              return /广州|廣州|Guangzhou|长隆|長隆|Chimelong|番禺|欢乐世界|歡樂|Paradise|파라다이스|中国|中國/i.test(s);
            }) || null;
          if (hit) {
            hit.click();
            return (hit.innerText || '').slice(0, 100);
          }
          return null;
        });
        console.log('【读回】POI query', q, '→', clicked);
        if (clicked) break;
      }
      if (clicked) {
        await sleep(800);
        await page.evaluate(() => {
          const lab = Array.from(document.querySelectorAll('label,span,div')).find((e) =>
            /^(旅游地|旅遊地|TRAVEL|景点|景點)/.test((e.innerText || '').trim()),
          );
          lab?.click();
        });
        await sleep(400);
        // 添加地点 / 添加
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button')).filter(
            (b) => /^(添加地点|添加地點|添加|新增|추가)$/.test((b.innerText || '').trim()) && !b.disabled,
          );
          (btns.find((b) => /地点|地點/.test(b.innerText || '')) || btns[0])?.click();
        });
        await sleep(1500);
        // 若仍有二次 添加
        await page.evaluate(() => {
          Array.from(document.querySelectorAll('button'))
            .find((b) => /^(添加|新增|추가)$/.test((b.innerText || '').trim()) && !b.disabled)
            ?.click();
        });
        await sleep(1000);
      } else {
        console.log('【结果】FAIL POI 无可用结果');
        await dismiss(page);
      }
    }
  } else {
    console.log('【读回】POI 已有，跳过');
  }

  st = await attrsState(page);
  const redList = await reds(page);
  console.log('【读回】attrs 保存前', st, 'reds', redList);

  // 门禁：保存然后 enabled 即可点；不要用 stillLang 误判挡保存
  // 真条件：!saveDisabled && （hasLang 或 langSnippet 含韩语）&& reds 无硬缺项
  const langOk = st.hasLang || /韩语|韓語|한국어/.test(st.langSnippet || '');
  if (st.saveDisabled) {
    console.log('【结果】FAIL 保存然后仍灰', { st, redList, langOk });
    // 定点：仅补语言一次
    if (!langOk) {
      console.log('【将要】定点补语言');
      const langOpen = page.getByRole('button', { name: /选择语言|選擇語言|选择你的语言/ });
      if ((await langOpen.count()) > 0) {
        await langOpen.first().click();
        await sleep(1000);
        await page.evaluate(() => {
          const dlg = document.querySelector('[role=dialog]');
          const el = dlg
            ? Array.from(dlg.querySelectorAll('label,span,div,li')).find((e) => {
                const s = (e.innerText || '').trim();
                return s === '韩语' || s === '韓語';
              })
            : null;
          el?.click();
        });
        await yixuan(page);
        await sleep(500);
      }
    }
  }

  st = await attrsState(page);
  console.log('【读回】attrs 再检', st);
  let saved = await saveThen(page, 'attrs');
  if (!saved) {
    console.log('attrs 保存然后 still grey', await reds(page), await attrsState(page));
    await sleep(1000);
    saved = await saveThen(page, 'attrs-retry');
  }
  if (!saved) {
    console.log('【结果】FAIL attrs saveThen', await attrsState(page), await reds(page));
    process.exit(2);
  }
  // 验收：离开 properties 或 URL 变化 / 无离开窗
  await sleep(1500);
  await dismiss(page);
  const after = page.url();
  console.log('【结果】attrs PASS url=', after, 'state=', await attrsState(page).catch(() => null));
  return true;
}

// ───────── intro ─────────
async function intro(page) {
  const id = readDraft();
  if (!id) throw new Error('no draft');
  await page.goto(
    `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded', timeout: 60000 },
  );
  await sleep(3000);
  await dismiss(page);

  console.log('【将要】介绍文案 + 图×3');
  await page.evaluate(
    ({ headline, highlight, intro, must, how }) => {
      const set = (sel, v) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      set('#headline', headline) || set('textarea[name=headline]', headline) || set('input[name=headline]', headline);
      set('#highlight', highlight) || set('textarea[name=highlight]', highlight);
      set('#description', intro) || set('textarea[name=description]', intro);
      set('textarea[name=checkList]', must) || set('#checkList', must);
      set('textarea[name=usage]', how) || set('#usage', how);
      // schedule NONE
      const none = document.querySelector('input[name=scheduleType][value=NONE]');
      if (none) {
        (none.closest('label') || none).click();
      } else {
        Array.from(document.querySelectorAll('label,span')).find((e) =>
          /没有单独的时间表|沒有單獨的時間表|NONE/.test(e.innerText || ''),
        )?.click();
      }
    },
    { headline: HEADLINE, highlight: HIGHLIGHT, intro: INTRO, must: MUST_KNOW, how: HOW_TO },
  );

  // also playwright fill known fields
  for (const [sel, val] of [
    ['#headline', HEADLINE],
    ['textarea[name=highlight]', HIGHLIGHT],
    ['textarea[name=description]', INTRO],
  ]) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0) await loc.fill(val).catch(() => {});
  }

  // images — first file input under 缩略图
  if (IMAGES.length >= 3) {
    const fileInputs = page.locator('input[type=file][accept*="image"]');
    const n = await fileInputs.count();
    console.log('file inputs', n, 'images', IMAGES);
    if (n > 0) {
      await fileInputs.first().setInputFiles(IMAGES);
      await sleep(5000);
    }
  }

  const thumbs = await page.evaluate(() => {
    return document.querySelectorAll('img').length;
  });
  console.log('【读回】img count rough', thumbs);

  const saved = await saveThen(page, 'intro');
  if (!saved) {
    console.log('intro blockers', await reds(page));
    process.exit(2);
  }
  console.log('【结果】intro PASS');
  return true;
}

// ───────── regs helpers ─────────
async function fillTel(page, sel, val) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.fill(String(val));
  await loc.dispatchEvent('input').catch(() => {});
  await loc.dispatchEvent('change').catch(() => {});
  return true;
}

/** 预约 sheet：label[for=id] 点一次 + checked 读回（表 B） */
async function toggleResvIds(page, ids) {
  const results = {};
  for (const rid of ids) {
    // Node 无 CSS.escape；id 为固定字面量，直接用 attribute selector
    const lab = page.locator(`label[for="${rid}"]`);
    const inp = page.locator(`[id="${rid}"]`);
    if ((await lab.count()) > 0) {
      await lab.first().scrollIntoViewIfNeeded().catch(() => {});
      const before = (await inp.count()) ? await inp.isChecked().catch(() => false) : false;
      if (!before) {
        await lab.first().click({ force: true });
        await sleep(150);
      }
      results[rid] = await inp.isChecked().catch(() => false);
    } else {
      results[rid] = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        if (el.checked) return true;
        document.querySelector(`label[for="${id}"]`)?.click() || el.click();
        return !!el.checked;
      }, rid);
    }
  }
  return results;
}

// ───────── regs ─────────
async function regs(page) {
  const id = readDraft();
  if (!id) throw new Error('no draft');
  if (!page.url().includes('/regulations') || !page.url().includes(id)) {
    await page.goto(
      `https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    await sleep(3000);
  }
  await dismiss(page);

  console.log('【将要】法规 数量/确认/取消/预约/凭证');

  // 数量 & 截单（门票最短 0 可保留；与 intro 7 日软 warning 可并存）
  await fillTel(page, '#minimumPurchaseDay', '0');
  await fillTel(page, '#minimumPurchaseQuantityPerSession', '1');
  await fillTel(page, '#maximumPurchaseQuantityPerSession', '10');
  await page.locator('input[name=bookingConfirmType][value=MANUAL]').click({ force: true }).catch(() => {});
  await fillTel(page, '#confirmationLeadTimeValue', '1');
  await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
  await page.locator('input[name=isCancelType][value="1"]').click({ force: true }).catch(() => {});
  await page.locator('input[name=isPartnerConfirm][value="true"]').click({ force: true }).catch(() => {});
  await fillTel(page, 'input[name="windows.0.deadline"]', '2');
  await fillTel(page, 'input[name="windows.0.penalty"]', '0');
  console.log('【读回】qty/cancel', await page.evaluate(() => ({
    minDay: document.querySelector('#minimumPurchaseDay')?.value,
    minQty: document.querySelector('#minimumPurchaseQuantityPerSession')?.value,
    lead: document.querySelector('#confirmationLeadTimeValue')?.value,
    leadType: document.querySelector('#confirmationLeadTimeType')?.value,
    dl: document.querySelector('input[name="windows.0.deadline"]')?.value,
    pen: document.querySelector('input[name="windows.0.penalty"]')?.value,
  })));

  // 先关残留 popup/action-sheet（#...hash 会挡住预约按钮）
  async function closeSheets() {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        btns.find((b) => /^(关闭|關閉|消除|取消)$/.test((b.innerText || '').trim()))?.click();
        // 弹窗内保存若可点则点
        const save = btns.find(
          (b) => (b.innerText || '').trim() === '保存' && !b.disabled && b.closest('[role=dialog]'),
        );
        save?.click();
      });
      await sleep(400);
      if (!/#/.test(page.url()) && (await page.locator('[role=dialog]').count()) === 0) break;
    }
    if (/#/.test(page.url())) {
      await page.evaluate((u) => history.replaceState(null, '', u), page.url().split('#')[0]);
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(300);
    }
  }
  await closeSheets();

  // 共用包含 시설 입장료（可选；失败不阻塞）
  try {
    const writeInc = page.getByRole('button', { name: /撰写|撰寫/ });
    if ((await writeInc.count()) > 0) {
      console.log('【将要】共用包含 시설 입장료');
      await writeInc.first().click({ timeout: 5000 });
      await sleep(1000);
      const fac = page.locator('#inclusions_FACILITY_ADMISSION_FEE');
      if ((await fac.count()) > 0 && !(await fac.isChecked().catch(() => false))) {
        await page.locator('label[for="inclusions_FACILITY_ADMISSION_FEE"]').click({ force: true }).catch(() => {});
      }
      const desc = page.locator('#inclusions_FACILITY_ADMISSION_FEE_description');
      if ((await desc.count()) > 0) await desc.fill('침롱 파라다이스세계 1일 입장권').catch(() => {});
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('[role=dialog] button'))
          .find((b) => (b.innerText || '').trim() === '保存' && !b.disabled)
          ?.click();
      });
      await sleep(1000);
      await closeSheets();
    }
  } catch (e) {
    console.log('include skip', e.message?.slice(0, 80));
    await closeSheets();
  }

  // 代表预约：电话+邮箱
  console.log('【将要】代表预约 电话+邮箱');
  await closeSheets();
  const repBtn = page.getByRole('button', { name: /代表预约信息|代表預約信息/ });
  if ((await repBtn.count()) === 0) {
    // 文案定位 fallback
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,div,span'))
        .find((e) => /代表预约信息|代表預約信息/.test((e.innerText || '').trim()) && (e.innerText || '').length < 30)
        ?.click();
    });
  } else {
    await repBtn.first().click({ force: true, timeout: 10000 });
  }
  await sleep(1800);
  const rep = await toggleResvIds(page, ['CELLPHONE-required', 'EMAIL-required']);
  console.log('【读回】代表', rep);
  await yixuan(page);
  await sleep(1200);
  // 页面摘要
  let resvSum = await page.evaluate(() => {
    const t = document.body.innerText;
    const i = t.indexOf('代表预约');
    return i >= 0 ? t.slice(i, i + 180).replace(/\s+/g, ' ') : '';
  });
  console.log('【读回】代表摘要', resvSum);

  // 按数量：英文姓/名 + 护照
  console.log('【将要】按数量 英文姓名+护照');
  await closeSheets();
  const perBtn = page.getByRole('button', { name: /按数量的预订信息|按數量的預訂信息|按数量预约/ });
  if ((await perBtn.count()) === 0) {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,div,span'))
        .find((e) => /按数量|按數量/.test((e.innerText || '').trim()) && (e.innerText || '').length < 30)
        ?.click();
    });
  } else {
    await perBtn.first().click({ force: true, timeout: 10000 });
  }
  await sleep(1800);
  const per = await toggleResvIds(page, [
    'ENGLISH_LAST_NAME-required',
    'ENGLISH_FIRST_NAME-required',
    'PASSPORT_NUMBER-required',
  ]);
  console.log('【读回】按数量', per);
  await yixuan(page);
  await sleep(1200);
  resvSum = await page.evaluate(() => {
    const t = document.body.innerText;
    const i = Math.max(t.indexOf('按数量'), t.indexOf('按數量'), t.indexOf('代表预约'));
    return i >= 0 ? t.slice(i, i + 280).replace(/\s+/g, ' ') : '';
  });
  console.log('【读回】预约区', resvSum);

  // 凭证
  console.log('【将要】凭证 用预约信息确认+无需换货');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /选择凭证|選擇憑證|选择优惠券|凭证及其使用/.test(b.innerText || ''))
      ?.click();
  });
  await sleep(2000);
  const vOk = await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('div,label,li,button')).find((d) => {
      const t = (d.innerText || '').replace(/\s+/g, ' ');
      const r = d.getBoundingClientRect();
      return (
        r.width > 120 &&
        r.height > 24 &&
        r.height < 140 &&
        r.y > 80 &&
        r.y < 900 &&
        (/用预约信息确认|用預約信息確認|예약정보로 확인/.test(t) || /无需换货|無需換貨|교환 불필요/.test(t)) &&
        t.length < 120
      );
    });
    if (card) {
      card.click();
      return (card.innerText || '').slice(0, 80);
    }
    // 第二选择：任意可见凭证卡
    const any = Array.from(document.querySelectorAll('[role=dialog] div, [role=dialog] li, [role=radio]')).find(
      (e) => {
        const r = e.getBoundingClientRect();
        const t = (e.innerText || '').trim();
        return r.height > 30 && r.height < 120 && t.length > 4 && t.length < 80;
      },
    );
    if (any) {
      any.click();
      return 'fallback:' + (any.innerText || '').slice(0, 60);
    }
    return null;
  });
  console.log('【读回】凭证', vOk);
  await sleep(1000);
  await yixuan(page).catch(() => {});
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /^(已选|已選|完成|保存)$/.test((b.innerText || '').trim()) && !b.disabled)
      ?.click();
  });
  await sleep(1200);

  // 再确保基础数字（弹窗可能冲掉）
  await fillTel(page, '#minimumPurchaseQuantityPerSession', '1');
  await fillTel(page, '#confirmationLeadTimeValue', '1');
  await page.locator('select[name=confirmationLeadTimeType]').selectOption('DAYS').catch(() => {});
  await fillTel(page, 'input[name="windows.0.deadline"]', '2');
  await fillTel(page, 'input[name="windows.0.penalty"]', '0');

  const redList = await reds(page);
  const st = await page.evaluate(() => {
    const save = Array.from(document.querySelectorAll('button')).find((x) =>
      /^(保存然后|保存然後)$/.test((x.innerText || '').trim()),
    );
    const t = document.body.innerText;
    return {
      saveDisabled: save ? !!save.disabled : true,
      needResv: /须填写「代表预约|須填寫「代表預約/.test(t),
      needVoucher: /请注册您的代金券|請註冊您的代金券|请注册您的凭证/.test(t),
      needCancel: /请输入取消參考|请输入取消费比例/.test(t),
      needQty: /请输入至少 1 的最小购买/.test(t),
    };
  });
  console.log('【读回】regs 保存前', st, 'reds', redList);

  const saved = await saveThen(page, 'regs');
  if (!saved) {
    console.log('【结果】FAIL regs', await reds(page), st);
    process.exit(2);
  }
  console.log('【结果】regs PASS url=', page.url());
  return true;
}

// ───────── options ─────────
async function tempThenNext(page, label) {
  await dismiss(page);
  // P11：先关「有变化…离开」窗，否则 modal 拦截临时保存
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /^(消除|取消)$/.test((b.innerText || '').trim()) && b.getBoundingClientRect().height > 0)
      ?.click();
  });
  await sleep(400);
  await dismiss(page);
  const temps = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const t = (b.innerText || '').trim();
        if (t !== '临时保存' && t !== '臨時存儲') return null;
        const r = b.getBoundingClientRect();
        return { i, t, d: b.disabled, w: Math.round(r.width), y: Math.round(r.y), h: Math.round(r.height) };
      })
      .filter(Boolean),
  );
  const pick = temps.filter((t) => !t.d && t.h > 0).sort((a, b) => a.w - b.w || b.y - a.y)[0];
  if (!pick) {
    console.log(label, 'temp MISSING', temps);
    return false;
  }
  // 用 evaluate click 避免 modal 拦截 Playwright actionability
  const clicked = await page.evaluate((idx) => {
    const b = document.querySelectorAll('button')[idx];
    if (!b || b.disabled) return false;
    b.scrollIntoView({ block: 'center' });
    b.click();
    return true;
  }, pick.i);
  console.log(label, 'temp', pick, 'clicked', clicked);
  if (!clicked) return false;
  await sleep(2500);
  for (let t = 0; t < 20; t++) {
    const nexts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const x = (b.innerText || '').trim();
          if (!/^(下一个|下個|下个)$/.test(x)) return null;
          return { i, d: b.disabled, w: Math.round(b.getBoundingClientRect().width) };
        })
        .filter(Boolean),
    );
    const n = nexts.find((x) => !x.d);
    if (n) {
      await page.locator('button').nth(n.i).click();
      console.log(label, 'next', n);
      await sleep(4000);
      await dismiss(page);
      return true;
    }
    await sleep(400);
  }
  console.log(label, 'next MISSING');
  return false;
}

async function options(page) {
  if (!PRICE) {
    console.log('【结果】FAIL 售价hkd 表显示未提供 — 硬规则0h 禁止自算 276/0.8');
    console.log('请设置: CHIMELONG_PARADISE_PRICE=<表显示> node list-chimelong-paradise-ticket.mjs options');
    process.exit(2);
  }
  const id = readDraft();
  if (!id) throw new Error('no draft');
  const LIST = `https://tour.triple.partners/product-management/registration/option?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  await dismiss(page);

  const body0 = await page.locator('body').innerText();
  if (body0.includes(OPT.name) || /1일 입장권|一日票/.test(body0)) {
    const mods = (body0.match(/修改选项|修改選項/g) || []).length;
    if (mods >= 1) {
      console.log('【结果】option already on list, STOP');
      return true;
    }
  }

  console.log('【将要】注册选项', OPT.name, 'price', OPT.price);
  await page.getByRole('button', { name: /注册\/添加选项|註冊\/添加選項/ }).first().click();
  await sleep(2500);
  await page.locator('#name').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#name').fill(OPT.name);
  await page.locator('#description').fill(OPT.desc);

  // price type AGE adult
  console.log('【将要】价格类型 成人 + 说明');
  await page.getByRole('button', { name: /选择价格类型|選擇價格類型/ }).first().click();
  await sleep(1200);
  if ((await page.locator('#AGE-tab').count()) > 0) await page.locator('#AGE-tab').click();
  await sleep(500);
  await page.locator('label').filter({ hasText: /^成人$/ }).first().click();
  await sleep(800);
  const adult = await page.evaluate(() => {
    const lab = Array.from(document.querySelectorAll('label')).find((l) => (l.innerText || '').trim() === '成人');
    const input = lab && document.getElementById(lab.getAttribute('for'));
    return { checked: input?.checked, aria: input?.getAttribute('aria-checked') };
  });
  console.log('【读回】成人', adult);

  const descIn = page.locator('input[placeholder*="19"], input[placeholder*="例)"]').first();
  if ((await descIn.count()) > 0) {
    await descIn.fill(OPT.ptd);
    console.log('【读回】PT desc', await descIn.inputValue());
  } else {
    await page.evaluate((d) => {
      const cands = Array.from(document.querySelectorAll('input[type=text]')).filter((i) => {
        const r = i.getBoundingClientRect();
        return r.y > 500 && r.y < 680 && r.width > 100;
      });
      const t = cands.find((c) => !c.value) || cands[0];
      if (t) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(t, d);
        t.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, OPT.ptd);
  }
  await page.evaluate(() => {
    document.querySelectorAll('input[type=tel]').forEach((i) => {
      const r = i.getBoundingClientRect();
      if (r.y > 620 && r.y < 760 && (!i.value || i.value === '0')) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '1');
        i.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });
  await sleep(400);
  let doneD = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '完成');
    return b?.disabled;
  });
  if (doneD) {
    const n = await page.locator('input[type=text]:visible').count();
    for (let i = 0; i < n; i++) {
      const el = page.locator('input[type=text]:visible').nth(i);
      const box = await el.boundingBox();
      const val = await el.inputValue();
      const name = await el.getAttribute('name');
      if (name === 'name') continue;
      if (box && box.y > 500 && box.y < 680 && !val) await el.fill(OPT.ptd);
    }
    await sleep(300);
  }
  await page.getByRole('button', { name: /^完成$/ }).last().click();
  await sleep(1500);
  const ptOk = await page.evaluate(() => ({
    need: /请设置价格类型/.test(document.body.innerText),
    rep: /代表价|代表價|成人/.test(document.body.innerText),
  }));
  console.log('【结果】PT', ptOk);
  if (ptOk.need) {
    console.log('【结果】FAIL PT');
    process.exit(2);
  }

  await page.locator('#name').fill(OPT.name);
  await page.locator('#description').fill(OPT.desc);

  // include P7b：设施入场 + 排除 + 弹窗保存（未点弹窗保存则临时保存仍灰）
  console.log('【将要】包含 시설 입장료 + 排除（弹窗保存）');
  await page.getByRole('button', { name: /添加\s*填写|添加填写/ }).first().click();
  await sleep(1500);
  await page.locator('[role=dialog]').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  const fac = page.locator('#inclusions_FACILITY_ADMISSION_FEE');
  if ((await fac.count()) > 0) {
    if (!(await fac.isChecked().catch(() => false))) {
      await page.locator('label[for="inclusions_FACILITY_ADMISSION_FEE"]').click({ force: true });
    }
    console.log('【读回】facility', await fac.isChecked());
    const d = page.locator('#inclusions_FACILITY_ADMISSION_FEE_description');
    if ((await d.count()) > 0) await d.fill('침롱 파라다이스세계 1일 입장권');
  }
  // 排除必填，否则红字「包含和不包含…」
  for (const sel of ['#exclusions', 'textarea[name=exclusions]', '[role=dialog] textarea']) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0) {
      const v = await loc.inputValue().catch(() => '');
      if (!v || v.length < 5) await loc.fill('개인 경비\n포함 사항에 명시되지 않은 기타 비용');
      break;
    }
  }
  await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]');
    Array.from((dlg || document).querySelectorAll('button'))
      .find((x) => (x.innerText || '').trim() === '保存' && !x.disabled)
      ?.click();
  });
  await sleep(2000);
  const inc = await page.evaluate(() => ({
    red: /包含和不包含사항을 입력해 주세요/.test(document.body.innerText),
    has: /시설|입장료|入场|POPLAND|包括/.test(document.body.innerText),
  }));
  console.log('【结果】include', inc);
  if (inc.red) {
    console.log('【结果】FAIL include 红字仍在');
    process.exit(2);
  }

  // ONE_YEAR + price
  console.log('【将要】ONE_YEAR +', PRICE);
  await page.locator('#name').fill(OPT.name);
  await page.evaluate(() => {
    const y = document.querySelector('input[value="ONE_YEAR"]');
    if (y) {
      y.scrollIntoView({ block: 'center' });
      y.click();
    } else {
      Array.from(document.querySelectorAll('label,span,div'))
        .find((e) => (e.innerText || '').trim() === '1年')
        ?.click();
    }
  });
  await sleep(1500);
  const period = await page.evaluate(() => ({
    one: document.querySelector('input[value=ONE_YEAR]')?.checked,
    from: document.querySelector('input[name=from]')?.value,
    to: document.querySelector('input[name=to]')?.value,
  }));
  console.log('【读回】period', period);

  const pl = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]');
  if ((await pl.count()) > 0) {
    await pl.last().scrollIntoViewIfNeeded();
    await pl.last().fill(PRICE);
    await pl.last().press('Tab');
    console.log('【读回】price', await pl.last().inputValue());
  }
  await sleep(1200);
  // 再保 name/desc（价填后可能被冲）
  await page.locator('#name').fill(OPT.name);
  await page.locator('#description').fill(OPT.desc);
  const cal = await page.evaluate((p) => {
    const re = new RegExp(p.replace('.', '\\.'), 'g');
    return (document.body.innerText.match(re) || []).length;
  }, PRICE);
  console.log('【读回】cal hits', cal);

  // 枚举红字 + 临时保存门禁（禁止 temp 灰仍 goto 列表丢表）
  await dismiss(page);
  let blockers = await reds(page);
  let tempState = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => /临时保存|臨時存儲/.test((b.innerText || '').trim()))
      .map((b) => ({
        t: (b.innerText || '').trim(),
        d: b.disabled,
        w: Math.round(b.getBoundingClientRect().width),
      })),
  );
  console.log('【读回】opt reds', blockers, 'temps', tempState);

  // 常见：排除未填 / 库存未选
  if (tempState.every((t) => t.d)) {
    await page.evaluate(() => {
      const ta = document.querySelector('textarea[name=exclusions], #exclusions');
      if (ta && !ta.value) {
        const proto = HTMLTextAreaElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(
          ta,
          '개인 경비\n포함 사항에 명시되지 않은 기타 비용',
        );
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // 不设置库存
      const inv = document.querySelector('input[name*="inventory"][value=RIGHT], input[value=RIGHT]');
      inv?.click();
    });
    // 价格输入 blur
    const pl2 = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]');
    if ((await pl2.count()) > 0) {
      await pl2.last().fill(PRICE);
      await pl2.last().press('Tab');
    }
    await sleep(800);
    blockers = await reds(page);
    tempState = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((b) => /临时保存|臨時存儲/.test((b.innerText || '').trim()))
        .map((b) => ({ t: (b.innerText || '').trim(), d: b.disabled, w: Math.round(b.getBoundingClientRect().width) })),
    );
    console.log('【读回】opt patch', blockers, tempState);
  }

  const ok = await tempThenNext(page, 'opt1');
  if (!ok) {
    console.log('【结果】FAIL temp/next', await reds(page), await page.evaluate(() => ({
      name: document.querySelector('#name')?.value,
      url: location.href,
      bodyNeed: (document.body.innerText.match(/请[^\n]{2,50}/g) || []).slice(0, 15),
    })));
    process.exit(2);
  }
  // 仅成功后回列表验收
  if (!page.url().includes('/option') || page.url().includes('option-form')) {
    await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2500);
  }
  await dismiss(page);
  const final = await page.evaluate((price) => {
    const t = document.body.innerText;
    return {
      mods: (t.match(/修改选项|修改選項/g) || []).length,
      hasOpt: /1일|입장권|一日/.test(t),
      priceHit: price ? (t.match(new RegExp(String(price).replace('.', '\\.'), 'g')) || []).length : 0,
      snip: t.slice(0, 700),
    };
  }, PRICE);
  console.log('【结果】FINAL', final);
  console.log('STOP 选项管理 — never 提交审核');
  if (final.mods < 1) process.exit(2);
  return true;
}

// main
const { page } = await getPage();
console.log('START phase=', PHASE, 'url=', page.url());
console.log('【复用入口】门票 skill P0–P10 + list-chimelong-safari 流程壳 + 售价列 0h');
console.log('【售价来源】售价hkd=' + (PRICE || '(待表显示)') + '（加价逻辑=276 未用作售价；未自算）');

if (PHASE === 'bootstrap' || PHASE === 'all') await bootstrap(page);
if (PHASE === 'attrs' || PHASE === 'all') await attrs(page);
if (PHASE === 'intro' || PHASE === 'all') await intro(page);
if (PHASE === 'regs' || PHASE === 'all') await regs(page);
if (PHASE === 'options' || PHASE === 'all') await options(page);

console.log('DONE draft=', readDraft());
process.exit(0);
