/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Fix Osaka Station (c36c1517…) times ONLY for all 4 options.
 * Correct open path: time field 더 보기 → 编辑 → 重复小时添加 → 07:00–21:30 → 生成 → 保存
 * Then 临时保存 → 下一个. Never 提交审核.
 */
import { chromium } from 'playwright';

const PRODUCT_ID = process.env.OS_ID || 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c';
const BASE = 'https://tour.triple.partners/product-management/registration';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function stayIfLeave(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    if (!/有變化|有变化|更改将丢失|确定要离开|確定要離開/.test(body)) return false;
    Array.from(document.querySelectorAll('button'))
      .find((b) => /消除|取消/.test((b.innerText || '').trim()))
      ?.click();
    return true;
  });
}

async function tempThenNext(page, label) {
  await stayIfLeave(page);
  const ts = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return {
          i,
          t: (b.innerText || '').trim(),
          d: b.disabled,
          w: Math.round(r.width),
          vis: r.width > 0,
        };
      })
      .filter((b) => b.vis && !b.d && b.t === '临时保存')
      .sort((a, b) => a.w - b.w);
    if (!c[0]) return false;
    document.querySelectorAll('button')[c[0].i].click();
    return true;
  });
  console.log(`[${label}] 临时保存`, ts);
  await sleep(2000);
  const nx = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return {
          i,
          t: (b.innerText || '').trim(),
          d: b.disabled,
          w: Math.round(r.width),
          vis: r.width > 0,
        };
      })
      .filter((b) => b.vis && !b.d && b.t === '下一个' && b.w > 150)
      .sort((a, b) => b.w - a.w);
    if (!c[0]) return false;
    document.querySelectorAll('button')[c[0].i].click();
    return true;
  });
  console.log(`[${label}] 下一个`, nx);
  await sleep(3500);
  await stayIfLeave(page);
  if (!nx) {
    await sleep(1500);
    const nx2 = await page.evaluate(() => {
      const c = Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const r = b.getBoundingClientRect();
          return {
            i,
            t: (b.innerText || '').trim(),
            d: b.disabled || b.getAttribute('aria-disabled') === 'true',
            w: Math.round(r.width),
            vis: r.width > 0,
          };
        })
        .filter(
          (b) =>
            b.vis &&
            !b.d &&
            (b.t === '下一个' || b.t === '下個' || b.t === '다음') &&
            b.w > 100,
        )
        .sort((a, b) => b.w - a.w);
      if (!c[0]) return { ok: false, dump: Array.from(document.querySelectorAll('button')).map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 30) };
      document.querySelectorAll('button')[c[0].i].click();
      return { ok: true, pick: c[0] };
    });
    console.log(`[${label}] 下一个 retry`, nx2);
    await sleep(3500);
    await stayIfLeave(page);
    if (!nx2.ok) throw new Error(label + ' next failed');
  }
  if (!ts) throw new Error(label + ' temp save failed');
}

function parseTimeLine(body) {
  const m = body.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
  if (!m) return { count: 0, first: null, last: null, raw: '' };
  const slots = m[1]
    .split(/[·.\s]+/)
    .map((s) => s.trim())
    .filter((x) => /^\d{2}:\d{2}$/.test(x));
  return {
    count: slots.length,
    first: slots[0] || null,
    last: slots[slots.length - 1] || null,
    raw: m[1].trim().slice(0, 100),
  };
}

