const requirementText = document.getElementById("requirementText");
const requirementImage = document.getElementById("requirementImage");
const imagePreview = document.getElementById("imagePreview");
const clearImage = document.getElementById("clearImage");
const extractFields = document.getElementById("extractFields");
const saveRequirement = document.getElementById("saveRequirement");
const exportDetails = document.getElementById("exportDetails");
const reloadExtension = document.getElementById("reloadExtension");
const status = document.getElementById("status");
const originField = document.getElementById("originField");
const destinationField = document.getElementById("destinationField");
const departureDateField = document.getElementById("departureDateField");
const departureDateNoteField = document.getElementById("departureDateNoteField");
const departureTimeField = document.getElementById("departureTimeField");
const departureTimeNoteField = document.getElementById("departureTimeNoteField");
const adultCountField = document.getElementById("adultCountField");
const childCountField = document.getElementById("childCountField");
const passengerNoteField = document.getElementById("passengerNoteField");
const recognizedText = document.getElementById("recognizedText");

let imageDataUrl = "";
let selectedImageFile = null;
let ocrWorkerPromise = null;
let latestTrainDetails = [];
let parsedState = {
  origin: "",
  destination: "",
  departureDate: "",
  departureDateNote: "",
  departureTime: "",
  departureTimeNote: "",
  adultCount: "",
  childCount: "",
  passengerNote: "",
  recognizedText: "",
};

const TESSERACT_WORKER_URL = new URL("vendor/worker.min.js", location.href).toString();
const TESSERACT_CORE_URL = new URL("vendor/tesseract/core", location.href).toString();
const TESSERACT_LANG_URL = new URL("vendor/tesseract/lang", location.href).toString();

function getStorage() {
  return globalThis.chrome?.storage?.local || null;
}

function setStatus(message) {
  status.textContent = message;
}

async function applyToCurrentPage(parsedState) {
  const tabsApi = globalThis.chrome?.tabs;
  const scriptingApi = globalThis.chrome?.scripting;
  if (!tabsApi?.query || !tabsApi?.sendMessage) return { ok: false, reason: "tabs api unavailable" };

  const [tab] = await tabsApi.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, reason: "active tab not found" };

  const sendPayload = () => new Promise((resolve) => {
    tabsApi.sendMessage(
      tab.id,
      { type: "apply-shinkansen-fields", parsedState },
      (response) => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) {
          resolve({ ok: false, reason: error.message });
          return;
        }
        resolve(response || { ok: false, reason: "no response" });
      }
    );
  });

  let response = await sendPayload();
  if (response.ok || !scriptingApi?.executeScript) return response;

  if (/receiving end does not exist|could not establish connection/i.test(response.reason || "")) {
    try {
      await scriptingApi.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      response = await sendPayload();
      return response;
    } catch (error) {
      return { ok: false, reason: error?.message || String(error) };
    }
  }

  return response;
}

