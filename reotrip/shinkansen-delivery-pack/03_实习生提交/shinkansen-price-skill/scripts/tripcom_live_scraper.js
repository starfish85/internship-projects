const path = require('path');

const PLAYWRIGHT_ENTRY =
  process.env.PLAYWRIGHT_ENTRY ||
  'C:/Users/starfish/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js';
const EDGE_PATH =
  process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const { chromium } = require(PLAYWRIGHT_ENTRY);

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function argFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function parseIntArg(name, fallback) {
  const value = argValue(name);
  if (value == null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function seatOptionsFromPanelText(text) {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const options = [];
  let current = null;
  for (const line of lines) {
    if (/^(選擇座位等級|选择座位等级)/.test(line)) {
      current = null;
      continue;
    }
    const priceMatch = line.match(/^(.+?)\s+(USD|HKD)\s?(\d+(?:\.\d+)?)$/);
    if (priceMatch) {
      options.push({
        label: priceMatch[1].trim(),
        price: `${priceMatch[2]}${priceMatch[3]}`,
        notes: [],
      });
      current = options[options.length - 1];
      continue;
    }
    if (/^(普通車廂|綠色車廂|非指定座位|自由席|指定席|普通车厢|绿色车厢)/.test(line)) {
      const option = { label: line, price: null, notes: [] };
      options.push(option);
      current = option;
      continue;
    }
    if (current) {
      current.notes.push(line);
    }
  }
  return options;
}

function summaryFromSolution(solution, extra = {}) {
  const trainName =
    solution?.solutionLiveInfo?.trainIdList?.[0] ||
    solution?.transports?.[0]?.name ||
    solution?.transports?.[0]?.carrier?.fullName ||
    '未知车次';
  const cheapest = solution?.cheapestFarePackage?.displayPrice?.displayPrice || null;
  const origin = solution?.departureLocation?.name || null;
  const destination = solution?.arrivalLocation?.name || null;
  const departureTime = solution?.departureDateTime ? solution.departureDateTime.slice(11, 16) : null;
  const arrivalTime = solution?.arrivalDateTime ? solution.arrivalDateTime.slice(11, 16) : null;
  const duration = solution?.duration || null;
  const tags = Array.isArray(solution?.bottomTags) ? solution.bottomTags.map((tag) => tag.content || tag.type).filter(Boolean) : [];
  return {
    title: trainName,
    departure_time: departureTime,
    arrival_time: arrivalTime,
    departure_station: origin,
    arrival_station: destination,
    duration,
    price: cheapest,
    seat_options: extra.seat_options || [],
    live_status: solution?.solutionLiveInfo?.journeyLiveStatusName || null,
    ticket_remaining: solution?.cheapestFarePackage?.ticketRemaining ?? null,
    bottom_tags: tags,
    order_source: solution?.orderSource || [],
    raw_summary: {
      trainId: trainName,
      departureDateTime: solution?.departureDateTime || null,
      arrivalDateTime: solution?.arrivalDateTime || null,
      changeInfo: solution?.changeInfo || null,
      duration: solution?.duration || null,
      cheapestFarePackage: solution?.cheapestFarePackage || null,
    },
  };
}

async function clickLikelySearch(page) {
  const candidates = [
    'div.SearchBtn_container__uAEjs',
    '[aria-label="搜尋"]',
    '[aria-label="搜索"]',
    'text=搜尋',
    'text=搜索',
  ];
  for (const selector of candidates) {
    const locator = page.locator(selector).first();
    try {
      if ((await locator.count()) > 0) {
        await locator.click({ force: true });
        return true;
      }
    } catch (err) {
      // ignore and try next selector
    }
  }
  return false;
}

async function findAndClickSolution(page, trainName) {
  if (!trainName) return false;
  const escaped = trainName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const strategies = [
    () => page.getByRole('button').filter({ hasText: trainName }).first(),
    () => page.locator('div[role="button"]').filter({ hasText: trainName }).first(),
    () => page.locator(`div[role="button"]:has-text("${trainName}")`).first(),
    () => page.locator('*').filter({ hasText: trainName }).first(),
    () => page.getByText(new RegExp(escaped)).first(),
  ];

  for (const getLocator of strategies) {
    try {
      const locator = getLocator();
      if ((await locator.count()) === 0) continue;
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click({ force: true });
      return true;
    } catch (err) {
      // try next strategy
    }
  }

  const clicked = await page.evaluate((name) => {
    const nodes = Array.from(document.querySelectorAll('button, [role="button"], div, a'));
    const target = nodes.find((node) => {
      const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      return text.includes(name);
    });
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  }, trainName);
  return clicked;
}

async function main() {
  const url = argValue('url');
  if (!url) {
    throw new Error('missing --url');
  }
  const maxResults = parseIntArg('max-results', 5);
  const currency = argValue('currency', 'USD');
  const preferredTime = argValue('preferred-time', null);
  const headed = argFlag('headed');

  const browser = await chromium.launch({
    headless: !headed,
    executablePath: EDGE_PATH,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
  page.setDefaultTimeout(30000);

  const responses = [];
  page.on('response', async (res) => {
    if (res.url().includes('/restapi/soa2/')) {
      responses.push({ url: res.url(), status: res.status() });
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  const searchResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/restapi/soa2/36637/json/searchListForWeb') && res.status() === 200,
    { timeout: 60000 }
  );
  await clickLikelySearch(page);

  const searchResponse = await searchResponsePromise;
  const searchJson = await searchResponse.json();
  const solutionList = Array.isArray(searchJson?.data?.solutionList) ? searchJson.data.solutionList : [];

  const results = [];
  for (const solution of solutionList.slice(0, maxResults)) {
    const trainName =
      solution?.solutionLiveInfo?.trainIdList?.[0] ||
      solution?.transports?.[0]?.name ||
      '';

    let seatOptions = [];
    let detailPanelText = '';
    if (trainName) {
      await findAndClickSolution(page, trainName);
      await page.waitForTimeout(2500);
      detailPanelText = await page.locator('body').innerText().catch(() => '');
      const panelIndex = Math.max(
        detailPanelText.indexOf('選擇座位等級'),
        detailPanelText.indexOf('选择座位等级'),
      );
      if (panelIndex >= 0) {
        const panelText = detailPanelText.slice(panelIndex, panelIndex + 4000);
        seatOptions = seatOptionsFromPanelText(panelText);
      }
    }

    if (!seatOptions.length && solution?.cheapestFarePackage?.displayPrice?.displayPrice) {
      seatOptions = [
        {
          label: '最低可售價格',
          price: solution.cheapestFarePackage.displayPrice.displayPrice,
          notes: ['僅從公開搜尋結果取得最低可售價，未展開到更細座席面板。'],
        },
      ];
    }

    results.push({
      ...summaryFromSolution(solution, { seat_options: seatOptions }),
      detail_panel_found: seatOptions.some((item) => item.label !== '最低可售價格'),
      detail_panel_text: detailPanelText ? detailPanelText.slice(0, 4000) : null,
    });
  }

  const output = {
    currency,
    preferredTime,
    responseSummary: {
      searchResponseStatus: searchResponse.status(),
      resultCount: solutionList.length,
      responses,
    },
    results,
  };

  process.stdout.write(JSON.stringify(output, null, 2));
  await browser.close();
}

main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exit(1);
});
