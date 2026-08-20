#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

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

const START_URL = "https://hk.trip.com/trains/asia/list?locale=zh-HK&curr=USD&redirectedbyasiamiddleware=1&triptab=train&departurecountrycode=JP&arrivalcountrycode=JP&tripTab=train&biztype=JP&departdate=2026-07-13&departurecitycode=JP03271&arrivalcitycode=JP03869&departurecity=%E6%9D%B1%E4%BA%AC&arrivalcity=%E5%A4%A7%E9%98%AA";

const STATIONS = [
  { key: "tokyo", canonical: "Tokyo Station", tripQuery: "Tokyo", tripQueries: ["東京", "Tokyo"], preferPattern: /東京\s*\/\s*東京|Tokyo Station/i, tripPattern: /東京\s*\/\s*東京|東京|Tokyo/i, aliases: ["东京", "東京", "东京站", "東京站", "tokyo", "tokyo station"] },
  { key: "kyoto", canonical: "Kyoto", tripQuery: "Kyoto", tripQueries: ["京都", "Kyoto"], preferPattern: /京都\s*\/\s*京都|Kyoto/i, tripPattern: /京都\s*\/\s*京都|京都|Kyoto/i, aliases: ["京都", "京都站", "kyoto"] },
  { key: "osaka", canonical: "Shin-Osaka", tripQuery: "Osaka", tripQueries: ["大阪", "新大阪", "Osaka", "Shin-Osaka"], preferPattern: /大阪\s*\/\s*大阪|新大阪|Shin-Osaka/i, tripPattern: /大阪\s*\/\s*大阪|新大阪|大阪|Osaka/i, aliases: ["大阪", "大阪站", "新大阪", "新大阪站", "osaka", "shin-osaka", "shin osaka"] },
  { key: "kanazawa", canonical: "Kanazawa", tripQuery: "Kanazawa", tripQueries: ["金澤", "金沢", "Kanazawa"], preferPattern: /金澤\s*\/\s*金沢|Kanazawa/i, tripPattern: /金澤\s*\/\s*金沢|金澤|金沢|Kanazawa/i, aliases: ["金泽", "金泽站", "金澤", "金澤站", "金沢", "金沢站", "kanazawa"] },
];

function parseArgs(argv) {
  const args = { headed: false, keepOpen: false, search: true, extractOnly: false, maxWaitMs: 10000, htmlOutput: null, maxLaterClicks: 16, maxTrains: 40 };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--text") args.text = argv[++i];
    else if (arg === "--file") args.file = argv[++i];
    else if (arg === "--output") args.output = argv[++i];
    else if (arg === "--html-output") args.htmlOutput = argv[++i];
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--keep-open") args.keepOpen = true;
    else if (arg === "--no-search") args.search = false;
    else if (arg === "--extract-only") args.extractOnly = true;
    else if (arg === "--max-wait-ms") args.maxWaitMs = Number(argv[++i]);
    else if (arg === "--max-later-clicks") args.maxLaterClicks = Number(argv[++i]);
    else if (arg === "--max-trains") args.maxTrains = Number(argv[++i]);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.text && args.file) args.text = fs.readFileSync(args.file, "utf8");
  if (!args.text) throw new Error("provide --text or --file");
  if (!args.htmlOutput && args.output) args.htmlOutput = args.output.replace(/\.json$/i, ".html");
  return args;
}

function normalizeDigits(text) {
  return text.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
}

function findStation(fragment) {
  const lower = fragment.toLowerCase();
  return STATIONS.find((station) => station.aliases.some((alias) => lower.includes(alias.toLowerCase()))) || null;
}

function extractDate(text) {
  let match = text.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!match) match = text.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), iso: `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` };
}

function needsReleasedInventoryReferenceDate(text) {
  return /樱花季|櫻花季|热门日期|熱門日期|已释放库存|已釋放庫存|报价参考|報價參考/.test(text);
}
function extractRoute(text) {
  const routeMatch = text.match(/从\s*(.+?)\s*(?:去|到|前往)\s*(.+?)(?:，|,|。|；|;|$)/);
  if (routeMatch) {
    const origin = findStation(routeMatch[1]);
    const destination = findStation(routeMatch[2]);
    if (origin && destination) return { origin, destination };
  }

  const hits = [];
  for (const station of STATIONS) {
    for (const alias of station.aliases) {
      const index = text.toLowerCase().indexOf(alias.toLowerCase());
      if (index >= 0) hits.push({ index, station });
    }
  }
  hits.sort((a, b) => a.index - b.index);
  const unique = [];
  for (const hit of hits) {
    if (!unique.some((item) => item.key === hit.station.key)) unique.push(hit.station);
  }
  return { origin: unique[0] || null, destination: unique[1] || null };
}