async function openTimeEditor(page) {
  // Path A: 设置时间 button (empty state)
  let opened = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return t === '设置时间' || t === '設定時間' || t === '시간 설정';
    });
    if (b) {
      b.scrollIntoView({ block: 'center' });
      b.click();
      return '设置时间';
    }
    return null;
  });
  if (opened) {
    await sleep(1500);
    return opened;
  }

  // Path B: 더 보기 → 编辑
  await page.locator('text=时间段').first().scrollIntoViewIfNeeded().catch(() => {});
  await sleep(300);
  const more = page.locator('[class*="time-slots-field"] button[aria-label="더 보기"]');
  if (await more.count()) {
    await more.click({ force: true });
    await sleep(500);
    // click 编辑 in fixed menu (z-index high)
    const edit = await page.evaluate(() => {
      // prefer fixed menu with 编辑
      const fixed = Array.from(document.querySelectorAll('div')).filter((el) => {
        const s = getComputedStyle(el);
        const t = (el.innerText || '').trim();
        return (
          (s.position === 'fixed' || parseInt(s.zIndex) > 100) &&
          (t === '编辑' || t.startsWith('编辑') || t.includes('编辑\n') || t === '수정')
        );
      });
      // click leaf 编辑
      const leaf = Array.from(document.querySelectorAll('div,button,span')).find((el) => {
        const t = (el.innerText || '').trim();
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          (t === '编辑' || t === '수정') &&
          r.width > 40 &&
          r.height > 20 &&
          r.height < 60 &&
          (s.position === 'fixed' || parseInt(s.zIndex) > 10 || el.closest('[style*="z-index"]'))
        );
      });
      if (leaf) {
        leaf.click();
        return 'leaf-编辑';
      }
      // click in fixed panel text 编辑
      for (const el of fixed) {
        const hit = Array.from(el.querySelectorAll('div,button,span')).find(
          (c) => (c.innerText || '').trim() === '编辑',
        );
        if (hit) {
          hit.click();
          return 'panel-编辑';
        }
        // click first half of panel (编辑 is above 删除)
        const r = el.getBoundingClientRect();
        return { needClick: { x: r.x + r.width / 2, y: r.y + 40 } };
      }
      return null;
    });
    console.log('edit menu', edit);
    if (edit?.needClick) {
      await page.mouse.click(edit.needClick.x, edit.needClick.y);
    }
    await sleep(1500);
  }

  const body = await page.locator('body').innerText();
  if (body.includes('开始时间') || body.includes('重复') || body.includes('新增各别')) {
    return 'modal-open';
  }
  // Path C: coordinate click top of fixed menu if still open
  const menuBox = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div')).find((d) => {
      const s = getComputedStyle(d);
      const t = (d.innerText || '').trim();
      return s.position === 'fixed' && parseInt(s.zIndex) > 100 && t.includes('编辑') && t.includes('删除');
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + 35 };
  });
  if (menuBox) {
    await page.mouse.click(menuBox.x, menuBox.y);
    await sleep(1500);
  }
  const body2 = await page.locator('body').innerText();
  return body2.includes('开始时间') ? 'modal-open-c' : 'fail';
}