async function getTrainDetailsFromCurrentPage() {
  const tabsApi = globalThis.chrome?.tabs;
  if (!tabsApi?.query || !tabsApi?.sendMessage) return { ok: false, reason: "tabs api unavailable" };
  const [tab] = await tabsApi.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, reason: "active tab not found" };

  return new Promise((resolve) => {
    tabsApi.sendMessage(
      tab.id,
      { type: "get-shinkansen-train-details", departureTime: parsedState.departureTime || "全天", destination: parsedState.destination || "" },
      (response) => {
        const error = globalThis.chrome?.runtime?.lastError;
        resolve(error ? { ok: false, reason: error.message } : response || { ok: false, reason: "no response" });
      }
    );
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTrainDetailsHtml(details) {
  const route = `${parsedState.origin || ""} - ${parsedState.destination || ""}`.trim();
  const passengerText = [
    parsedState.adultCount ? `Adults: ${parsedState.adultCount}` : "",
    parsedState.childCount ? `Children: ${parsedState.childCount}` : "",
  ].filter(Boolean).join(" | ");
  const allPrices = details.flatMap((train) => (train.seats || []).map((seat) => seat.price || ""));
  const hasPreferredCurrency = allPrices.some((price) => /(?:USD|HKD|US\$|HK\$)/i.test(price));
  const hasOtherCurrency = allPrices.some((price) => /(?:¥|￥|CNY|RMB)/i.test(price));
  const currencyNote = hasOtherCurrency && !hasPreferredCurrency
    ? "USD/HKD was not displayed by the source page; no currency conversion was performed."
    : "Prices are copied from the source page without conversion.";
  const cards = details.map((train) => {
    const seats = (train.seats || []).map((seat) => {
      const detailLines = [...new Set([
        ...(seat.availability || []),
        ...(seat.features || []),
      ].filter(Boolean))];
      const detailHtml = detailLines.length
        ? detailLines.map((line) => escapeHtml(line)).join("<br>")
        : "Source page did not provide additional seat notes.";
      return `
      <tr><td><strong>${escapeHtml(seat.name)}</strong></td><td class="price">${escapeHtml(seat.price)}</td><td>${detailHtml}</td></tr>`;
    }).join("");
    return `
      <section class="train">
        <header>
          <h2>${escapeHtml(train.departureTime)} ${escapeHtml(train.departureStation)} -> ${escapeHtml(train.arrivalTime)} ${escapeHtml(train.arrivalStation)}</h2>
          <p>${escapeHtml(train.trainName || train.trainNumber || "Shinkansen")}</p>
        </header>
        ${seats ? `<table><thead><tr><th>Ticket / seat category</th><th>Displayed price</th><th>Travel-critical details</th></tr></thead><tbody>${seats}</tbody></table>` : "<p>No purchasable seat price was found.</p>"}
      </section>`;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shinkansen Price Results</title><style>
body{margin:0;padding:28px;background:#f5f7fb;color:#172033;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1100px;margin:auto}h1{margin:0 0 6px}.meta{color:#5d687d;margin:0 0 8px}.note{color:#8a4b08;margin:0 0 20px}
.train{margin:0 0 18px;padding:20px;background:#fff;border:1px solid #d8dfeb;border-radius:10px}
.train header{border-bottom:1px solid #e2e8f3;padding-bottom:12px}.train h2{margin:0 0 5px;font-size:21px}.train header p{margin:0;color:#5d687d}
table{width:100%;border-collapse:collapse;margin-top:14px}th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid #e2e8f3}th{color:#5d687d;font-weight:600}.price{font-weight:700;color:#ef5b12}
</style></head><body><main><h1>Shinkansen Price Results</h1><p class="meta">Route: ${escapeHtml(route)} | Date: ${escapeHtml(parsedState.departureDate)} | Requested time: ${escapeHtml(parsedState.departureTime)}${passengerText ? ` | ${escapeHtml(passengerText)}` : ""}</p><p class="note">${escapeHtml(currencyNote)}</p>${cards || "<p>No matching train details found.</p>"}</main></body></html>`;
}

function downloadTrainDetailsHtml(details) {
  const html = buildTrainDetailsHtml(details);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = (parsedState.departureDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
  link.href = url;
  link.download = `shinkansen-results-${date || "export"}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toHalfWidth(text) {
  return text
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, " ");
}

function normalizeText(text) {
  return toHalfWidth(String(text || ""))
    .replace(/\r/g, "\n")
    .replace(/[、，]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/[。]/g, ".")
    .replace(/[—–~～]/g, "-")
    .replace(/[【】]/g, " ")
    .replace(/[|]/g, " ")
    .replace(/\t+/g, " ")
    .replace(/[ ]+/g, " ");
}

function collapseSpaces(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function nextNonEmptyLine(lines, index) {
  for (let i = index + 1; i < lines.length; i += 1) {
    const value = lines[i].trim();
    if (value) return value;
  }
  return "";
}

function lineAfterLabel(line, labels) {
  const compact = collapseSpaces(line);
  for (const label of labels) {
    const index = compact.toLowerCase().indexOf(label.toLowerCase());
    if (index >= 0) {
      const value = collapseSpaces(compact.slice(index + label.length).replace(/^[:：\-\s]+/, ""));
      if (value) return value;
    }
  }
  return "";
}

function findLabeledValue(lines, labels) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = collapseSpaces(lines[i]);
    if (!line) continue;

    const inlineValue = lineAfterLabel(line, labels);
    if (inlineValue) return inlineValue;

    for (const label of labels) {
      if (line.toLowerCase() === label.toLowerCase()) {
        const nextLine = nextNonEmptyLine(lines, i);
        if (nextLine) return nextLine;
      }
    }
  }
  return "";
}

function findFirstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function extractRouteFromText(text) {
  const routePatterns = [
    /(?:从|由|自)\s*([^\s,，;；。!?]+(?:\s*[^\s,，;；。!?]+)*)\s*(?:去|到|回|返回|前往|往|开往|驶向)\s*([^\s,，;；。!?]+(?:\s*[^\s,，;；。!?]+)*)/i,
    /([^\s,，;；。!?]+(?:\s*[^\s,，;；。!?]+)*)\s*(?:去|到|回|返回|前往|往|开往|驶向)\s*([^\s,，;；。!?]+(?:\s*[^\s,，;；。!?]+)*)/i,
    /([^\s,，;；。!?]+(?:\s*[^\s,，;；。!?]+)*)\s*->\s*([^\s,，;；。!?]+(?:\s*[^\s,，;；。!?]+)*)/i,
  ];

  for (const pattern of routePatterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const origin = collapseSpaces(match[1]);
    const destination = collapseSpaces(match[2]);
    if (!origin || !destination) continue;

    return { origin, destination };
  }

  return { origin: "", destination: "" };
}

function extractPassengerBreakdown(text) {
  const normalized = collapseSpaces(normalizeText(text));
  if (!normalized) {
    return { adultCount: "", childCount: "", passengerNote: "" };
  }

  const adultChildShorthand = normalized.match(/(\d{1,3})\s*大\s*(\d{1,3})\s*小/i);
  if (adultChildShorthand) {
    return {
      adultCount: adultChildShorthand[1],
      childCount: adultChildShorthand[2],
      passengerNote: `${adultChildShorthand[1]} adult(s), ${adultChildShorthand[2]} child(ren)`,
    };
  }

  const adultPatterns = [
    /(\d{1,3})\s*位?\s*(?:成人|大人|成人票|adult|adults)/i,
    /(?:成人|大人|成人票|adult|adults)\s*(\d{1,3})\s*(?:位|人|张|張|票)?/i,
  ];
  const childPatterns = [
    /(\d{1,3})\s*位?\s*(?:儿童|小孩|孩童|小童|儿童票|child|children)/i,
    /(?:儿童|小孩|孩童|小童|儿童票|child|children)\s*(\d{1,3})\s*(?:位|人|张|張|票)?/i,
  ];

  let adultCount = "";
  let childCount = "";

  for (const pattern of adultPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      adultCount = match[1];
      break;
    }
  }

  for (const pattern of childPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      childCount = match[1];
      break;
    }
  }

  const totalOnlyPatterns = [
    /(?:乘客|客人|人数|人數|人数为|人數為|共)\s*[:：]?\s*(\d{1,3})\s*(?:位|人)?/i,
    /(\d{1,3})\s*(?:位|名)?\s*(?:乘客|客人|人|張|张|席)/i,
  ];
  let totalOnly = "";
  if (!adultCount && !childCount) {
    for (const pattern of totalOnlyPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        totalOnly = match[1];
        break;
      }
    }
  }

  if (totalOnly) {
    return {
      adultCount: "",
      childCount: "",
      passengerNote: `${totalOnly} passenger(s), type unspecified`,
    };
  }

  const noteParts = [];
  if (adultCount) noteParts.push(`${adultCount} adult(s)`);
  if (childCount) noteParts.push(`${childCount} child(ren)`);

  return {
    adultCount,
    childCount,
    passengerNote: noteParts.join(", "),
  };
}

function normalizeTimeToken(value) {
  const trimmed = collapseSpaces(value);
  if (!trimmed) return "";
  const timeRange = trimmed.match(/(\d{1,2}:\d{2})\s*[-~至到]\s*(\d{1,2}:\d{2})/);
  if (timeRange) return `${timeRange[1]}-${timeRange[2]}`;
  const oneTime = trimmed.match(/\b(\d{1,2}:\d{2})\b/);
  if (oneTime) return oneTime[1];

  const exactClock = trimmed.match(
    /(?:(上午|早上|清晨|中午|午间|下午|傍晚|晚上|夜间)\s*)?(\d{1,2})\s*(?:[:：点时]\s*(\d{1,2}))?\s*(?:分)?(?:左右|前后)?/i
  );
  if (exactClock) {
    const period = exactClock[1] || "";
    let hour = Number(exactClock[2]);
    const minute = String(exactClock[3] || "00").padStart(2, "0");

    if (/(下午|傍晚|晚上|夜间)/i.test(period) && hour >= 1 && hour <= 11) {
      hour += 12;
    } else if (/(中午|午间)/i.test(period) && hour >= 1 && hour <= 11) {
      hour += 12;
    } else if (/(上午|早上|清晨)/i.test(period) && hour === 12) {
      hour = 0;
    }

    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  const periodOnly = trimmed.match(/(上午|早上|清晨|中午|午间|下午|傍晚|晚上|夜间|morning|noon|afternoon|evening|night)/i);
  if (periodOnly) {
    if (/(上午|早上|清晨|morning)/i.test(periodOnly[1])) return "06:00-11:59";
    if (/(中午|午间|noon)/i.test(periodOnly[1])) return "11:00-13:59";
    if (/(下午|傍晚|afternoon)/i.test(periodOnly[1])) return "12:00-17:59";
    if (/(晚上|夜间|evening|night)/i.test(periodOnly[1])) return "18:00-23:59";
  }

  return trimmed;
}

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function nextSeasonDate(month, day) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let candidate = new Date(today.getFullYear(), month - 1, day);
  if (candidate < startOfToday) {
    candidate = new Date(today.getFullYear() + 1, month - 1, day);
  }
  return formatDate(candidate);
}

function inferDepartureDate(text) {
  const normalized = collapseSpaces(normalizeText(text));
  const dateRules = [
    {
      pattern: /(樱花季|櫻花季|樱花|櫻花|sakura|cherry blossom)/i,
      month: 3,
      day: 30,
      note: "Inferred from cherry blossom season peak",
    },
    {
      pattern: /(红叶季|紅葉季|红叶|紅葉|枫叶|楓葉|秋叶|秋葉|autumn foliage|fall foliage)/i,
      month: 11,
      day: 20,
      note: "Inferred from autumn foliage season peak",
    },
    {
      pattern: /(暑假|暑期|夏休|summer vacation)/i,
      month: 8,
      day: 1,
      note: "Inferred from summer vacation travel period",
    },
    {
      pattern: /(黄金周|黃金週|golden week)/i,
      month: 5,
      day: 3,
      note: "Inferred from Golden Week travel period",
    },
  ];

  for (const rule of dateRules) {
    if (rule.pattern.test(normalized)) {
      return {
        value: nextSeasonDate(rule.month, rule.day),
        note: rule.note,
      };
    }
  }

  return {
    value: nextSeasonDate(1, 15),
    note: "Inferred fallback date; no seasonal keyword found",
  };
}

function extractDepartureTime(text) {
  const normalized = collapseSpaces(normalizeText(text));
  if (!normalized) return "";

  const labeledPatterns = [
    /(?:出发时间|出發時間|departure time|time|发车时间|发車時間|开车时间|開車時間)\s*[:：]?\s*([^\n,，;；。]+)/i,
  ];
  for (const pattern of labeledPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const parsed = normalizeTimeToken(match[1]);
      if (parsed) return parsed;
    }
  }

  const exactPatterns = [
    /(?:上午|早上|清晨|中午|午间|下午|傍晚|晚上|夜间)\s*\d{1,2}\s*(?:[:：点时]\s*\d{1,2})?\s*(?:分)?(?:左右|前后)?/i,
    /\b\d{1,2}:\d{2}\b/,
    /\b\d{1,2}\s*[:：点时]\s*\d{1,2}\s*(?:分)?(?:左右|前后)?/i,
    /\b\d{1,2}\s*点\s*\d{1,2}\s*分?(?:左右|前后)?/i,
    /\b\d{1,2}\s*点(?:左右|前后)?/i,
    /\b\d{1,2}\s*时\s*\d{1,2}\s*分?(?:左右|前后)?/i,
    /\b\d{1,2}\s*时(?:左右|前后)?/i,
  ];
  for (const pattern of exactPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const parsed = normalizeTimeToken(match[0]);
      if (parsed) return parsed;
    }
  }

  const periodOnly = normalized.match(/(上午|早上|清晨|中午|午间|下午|傍晚|晚上|夜间|morning|noon|afternoon|evening|night)/i);
  if (periodOnly) return normalizeTimeToken(periodOnly[1]);

  return "";
}

function inferDepartureTime(text) {
  const normalized = collapseSpaces(normalizeText(text));

  if (/(樱花季|櫻花季|樱花|櫻花|sakura|cherry blossom|红叶季|紅葉季|红叶|紅葉|枫叶|楓葉|autumn foliage|fall foliage)/i.test(normalized)) {
    return {
      value: "08:00-10:59",
      note: "Inferred from seasonal sightseeing keyword",
    };
  }

  if (/(商务|商務|会议|會議|出差|business|meeting)/i.test(normalized)) {
    return {
      value: "07:00-09:59",
      note: "Inferred from business travel keyword",
    };
  }

  if (/(晚上到|下班后|下班後|夜间|夜間|evening|night)/i.test(normalized)) {
    return {
      value: "18:00-23:59",
      note: "Inferred from evening travel keyword",
    };
  }

  return {
    value: "全天",
    note: "No departure time specified; all time ranges selected",
  };
}

function extractFieldsFromText(text) {
  const normalized = normalizeText(text);
  const lines = normalized
    .split("\n")
    .map((line) => collapseSpaces(line))
    .filter(Boolean);
  const compact = collapseSpaces(normalized);

  const routeGuess = extractRouteFromText(compact);

  const origin = findLabeledValue(lines, ["出发地", "出發地", "origin", "from", "departure from", "起点", "起點", "始发站", "始發站", "出发站", "出發站"])
    || routeGuess.origin
    || findFirstMatch(compact, [
      /(?:\bfrom\b|出发地|出發地|起点|起點)\s*[:：]?\s*([^\s,，;；]+(?:\s+[^\s,，;；]+)*)/i,
    ])?.[1]
    || "";

  const destination = findLabeledValue(lines, ["目的地", "destination", "arrive at", "到达地", "到達地", "终点", "終點"])
    || routeGuess.destination
    || findFirstMatch(compact, [
      /(?:\bto\b|目的地|到达地|到達地|终点|終點)\s*[:：]?\s*([^\s,，;；]+(?:\s+[^\s,，;；]+)*)/i,
    ])?.[1]
    || "";

  const dateMatch = findFirstMatch(compact, [
    /(?:出发日期|出發日期|departure date|date)\s*[:：]?\s*(\d{4})\s*[年\/.\-]\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})\s*[日号]?/i,
    /(\d{4})\s*[年\/.\-]\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})\s*[日号]?/,
    /(\d{4}-\d{1,2}-\d{1,2})/,
  ]);
  const monthDayMatch = dateMatch ? null : findFirstMatch(compact, [
    /(?:出发日期|出發日期|departure date|date)\s*[:：]?\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})\s*[日号]?/i,
    /(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/,
  ]);
  const defaultYear = new Date().getFullYear();
  const explicitDepartureDate = dateMatch
    ? (dateMatch[1] && dateMatch[2] && dateMatch[3]
      ? `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, "0")}-${String(dateMatch[3]).padStart(2, "0")}`
      : dateMatch[1])
    : monthDayMatch
      ? `${defaultYear}-${String(monthDayMatch[1]).padStart(2, "0")}-${String(monthDayMatch[2]).padStart(2, "0")}`
      : findLabeledValue(lines, ["出发日期", "出發日期", "departure date", "date"]);
  const inferredDepartureDate = explicitDepartureDate ? null : inferDepartureDate(normalized);
  const departureDate = explicitDepartureDate || inferredDepartureDate.value;
  const departureDateNote = monthDayMatch
    ? `Year omitted; defaulted to current year ${defaultYear}`
    : explicitDepartureDate ? "Explicit from requirement" : inferredDepartureDate.note;

  const noSpecificTime = /(时间没有(?:特别|特殊)?要求|时间无(?:特别|特殊)?要求|时间不限|不限时间|不限定时间|全天|任意时间|no (?:specific )?time|time flexible)/i.test(normalized);
  const explicitDepartureTime = noSpecificTime ? "" : extractDepartureTime(normalized);
  const inferredDepartureTime = noSpecificTime || explicitDepartureTime ? null : inferDepartureTime(normalized);
  const departureTime = noSpecificTime ? "全天" : explicitDepartureTime || inferredDepartureTime.value;
  const departureTimeNote = noSpecificTime
    ? "No specific departure time requirement"
    : explicitDepartureTime ? "Explicit from requirement" : inferredDepartureTime.note;
  const passengerBreakdown = extractPassengerBreakdown(normalized);

  return {
    origin: collapseSpaces(origin),
    destination: collapseSpaces(destination),
    departureDate: collapseSpaces(departureDate || ""),
    departureDateNote: collapseSpaces(departureDateNote),
    departureTime: collapseSpaces(departureTime),
    departureTimeNote: collapseSpaces(departureTimeNote),
    adultCount: collapseSpaces(passengerBreakdown.adultCount),
    childCount: collapseSpaces(passengerBreakdown.childCount),
    passengerNote: collapseSpaces(passengerBreakdown.passengerNote),
  };
}

