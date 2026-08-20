#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const KLOOK_START_URL = "https://www.klook.com/en-US/rails-32/1012-japan/search/?date_range_count=90&origin_position_name=Tokyo%20Station&origin_position=fbf76020-13a1-41b8-a33a-ce13ccdbabd9&destination_position_name=Osaka&destination_position=8b4e5d2e-21ff-4488-b734-d55676a2ec1e&departure_date=2026-07-13&passengers=%5B%5D&isExternal=1&dd_referrer=&return_date=&return_time=&spm=LanguageCurrencySelectionPopup.PopularCurrency_LIST&clickId=3e74228075";

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    const bundledModules = path.resolve(path.dirname(process.execPath), "..", "node_modules");
    try {
      const pnpmDir = path.join(bundledModules, ".pnpm");
      const entry = fs.readdirSync(pnpmDir).find((name) => name.startsWith("playwright@"));
      if (!entry) throw new Error("Codex bundled playwright package not found");
      return require(path.join(pnpmDir, entry, "node_modules", "playwright"));
    } catch {
      throw new Error(`Playwright is unavailable. Run this Skill in Codex or install playwright. ${error.message}`);
    }
  }
}

function parseArgs(argv) {
  const args = { headed: false, keepOpen: false, url: KLOOK_START_URL };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--headed") args.headed = true;
    else if (arg === "--keep-open") args.keepOpen = true;
    else if (arg === "--url") args.url = argv[++index];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: !args.headed });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 }, locale: "en-US" });

  try {
    const response = await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
    const status = response ? response.status() : null;
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      bodyTextSample: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 500),
    }));
    console.log(JSON.stringify({
      ok: Boolean(status && status >= 200 && status < 400),
      source: "Klook public rail search page",
      requestedUrl: args.url,
      status,
      blockedByAccessControl: status === 403,
      ...pageInfo,
      interactions: "none",
    }, null, 2));

    if (args.keepOpen && args.headed) {
      await new Promise(() => {});
    }
  } finally {
    if (!args.keepOpen) await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = { KLOOK_START_URL };