async function setTimesInModal(page) {
  // delete existing wrong slots
  for (let i = 0; i < 40; i++) {
    const del = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (x) => (x.innerText || '').trim() === '删除' || (x.innerText || '').trim() === '刪除',
      );
      if (!b) return false;
      b.click();
      return true;
    });
    if (!del) break;
    await sleep(200);
  }
  console.log('deleted old rows');

  // 重复 小时 添加 / 반복 시간 추가
  const rep = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').replace(/\s+/g, '');
      return (
        (t.includes('重复') && t.includes('添加')) ||
        t.includes('반복시간추가') ||
        t === '반복시간추가' ||
        (x.innerText || '').includes('반복 시간 추가')
      );
    });
    if (!b) return null;
    b.click();
    return (b.innerText || '').trim();
  });
  console.log('repeat btn', rep);
  await sleep(1000);

  async function pick(idx, hour, minute) {
    const fields = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return { i, t, vis: r.height > 0 && r.width > 0 };
        })
        .filter((b) => b.vis && (b.t === '选择' || b.t === '選擇' || /^\d{2}:\d{2}$/.test(b.t))),
    );
    console.log('fields', fields);
    const target = fields[idx] || fields[0];
    if (!target) return false;
    await page.locator('button').nth(target.i).click({ force: true });
    await sleep(400);
    // hour left
    await page.evaluate((h) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === h,
      );
      if (opts.length) {
        opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      Array.from(document.querySelectorAll('div,li,span'))
        .filter(
          (el) =>
            (el.innerText || '').trim() === h &&
            el.children.length === 0 &&
            el.getBoundingClientRect().height > 8,
        )
        .sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)[0]
        ?.click();
    }, hour);
    await sleep(200);
    // minute right
    await page.evaluate((m) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === m,
      );
      if (opts.length) {
        opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      Array.from(document.querySelectorAll('div,li,span'))
        .filter(
          (el) =>
            (el.innerText || '').trim() === m &&
            el.children.length === 0 &&
            el.getBoundingClientRect().height > 8,
        )
        .sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x)[0]
        ?.click();
    }, minute);
    await sleep(400);
    return true;
  }

  await pick(0, '07', '00');
  await pick(1, '21', '30');

  // interval: click 分钟 then 30 (简体 UI)
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => {
        const t = (x.innerText || '').trim();
        return t === '分钟' || t === '分鐘' || t === '분';
      })
      ?.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role=option],button,li,div')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '30' && r.width > 0 && r.height > 0 && (el.children?.length || 0) <= 1;
    });
    els.at(-1)?.click();
  });
  await sleep(400);

  // 生成 / 생성 — 简体扩展可能误译为「一代」
  const gen = await page.evaluate(() => {
    const labels = ['생성', '生成', '一代', '生成时间', '创建'];
    let b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return labels.includes(t);
    });
    // fallback: small button near 小时/分钟 row
    if (!b) {
      const minBtn = Array.from(document.querySelectorAll('button')).find(
        (x) => (x.innerText || '').trim() === '分钟' || (x.innerText || '').trim() === '小時' || (x.innerText || '').trim() === '小时',
      );
      if (minBtn) {
        const my = minBtn.getBoundingClientRect().y;
        b = Array.from(document.querySelectorAll('button')).find((x) => {
          const t = (x.innerText || '').trim();
          const r = x.getBoundingClientRect();
          return (
            Math.abs(r.y - my) < 20 &&
            r.width > 40 &&
            r.width < 100 &&
            t &&
            t !== '小时' &&
            t !== '分钟' &&
            t !== '小時' &&
            t !== '分鐘'
          );
        });
      }
    }
    if (!b) return null;
    b.click();
    return (b.innerText || '').trim();
  });
  console.log('generate', gen);
  if (!gen) throw new Error('生成 button not found — refuse to save partial times');
  await sleep(2800);

  // verify list in modal
  const slots = await page.evaluate(() => {
    const body = document.body.innerText || '';
    // count 删除 buttons or time rows
    const dels = Array.from(document.querySelectorAll('button')).filter(
      (b) => (b.innerText || '').trim() === '删除',
    ).length;
    const times = [...body.matchAll(/\b([01]\d|2[0-3]):[0-5]\d\b/g)].map((m) => m[0]);
    const unique = [...new Set(times)].filter((t) => {
      const [h, mi] = t.split(':').map(Number);
      return (mi === 0 || mi === 30) && h >= 7 && h <= 21;
    });
    unique.sort();
    return { dels, count: unique.length, first: unique[0], last: unique[unique.length - 1] };
  });
  console.log('modal slots', slots);
  if (slots.count < 28 || slots.first !== '07:00' || slots.last !== '21:30') {
    throw new Error('slot verify fail: ' + JSON.stringify(slots));
  }

  // 保存 (not 关闭)
  const saved = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return {
          i,
          t: (b.innerText || '').trim(),
          w: Math.round(r.width),
          vis: r.width > 0,
        };
      })
      .filter((b) => b.vis && (b.t === '保存' || b.t === '節省' || b.t === '节省' || b.t === '완료'));
    // prefer wide dark 保存
    buttons.sort((a, b) => b.w - a.w);
    if (!buttons[0]) return null;
    document.querySelectorAll('button')[buttons[0].i].click();
    return buttons[0];
  });
  console.log('modal save', saved);
  await sleep(1500);
  return slots;
}