function applyParsedState(nextState) {
  parsedState = {
    origin: nextState.origin || "",
    destination: nextState.destination || "",
    departureDate: nextState.departureDate || "",
    departureDateNote: nextState.departureDateNote || "",
    departureTime: nextState.departureTime || "",
    departureTimeNote: nextState.departureTimeNote || "",
    adultCount: nextState.adultCount || "",
    childCount: nextState.childCount || "",
    passengerNote: nextState.passengerNote || "",
    recognizedText: nextState.recognizedText || "",
  };

  originField.value = parsedState.origin;
  destinationField.value = parsedState.destination;
  departureDateField.value = parsedState.departureDate;
  departureDateNoteField.value = parsedState.departureDateNote;
  departureTimeField.value = parsedState.departureTime;
  departureTimeNoteField.value = parsedState.departureTimeNote;
  adultCountField.value = parsedState.adultCount;
  childCountField.value = parsedState.childCount;
  passengerNoteField.value = parsedState.passengerNote;
  recognizedText.value = parsedState.recognizedText;
}

async function getOcrWorker() {
  if (!globalThis.Tesseract?.createWorker) {
    throw new Error("OCR engine is not loaded.");
  }

  if (!ocrWorkerPromise) {
    ocrWorkerPromise = globalThis.Tesseract.createWorker("chi_sim+eng", 1, {
      workerPath: TESSERACT_WORKER_URL,
      corePath: TESSERACT_CORE_URL,
      langPath: TESSERACT_LANG_URL,
      workerBlobURL: false,
      logger: (message) => {
        if (message?.status) {
          setStatus(`OCR: ${message.status}`);
        }
      },
    });
  }

  return ocrWorkerPromise;
}

