import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();
await page.keyboard.press('Escape');
await sleep(4000);
await page.screenshot({ path: 'artifacts/screenshots/feishu-loaded.png', fullPage: false });
const info = await page.evaluate(() => {
  const sheetTabs = [...document.querySelectorAll('.sheet-tabs, [class*="sheet-tab"] *')]
    .map((el) => (el.innerText || '').trim())
    .filter(Boolean)
    .slice(0, 20);
  const menus = [...document.querySelectorAll('button, [role="menuitem"], [class*="menu"]')]
    .map((el) => (el.innerText || el.getAttribute('aria-label') || '').trim())
    .filter((t) => t && t.length < 20 && /导入|导出|文件|插入|粘贴|菜单/.test(t));
  return {
    url: location.href,
    text: (document.body.innerText || '').slice(0, 2500),
    sheetTabs: [...new Set(sheetTabs)].slice(0, 15),
    menus: [...new Set(menus)].slice(0, 20),
  };
});
console.log(JSON.stringify(info, null, 2));
process.exit(0);