async function fixOption(page, idx) {
  console.log(`\n===== OPT ${idx + 1}/4 =====`);
  await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);
  await stayIfLeave(page);
  await page.evaluate((i) => {
    Array.from(document.querySelectorAll('button'))
      .filter((b) => /修改选项/.test((b.innerText || '').trim()))
      [i]?.click();
  }, idx);
  await sleep(2500);
  if (!(await page.locator('#name').count())) throw new Error('form not open ' + idx);

  const before = parseTimeLine(await page.locator('body').innerText());
  console.log('before', before);

  const how = await openTimeEditor(page);
  console.log('opened via', how);
  if (how === 'fail') throw new Error('cannot open time editor opt ' + idx);

  const slots = await setTimesInModal(page);

  // re-read form 时间段 line
  await sleep(500);
  const after = parseTimeLine(await page.locator('body').innerText());
  console.log('after on form', after);
  if (after.count < 28 || after.first !== '07:00' || after.last !== '21:30') {
    throw new Error('form still wrong after save: ' + JSON.stringify(after));
  }

  await tempThenNext(page, `opt${idx + 1}`);
  return { idx, before, slots, after };
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = browser.contexts()[0];
  const page =
    ctx.pages().find((p) => (p.url() || '').includes('tour.triple.partners')) || ctx.pages()[0];
  await page.bringToFront().catch(() => {});
  await stayIfLeave(page);
  console.log('FIX Osaka Station times correctly; PRODUCT', PRODUCT_ID);
  console.log('NEVER 提交审核');

  const startIdx = Number(process.env.START_IDX || '0');
  const results = [];
  for (let i = startIdx; i < 4; i++) {
    // skip if already 07:00-21:30
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(1500);
    await page.evaluate((idx) => {
      Array.from(document.querySelectorAll('button'))
        .filter((b) => /修改选项/.test((b.innerText || '').trim()))
        [idx]?.click();
    }, i);
    await sleep(2000);
    const cur = parseTimeLine(await page.locator('body').innerText());
    if (cur.count >= 28 && cur.first === '07:00' && cur.last === '21:30') {
      console.log(`OPT ${i + 1} already OK`, cur);
      await tempThenNext(page, `skip${i + 1}`);
      results.push({ idx: i, skipped: true, cur });
      continue;
    }
    // leave form without next if wrong — reopen via fixOption
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
    results.push(await fixOption(page, i));
  }

  // final verify
  const verify = [];
  for (let i = 0; i < 4; i++) {
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(1500);
    await page.evaluate((idx) => {
      Array.from(document.querySelectorAll('button'))
        .filter((b) => /修改选项/.test((b.innerText || '').trim()))
        [idx]?.click();
    }, i);
    await sleep(2000);
    const t = parseTimeLine(await page.locator('body').innerText());
    console.log('VERIFY', i + 1, t);
    verify.push(t);
    await tempThenNext(page, `v${i + 1}`);
  }

  await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(1000);
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return { i, t: (b.innerText || '').trim(), d: b.disabled, w: r.width, vis: r.width > 0 };
      })
      .filter((b) => b.vis && !b.d && b.t === '临时保存')
      .sort((a, b) => b.w - a.w);
    if (c[0]) document.querySelectorAll('button')[c[0].i].click();
  });
  await sleep(1500);

  const allOk = verify.every((v) => v.count >= 28 && v.first === '07:00' && v.last === '21:30');
  console.log('\n========== DONE ==========');
  console.log(JSON.stringify({ results, verify, allOk }, null, 2));
  console.log('提交审核 NOT clicked');
  if (!allOk) process.exit(2);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