async function runOcr() {
  if (!selectedImageFile) return "";

  const worker = await getOcrWorker();
  const result = await worker.recognize(selectedImageFile);
  return result?.data?.text || "";
}

function renderImagePreview(dataUrl, name) {
  imagePreview.classList.toggle("empty", !dataUrl);
  imagePreview.innerHTML = "";

  if (!dataUrl) {
    imagePreview.textContent = "No image selected";
    return;
  }

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = name || "Image preview";
  imagePreview.appendChild(img);
}

function updateSaveState() {
  saveRequirement.disabled = !requirementText.value.trim() && !imageDataUrl && !recognizedText.value.trim();
}

function setLatestTrainDetails(details, allowEmpty = false) {
  latestTrainDetails = Array.isArray(details) ? details : [];
  exportDetails.disabled = false;
}

async function loadSavedState() {
  const storage = getStorage();

  if (!storage) {
    updateSaveState();
    return;
  }

  const {
    requirementText: savedText = "",
    requirementImage: savedImage = "",
    parsedState: savedParsedState = null,
  } = await storage.get(["requirementText", "requirementImage", "parsedState"]);

  requirementText.value = savedText;
  imageDataUrl = savedImage;
  renderImagePreview(imageDataUrl, "Saved image");
  if (savedParsedState) {
    applyParsedState(savedParsedState);
  }
  updateSaveState();
}