function extractPassengers(text) {
  const adults = Number((text.match(/(\d+)\s*(?:大|成人|位成人|个成人)/) || [])[1] || 0) || null;
  const children = Number((text.match(/(\d+)\s*(?:小|儿童|兒童|小孩|位儿童|位兒童)/) || [])[1] || 0) || null;
  return { adults, children, raw: [adults ? `${adults} 成人` : null, children ? `${children} 儿童` : null].filter(Boolean).join("，") || null };
}

function extractTime(text) {
  const explicit = text.match(/(上午|早上|下午|晚上|中午)?\s*(\d{1,2})\s*(?:点|點|时|時)(半|\s*(\d{1,2})\s*分?)?/);
  if (explicit) {
    let hour = Number(explicit[2]);
    const period = explicit[1] || "";
    if ((period === "下午" || period === "晚上") && hour >= 1 && hour <= 11) hour += 12;
    if (period === "中午" && hour < 11) hour += 12;
    const minute = explicit[3] === "半" ? 30 : Number(explicit[4] || 0);
    return { raw: explicit[0], hour, minute, resolved: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
  }
  const clock = text.match(/(\d{1,2}):(\d{2})/);
  if (clock) {
    const hour = Number(clock[1]);
    const minute = Number(clock[2]);
    return { raw: clock[0], hour, minute, resolved: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
  }
  if (text.includes("下午")) return { raw: "下午", hour: 15, minute: 0, resolved: "15:00" };
  if (text.includes("上午") || text.includes("早上")) return { raw: "上午", hour: 8, minute: 0, resolved: "08:00" };
  if (text.includes("中午")) return { raw: "中午", hour: 12, minute: 0, resolved: "12:00" };
  if (text.includes("晚上")) return { raw: "晚上", hour: 18, minute: 0, resolved: "18:00" };
  return { raw: null, hour: null, minute: null, resolved: null };
}

function extractRequest(text) {
  // OCR commonly inserts spaces between Chinese characters. Remove only those gaps so
  // city aliases and passenger phrases remain recognizable without altering dates/numbers.
  const normalized = normalizeDigits(text.trim()).replace(/(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "");
  const route = extractRoute(normalized);
  const request = {
    sourceText: normalized,
    date: extractDate(normalized),
    origin: route.origin,
    destination: route.destination,
    time: extractTime(normalized),
    passengers: extractPassengers(normalized),
    referenceDateRequest: !extractDate(normalized) && needsReleasedInventoryReferenceDate(normalized) ? { reason: "released_inventory_reference_date" } : null,
  };
  request.missingFields = [];
  if (!request.date && !request.referenceDateRequest) request.missingFields.push("date");
  if (!request.origin) request.missingFields.push("origin");
  if (!request.destination) request.missingFields.push("destination");
  return request;
}

async function selectTripCity(page, placeholder, station) {
  const input = page.locator(`input[placeholder="${placeholder}"]`).last();
  const current = await page.locator(`input[placeholder="${placeholder}"]`).first().inputValue().catch(() => "");
  if (station.tripPattern.test(current)) return { skipped: true, value: current, query: null };

  const queries = Array.from(new Set([...(station.tripQueries || []), station.tripQuery, station.canonical].filter(Boolean)));
  let lastError = null;

  for (const query of queries) {
    await input.click({ force: true });
    await page.keyboard.press("Control+A");
    await page.keyboard.type(query, { delay: 20 });
    await page.waitForTimeout(1600);

    const options = page.locator('div[role="button"][class*="render_row"]').filter({ hasText: station.tripPattern });
    const preferred = options.filter({ hasText: station.preferPattern || station.tripPattern }).first();
    const fallback = options.first();
    try {
      let option = preferred;
      await option.waitFor({ state: "visible", timeout: 2500 }).catch(async () => {
        option = fallback;
        await option.waitFor({ state: "visible", timeout: 7000 });
      });
      await option.click({ force: true });
      await page.waitForTimeout(1200);
      await page.keyboard.press("Escape").catch(() => {});
      return { skipped: false, query, value: await page.locator(`input[placeholder="${placeholder}"]`).first().inputValue().catch(() => "") };
    } catch (error) {
      lastError = error;
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  throw lastError || new Error(`city option not found: ${station.canonical}`);
}
async function selectTripDate(page, date, referenceDateRequest = null) {
  await page.locator('div[role="button"]').filter({ hasText: /出發時間/ }).first().click({ force: true });
  await page.waitForTimeout(1000);

  async function readChoices() {
    return page.evaluate(() => {
      function iso(year, month, day) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      function weekday(year, month, day) {
        return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      }

      return Array.from(document.querySelectorAll('[role="checkbox"]')).map((node, index) => {
        const label = node.getAttribute("aria-label") || "";
        const match = label.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const selectable = /請選擇|價格為/.test(label) && !String(node.className || "").includes("is-disable");
        return { index, label, year, month, day, iso: iso(year, month, day), weekday: weekday(year, month, day), selectable };
      }).filter(Boolean).sort((a, b) => a.iso.localeCompare(b.iso));
    });
  }

  async function clickChoice(isoValue) {
    return page.evaluate((targetIso) => {
      function iso(year, month, day) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      const nodes = Array.from(document.querySelectorAll('[role="checkbox"]'));
      const node = nodes.find((item) => {
        const label = item.getAttribute("aria-label") || "";
        const match = label.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
        if (!match) return false;
        return iso(Number(match[1]), Number(match[2]), Number(match[3])) === targetIso;
      });
      if (!node) return false;
      node.click();
      return true;
    }, isoValue);
  }

  async function clickNextMonth() {
    return page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('[aria-label="轉到下一個月"]')).find((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
      if (!button || String(button.className || "").includes("is-disable")) return false;
      button.click();
      return true;
    });
  }

  const targetWeekday = date ? new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() : null;
  let latestChoices = [];

  if (date) {
    for (let attempt = 0; attempt < 7; attempt += 1) {
      latestChoices = await readChoices();
      const exact = latestChoices.find((item) => item.iso === date.iso);
      if (exact) {
        if (!exact.selectable) throw new Error(`date not selectable: ${exact.label}`);
        await clickChoice(exact.iso);
        await page.waitForTimeout(1500);
        return { requestedIso: date.iso, selectedIso: exact.iso, usedReferenceDate: false, reason: null, label: exact.label };
      }

      const maxVisible = latestChoices[latestChoices.length - 1]?.iso;
      if (!maxVisible || maxVisible >= date.iso) break;
      const moved = await clickNextMonth();
      if (!moved) break;
      await page.waitForTimeout(900);
    }

    latestChoices = latestChoices.length ? latestChoices : await readChoices();
    const selectable = latestChoices.filter((item) => item.selectable && item.iso < date.iso);
    const sameWeekday = selectable.filter((item) => item.weekday === targetWeekday);
    const fallback = sameWeekday[sameWeekday.length - 1] || selectable[selectable.length - 1];
    if (!fallback) throw new Error(`date not found and no reference date available: ${date.iso}`);
    await clickChoice(fallback.iso);
    await page.waitForTimeout(1500);
    return { requestedIso: date.iso, selectedIso: fallback.iso, usedReferenceDate: true, reason: "target_date_not_visible", label: fallback.label };
  }

  if (!referenceDateRequest) throw new Error("date not provided");
  latestChoices = await readChoices();
  const selectable = latestChoices.filter((item) => item.selectable);
  const saturday = selectable.find((item) => item.weekday === 6);
  const fallback = saturday || selectable[0];
  if (!fallback) throw new Error("no selectable reference date available");
  await clickChoice(fallback.iso);
  await page.waitForTimeout(1500);
  return { requestedIso: null, selectedIso: fallback.iso, usedReferenceDate: true, reason: referenceDateRequest.reason || "released_inventory_reference_date", label: fallback.label };
}
async function selectTripTime(page, time) {
  if (time.hour == null || time.minute == null) return null;
  const timePicker = page.locator('div[class*="DatePicker_time"]').first();
  const hourText = String(time.hour).padStart(2, "0");
  const minuteText = String(time.minute).padStart(2, "0");

  await timePicker.click({ force: true });
  await page.waitForTimeout(800);
  await page.locator('li[role="button"]').filter({ hasText: new RegExp(`^${hourText}$`) }).first().click({ force: true });
  await page.waitForTimeout(800);

  await timePicker.click({ force: true });
  await page.waitForTimeout(800);
  await page.locator('li[role="button"]').filter({ hasText: new RegExp(`^${minuteText}$`) }).last().click({ force: true });
  await page.waitForTimeout(1000);

  return await timePicker.locator('div[class*="DatePicker_input"]').first().innerText().catch(() => time.resolved);
}

async function selectTripTrainTransport(page) {
  const selection = await page.evaluate(() => {
    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }

    const trainText = /^(火車|火车|Train)$/i;
    const candidates = Array.from(document.querySelectorAll('button, div[role="button"], [role="tab"], [aria-label], div, span'))
      .filter((element) => visible(element))
      .map((element) => ({
        element,
        text: (element.innerText || element.textContent || "").replace(/\s+/g, "").trim(),
        rect: element.getBoundingClientRect(),
      }))
      .filter((item) => trainText.test(item.text));

    if (!candidates.length) {
      const nearbyText = Array.from(document.querySelectorAll("body *"))
        .filter((element) => visible(element))
        .map((element) => (element.innerText || element.textContent || "").replace(/\s+/g, "").trim())
        .filter((text) => text.length <= 40 && trainText.test(text))
        .slice(0, 8);
      return { clicked: false, skipped: true, reason: "train_control_not_exposed", nearbyText };
    }
    candidates.sort((a, b) => (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height));
    const source = candidates[0];
    let target = source.element;
    for (let level = 0; level < 4 && target; level += 1, target = target.parentElement) {
      const role = target.getAttribute("role");
      if (target.matches("button, [role=button], [role=tab]") || role === "button" || role === "tab" || window.getComputedStyle(target).cursor === "pointer") break;
    }
    target = target || source.element;
    target.scrollIntoView({ block: "center", inline: "center" });
    target.click();
    return { clicked: true, text: source.text };
  });

  if (selection.clicked) await page.waitForTimeout(1200);
  return selection;
}


const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const PRICE_RE = /^(HK\$|USD\s?)([\d,]+(?:\.\d+)?)/;
const TRAIN_MARKERS = new Set(["新幹線", "Shinkansen"]);
const TRAIN_TAGS = new Set(["最快", "剩餘票數有限", "QR code 乘車", "可更改", "可退款"]);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function lineLooksUseful(line) {
  if (!line) return false;
  if (/^[^\w\u4e00-\u9fff$]+$/u.test(line)) return false;
  if (["較", "早", "晚", "的", "列", "車", "總額", "繼續", "--"].includes(line)) return false;
  return true;
}

function normalisePageLines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(lineLooksUseful);
}

function minutesFromTime(value) {
  const match = String(value || "").match(TIME_RE);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function targetMinutesFromRequest(time) {
  if (!time || time.hour == null || time.minute == null) return null;
  return Number(time.hour) * 60 + Number(time.minute);
}

function parseTripcomTrainsFromText(text, timeFilter) {
  const lines = normalisePageLines(text);
  const trains = [];
  const targetMinutes = targetMinutesFromRequest(timeFilter);

  for (let i = 0; i < lines.length; i += 1) {
    if (!TRAIN_MARKERS.has(lines[i])) continue;

    const departureIndex = lines.findIndex((line, index) => index > i && index <= i + 12 && TIME_RE.test(line));
    if (departureIndex < 0) continue;

    const nameParts = lines.slice(i + 1, departureIndex).filter((line) => !TRAIN_TAGS.has(line));
    const tagParts = lines.slice(i + 1, departureIndex).filter((line) => TRAIN_TAGS.has(line));
    const trainName = nameParts[0] || "未命名車次";
    const departureTime = lines[departureIndex];
    const departureMinutes = minutesFromTime(departureTime);
    const departureStation = lines[departureIndex + 1] || "";

    const arrivalIndex = lines.findIndex((line, index) => index > departureIndex + 1 && index <= departureIndex + 8 && TIME_RE.test(line));
    if (arrivalIndex < 0) continue;

    const arrivalTime = lines[arrivalIndex];
    const arrivalStation = lines[arrivalIndex + 1] || "";
    const duration = lines.slice(arrivalIndex + 2, arrivalIndex + 6).find((line) => /小時|分|直航|轉乘/.test(line)) || "";
    const price = lines.slice(arrivalIndex + 2, arrivalIndex + 14).find((line) => PRICE_RE.test(line)) || "";
    const postTags = lines.slice(arrivalIndex + 2, arrivalIndex + 14).filter((line) => TRAIN_TAGS.has(line));

    if (!price) continue;
    if (targetMinutes != null && departureMinutes != null && departureMinutes < targetMinutes) continue;

    const fingerprint = `${trainName}|${departureTime}|${arrivalTime}|${price}`;
    if (trains.some((train) => train.fingerprint === fingerprint)) continue;

    trains.push({
      trainType: lines[i],
      trainName,
      departureTime,
      departureMinutes,
      departureStation,
      arrivalTime,
      arrivalStation,
      duration,
      price,
      seatPrices: [{ category: "Trip.com 公开列表显示价格（坐席类别未暴露）", price, source: "public_result_list" }],
      priceNote: "Trip.com 公开结果列表只暴露一个价格，未在当前安全边界内展示多坐席类别。",
      tags: Array.from(new Set([...tagParts, ...postTags])),
      fingerprint,
    });
  }

  trains.sort((a, b) => (a.departureMinutes ?? 9999) - (b.departureMinutes ?? 9999));
  return trains;
}

async function clickLaterTrains(page) {
  const clicked = await page.evaluate(() => {
    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }

    const candidates = Array.from(document.querySelectorAll('div, button, [role="button"]'))
      .filter((element) => visible(element))
      .map((element) => ({ element, text: (element.innerText || "").replace(/\s+/g, "") }))
      .filter((item) => item.text.includes("較晚的列車"));

    if (!candidates.length) return false;
    candidates.sort((a, b) => {
      const ar = a.element.getBoundingClientRect();
      const br = b.element.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    });

    const leaf = candidates[0].element;
    const clickable = leaf.closest('div[class*="rounded"]') || leaf.closest('[role="button"]') || leaf.parentElement || leaf;
    clickable.scrollIntoView({ block: "center", inline: "center" });
    clickable.click();
    return true;
  });

  if (!clicked) return false;
  await page.waitForTimeout(3500);
  return true;
}

async function extractMatchingTrains(page, request, options) {
  const targetMinutes = targetMinutesFromRequest(request.time);
  let allTrains = [];
  let filteredTrains = [];
  let laterClicks = 0;
  let latestVisibleMinutes = null;
  let publicResultState = "public_train_cards_not_found";

  for (let attempt = 0; attempt <= options.maxLaterClicks; attempt += 1) {
    const pageText = await page.evaluate(() => document.body.innerText);
    publicResultState = /未選擇去程|未选择去程/.test(pageText)
      ? "public_page_did_not_render_outbound"
      : "public_train_cards_not_found";
    allTrains = parseTripcomTrainsFromText(pageText, null);
    filteredTrains = parseTripcomTrainsFromText(pageText, request.time);
    latestVisibleMinutes = allTrains.reduce((max, train) => Math.max(max, train.departureMinutes ?? -1), -1);

    if (filteredTrains.length > 0) break;
    if (targetMinutes == null) break;
    const moved = await clickLaterTrains(page);
    if (!moved) break;
    laterClicks += 1;
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  }

  return {
    filter: request.time?.resolved || null,
    laterClicks,
    visibleTrainCount: allTrains.length,
    matchingTrainCount: filteredTrains.length,
    publicResultState,
    trains: filteredTrains.slice(0, options.maxTrains).map(({ fingerprint, ...train }) => train),
  };
}

function renderHtmlReport(result) {
  const trains = result.trains?.trains || [];
  const dateText = result.referenceDate?.usedReferenceDate ? `${result.request.date?.iso || "未指定"}（参考：${result.referenceDate.selectedIso}）` : (result.request.date?.iso || result.referenceDate?.selectedIso || "未指定");
  const referenceNote = result.referenceDate?.usedReferenceDate
    ? `目标日期${result.referenceDate.requestedIso || "未指定"}未直接作为真实票价展示，本次使用 ${result.referenceDate.selectedIso} 作为参考日期，原因：${result.referenceDate.reason || "已释放库存参考"}。`
    : `目标日期 ${result.request.date?.iso || result.referenceDate?.selectedIso || "未指定"} 已按公开页面尝试查询。`;
  const emptyMessage = result.trains?.publicResultState === "public_page_did_not_render_outbound"
    ? "Trip.com 已接收查询条件，但公开结果页未渲染去程车次卡片或价格；本次未展示估价、历史价格或不可订车次。"
    : "没有抓取到符合条件的可购买车次，或公开页面没有暴露可合规读取的价格。";
  const rows = trains.map((train, index) => {
    const seatRows = (train.seatPrices || [{ category: "页面显示价格", price: train.price }]).map((seat) => `
              <li><span>${escapeHtml(seat.category)}</span><strong>${escapeHtml(seat.price)}</strong></li>`).join("");
    return `
        <article class="train-card">
          <div class="train-head">
            <div class="idx">${index + 1}</div>
            <div><div class="type">${escapeHtml(train.trainType)}</div><h3>${escapeHtml(train.trainName)}</h3>${train.tags?.length ? `<div class="tags">${escapeHtml(train.tags.join(" / "))}</div>` : ""}</div>
          </div>
          <div class="journey">
            <div><span class="label">出发</span><strong>${escapeHtml(train.departureTime)}</strong><span>${escapeHtml(train.departureStation)}</span></div>
            <div><span class="label">到达</span><strong>${escapeHtml(train.arrivalTime)}</strong><span>${escapeHtml(train.arrivalStation)}</span></div>
            <div><span class="label">时长</span><strong>${escapeHtml(train.duration || "-")}</strong><span>以页面展示为准</span></div>
          </div>
          <div class="seat-box">
            <div class="label">坐席价格</div>
            <ul>${seatRows}</ul>
            ${train.priceNote ? `<p>${escapeHtml(train.priceNote)}</p>` : ""}
          </div>
        </article>`;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>新干线车票价格查询结果</title>
  <style>
    body { margin: 0; font-family: Arial, "Microsoft YaHei", "Microsoft JhengHei", sans-serif; color: #1f2937; background: #f6f7f9; }
    main { max-width: 1120px; margin: 0 auto; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 26px; color: #0f172a; }
    h2 { margin: 24px 0 12px; font-size: 18px; color: #0f172a; }
    .meta { color: #64748b; font-size: 13px; }
    .summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
    .field, .notice, .train-card { background: #fff; border: 1px solid #d8dee8; border-radius: 6px; }
    .field { padding: 12px; }
    .label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 700; color: #0f172a; }
    .notice { padding: 12px; margin-top: 14px; color: #475569; line-height: 1.6; }
    .result-list { display: grid; gap: 12px; }
    .train-card { padding: 16px; }
    .train-head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    .idx { width: 30px; height: 30px; border-radius: 999px; background: #0f766e; color: #fff; display: grid; place-items: center; font-weight: 700; flex: 0 0 auto; }
    .type { color: #64748b; font-size: 13px; }
    h3 { margin: 2px 0 0; font-size: 18px; color: #0f172a; }
    .tags { margin-top: 4px; color: #475569; font-size: 12px; }
    .journey { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 12px 0; }
    .journey > div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
    .journey strong { display: block; font-size: 18px; color: #0f172a; margin-bottom: 2px; }
    .journey span:last-child { color: #475569; font-size: 13px; }
    .seat-box { border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .seat-box ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .seat-box li { display: flex; justify-content: space-between; gap: 12px; padding: 9px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
    .seat-box li span { color: #334155; }
    .seat-box li strong { color: #0f172a; white-space: nowrap; }
    .seat-box p { margin: 8px 0 0; color: #64748b; font-size: 12px; }
    .empty { background: #fff; border: 1px solid #d8dee8; border-radius: 6px; padding: 18px; color: #475569; }
    @media (max-width: 820px) { main { padding: 16px; } .summary, .journey { grid-template-columns: 1fr; } .seat-box li { display: block; } .seat-box li strong { display: block; margin-top: 4px; } }
  </style>
</head>
<body>
  <main>
    <h1>新干线车票价格查询结果</h1>
    <div class="meta">正式展示不依赖换算或估价；价格只来自公开页面当次可见文本。</div>

    <h2>需求识别</h2>
    <section class="summary">
      <div class="field"><span class="label">日期</span><div class="value">${escapeHtml(dateText)}</div></div>
      <div class="field"><span class="label">出发地</span><div class="value">${escapeHtml(result.selected.origin || result.request.origin?.canonical || "-")}</div></div>
      <div class="field"><span class="label">目的地</span><div class="value">${escapeHtml(result.selected.destination || result.request.destination?.canonical || "-")}</div></div>
      <div class="field"><span class="label">期望时间</span><div class="value">${escapeHtml(result.trains.filter || result.request.time?.resolved || "无特别要求")}</div></div>
      <div class="field"><span class="label">乘客人数</span><div class="value">${escapeHtml(result.request.passengers.raw || "未填")}</div></div>
    </section>

    <h2>查询结果</h2>
    <section class="result-list">${rows || `<div class="empty">${escapeHtml(emptyMessage)}</div>`}</section>

    <h2>说明</h2>
    <div class="notice">${escapeHtml(referenceNote)} 本次查询已确认 USD 优先；没有进入登录、锁票、下单、乘客信息或支付流程。过程记录保留在 JSON 中，正式展示不突出来源网站和查询时间。</div>
    <div class="notice">Trip.com URL：${escapeHtml(result.selected.url)}</div>
  </main>
</body>
</html>`;
}
async function ensureTripCurrency(page) {
  async function readVisibleCurrency() {
    return page.evaluate(() => {
      function visible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      }

      const nodes = Array.from(document.querySelectorAll('button, div[role="button"], [aria-label], [class*="currency" i], [class*="Currency"]'));
      const candidates = nodes
        .filter((node) => visible(node))
        .map((node) => ({ text: (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim(), aria: node.getAttribute("aria-label") || "" }))
        .filter((item) => /\b(USD|HKD|JPY|CNY|TWD|SGD|EUR|GBP)\b/.test(`${item.text} ${item.aria}`));

      const direct = candidates.find((item) => /\bUSD\b/.test(item.text)) || candidates[0];
      return direct ? direct.text || direct.aria : "";
    });
  }

  async function clickCurrencyControl() {
    return page.evaluate(() => {
      function visible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      }

      const candidates = Array.from(document.querySelectorAll('button, div[role="button"], [aria-label], [class*="currency" i], [class*="Currency"]'))
        .filter((element) => visible(element))
        .map((element) => ({
          element,
          text: (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim(),
          aria: element.getAttribute("aria-label") || "",
          rect: element.getBoundingClientRect(),
        }))
        .filter((item) => /\b(USD|HKD|JPY|CNY|TWD|SGD|EUR|GBP)\b|Currency|currency|貨幣|币种|幣種/.test(`${item.text} ${item.aria}`));

      if (!candidates.length) return false;
      candidates.sort((a, b) => (b.rect.top - a.rect.top) || (b.rect.left - a.rect.left));
      candidates[0].element.click();
      return true;
    });
  }

  async function clickCurrencyOption(currency) {
    return page.evaluate((targetCurrency) => {
      function visible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      }

      const options = Array.from(document.querySelectorAll('button, li, div[role="button"], [role="option"], span, div'))
        .filter((element) => visible(element))
        .map((element) => ({ element, text: (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim(), rect: element.getBoundingClientRect() }))
        .filter((item) => new RegExp(`\\b${targetCurrency}\\b`).test(item.text));

      if (!options.length) return false;
      options.sort((a, b) => (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height));
      const target = options[0].element.closest('button, li, div[role="button"], [role="option"]') || options[0].element;
      target.click();
      return true;
    });
  }

  for (const currency of ["USD", "HKD"]) {
    let currencyText = await readVisibleCurrency();
    if (new RegExp(`\\b${currency}\\b`).test(currencyText)) {
      return { value: currency, visibleText: currencyText, method: "already_visible" };
    }

    const controlClicked = await clickCurrencyControl();
    if (controlClicked) {
      await page.waitForTimeout(1000);
      const optionClicked = await clickCurrencyOption(currency);
      if (optionClicked) await page.waitForTimeout(2000);
    }

    currencyText = await readVisibleCurrency();
    if (new RegExp(`\\b${currency}\\b`).test(currencyText)) {
      return { value: currency, visibleText: currencyText, method: controlClicked ? "selected_from_selector" : "visible_after_load" };
    }
  }

  throw new Error("Trip.com did not expose a USD or HKD currency option before search.");
}
async function snapshot(page) {
  return page.evaluate(() => ({
    url: location.href,
    origin: document.querySelector('input[placeholder="出發車站"]')?.value || null,
    destination: document.querySelector('input[placeholder="到達車站"]')?.value || null,
    currency: (Array.from(document.querySelectorAll("[aria-label*=\"貨幣\"], div[role=\"button\"]")).map((node) => (node.innerText || "").trim()).find((text) => /\\bUSD\\b|\\bHKD\\b/.test(text)) || null),
    pageTextSample: document.body.innerText.slice(0, 3000),
  }));
}

async function main() {
  const args = parseArgs(process.argv);
  const request = extractRequest(args.text);
  if (args.extractOnly) {
    const payload = { request };
    console.log(JSON.stringify(payload, null, 2));
    if (args.output) {
      fs.mkdirSync(path.dirname(args.output), { recursive: true });
      fs.writeFileSync(args.output, JSON.stringify(payload, null, 2), "utf8");
    }
    return;
  }
  if (request.missingFields.length) {
    throw new Error(`missing required fields: ${request.missingFields.join(", ")}`);
  }

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: !args.headed });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 }, locale: "zh-HK" });
  const result = { request, steps: [], selected: null, searched: false, currency: null, referenceDate: null, trains: null, htmlOutput: args.htmlOutput || null };

  try {
    await page.goto(START_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);
    result.steps.push({ action: "open_start_url", ok: true, url: START_URL });

    result.currency = await ensureTripCurrency(page);
    result.steps.push({ action: "ensure_currency_usd_then_hkd", ok: true, value: result.currency.value, visibleText: result.currency.visibleText, method: result.currency.method });
    const destination = await selectTripCity(page, "到達車站", request.destination);
    result.steps.push({ action: "select_destination", ok: true, ...destination });

    const origin = await selectTripCity(page, "出發車站", request.origin);
    result.steps.push({ action: "select_origin", ok: true, ...origin });

    result.referenceDate = await selectTripDate(page, request.date, request.referenceDateRequest);
    result.steps.push({ action: "select_date", ok: true, value: result.referenceDate.selectedIso, requested: result.referenceDate.requestedIso, usedReferenceDate: result.referenceDate.usedReferenceDate, reason: result.referenceDate.reason });

    const selectedTime = await selectTripTime(page, request.time);
    result.steps.push({ action: "select_time", ok: true, value: selectedTime || request.time.resolved });

    const transport = await selectTripTrainTransport(page);
    result.steps.push({ action: "select_train_transport", ok: true, ...transport });

    if (args.search) {
      await page.locator('div[role="button"]').filter({ hasText: /搜尋/ }).first().click({ force: true });
      await page.waitForTimeout(args.maxWaitMs);
      result.searched = true;
      result.steps.push({ action: "click_search", ok: true });
    }

    result.trains = await extractMatchingTrains(page, request, args);
    result.steps.push({ action: "extract_and_filter_trains", ok: true, filter: result.trains.filter, matchingTrainCount: result.trains.matchingTrainCount, laterClicks: result.trains.laterClicks });

    result.selected = await snapshot(page);
    if (args.htmlOutput) {
      fs.mkdirSync(path.dirname(args.htmlOutput), { recursive: true });
      fs.writeFileSync(args.htmlOutput, renderHtmlReport(result), "utf8");
    }

    console.log(JSON.stringify(result, null, 2));
    if (args.output) {
      fs.mkdirSync(path.dirname(args.output), { recursive: true });
      fs.writeFileSync(args.output, JSON.stringify(result, null, 2), "utf8");
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

module.exports = {
  extractRequest,
  renderHtmlReport,
};