requirementText.addEventListener("input", updateSaveState);

requirementImage.addEventListener("change", () => {
  const file = requirementImage.files?.[0];
  if (!file) {
    selectedImageFile = null;
    imageDataUrl = "";
    renderImagePreview("", "");
    updateSaveState();
    return;
  }

  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    imageDataUrl = String(reader.result || "");
    renderImagePreview(imageDataUrl, file.name);
    updateSaveState();
    setStatus(`Loaded ${file.name}`);
  };
  reader.readAsDataURL(file);
});

clearImage.addEventListener("click", () => {
  requirementImage.value = "";
  selectedImageFile = null;
  imageDataUrl = "";
  renderImagePreview("", "");
  updateSaveState();
  setStatus("Image cleared");
});

extractFields.addEventListener("click", async () => {
  try {
    setStatus("Analyzing input...");

    const ocrText = selectedImageFile ? await runOcr() : "";
    const combinedText = [requirementText.value.trim(), ocrText].filter(Boolean).join("\n");
    const parsed = extractFieldsFromText(combinedText);

    applyParsedState({
      ...parsed,
      recognizedText: combinedText || ocrText || requirementText.value.trim(),
    });

    const messages = [];
    if (parsed.origin) messages.push(`Origin: ${parsed.origin}`);
    if (parsed.destination) messages.push(`Destination: ${parsed.destination}`);
    if (parsed.departureDate) messages.push(`Date: ${parsed.departureDate}`);
    if (parsed.departureDateNote) messages.push(`Date note: ${parsed.departureDateNote}`);
    messages.push(`Time: ${parsed.departureTime}`);
    if (parsed.departureTimeNote) messages.push(`Time note: ${parsed.departureTimeNote}`);
    if (parsed.adultCount) messages.push(`Adults: ${parsed.adultCount}`);
    if (parsed.childCount) messages.push(`Children: ${parsed.childCount}`);
    if (!parsed.adultCount && !parsed.childCount && parsed.passengerNote) {
      messages.push(`Passengers: ${parsed.passengerNote}`);
    }
    setStatus(messages.length ? messages.join(" | ") : "No fields found");
    updateSaveState();

    const applyResult = await applyToCurrentPage(parsed);
    setLatestTrainDetails(applyResult.result?.trainDetails?.details || [], true);
    if (latestTrainDetails.length) {
      downloadTrainDetailsHtml(latestTrainDetails);
    }
    if (applyResult.ok) {
      setStatus(`${status.textContent} | Applied to page${latestTrainDetails.length ? " | HTML exported" : ""}`);
    } else if (applyResult.reason) {
      setStatus(`${status.textContent} | Page sync completed with warning: ${applyResult.reason}${latestTrainDetails.length ? " | HTML exported" : ""}`);
    }
  } catch (error) {
    setStatus(`OCR failed: ${error?.message || error}`);
  }
});

exportDetails.addEventListener("click", async () => {
  try {
    setStatus("Reading expanded train details...");
    const response = await getTrainDetailsFromCurrentPage();
    if (response.ok && response.details?.length) {
      setLatestTrainDetails(response.details);
    }
    if (!latestTrainDetails.length) {
      setStatus("No expanded train details found");
      return;
    }
    downloadTrainDetailsHtml(latestTrainDetails);
    setStatus(`Exported ${latestTrainDetails.length} train(s) to HTML`);
  } catch (error) {
    setStatus(`HTML export failed: ${error?.message || error}`);
  }
});

reloadExtension.addEventListener("click", () => {
  setStatus("Reloading extension...");
  if (globalThis.chrome?.runtime?.reload) {
    setTimeout(() => globalThis.chrome.runtime.reload(), 80);
  } else {
    setStatus("Extension reload is unavailable");
  }
});

saveRequirement.addEventListener("click", async () => {
  const payload = {
    requirementText: requirementText.value.trim(),
    requirementImage: imageDataUrl,
    parsedState,
  };

  const storage = getStorage();
  if (storage) {
    await storage.set(payload);
  }

  setStatus("Requirement saved");
});

window.addEventListener("unload", async () => {
  try {
    if (ocrWorkerPromise) {
      const worker = await ocrWorkerPromise;
      await worker.terminate();
    }
  } catch (_) {
    // ignore shutdown errors
  }
});

loadSavedState();
