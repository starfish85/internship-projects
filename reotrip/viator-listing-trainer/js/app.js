/* Stage A: read-only Viator draft-wizard replica.
 * Stage B (later): forced field tour + per-field requirement buttons.
 * Later: toggle APP_MODE between "readonly" and "fillable". Submit stays disabled.
 */
(function () {
  const APP_MODE = "readonly"; // future: "fillable"
  const STORAGE_KEY = "viator-training-v2";
  const UI = {
    zh: {
      fill: "此处填什么",
      format: "建议文案格式",
      think: "换产品时看什么",
      mistakes: "常见错法",
      restart: "重新走新手引导",
      searchPh: "搜索字段，如 取消 / title / 核销",
      searchEmpty: "没有匹配的字段",
      tourPrev: "上一项",
      tourNext: "Next",
      tourDone: "完成引导，解锁阅读",
      langBtn: "EN",
      lockHint: "请先走完基础引导",
      guideTitle: "字段要求",
    },
    en: {
      fill: "What to enter",
      format: "Suggested format",
      think: "What to check for the next product",
      mistakes: "Common mistakes",
      restart: "Restart field tour",
      searchPh: "Search fields, e.g. cancel / title / redemption",
      searchEmpty: "No matching fields",
      tourPrev: "Back",
      tourNext: "Next",
      tourDone: "Finish tour, unlock reading",
      langBtn: "中文",
      lockHint: "Finish the tour first",
      guideTitle: "Field guide",
    },
  };
  const SEARCH_ZH = {
    creationType: "创建方式 手工 智能 Smart Creator Manual",
    smartCreatorSkipped: "智能生成 跳过 AI URL",
    inputLanguage: "输入语言 撰写语言 英语 中文 language",
    translationMode: "翻译 自动翻译 人工翻译 translation",
    title: "标题 产品标题 主标题 biaoti title",
    referenceCode: "内部码 参考码 SKU 编码",
    productType: "产品类型 门票 类型 ticket pass",
    itineraryType: "行程类型 分类",
    ticketPassType: "票种 通票 主题乐园 Theme Park Cultural",
    themes: "主题 筛选 zhuti theme day sunset night",
    coverPhoto: "封面 照片 主图",
    gallery: "相册 图库 图片",
    hasPickup: "接送 酒店接送 pickup 有没有车",
    meetingPoint: "集合点 入园地址 地点 迪士尼",
    dropoff: "落客 结束地点",
    additionalPickupDetails: "接送说明 自行前往",
    multipleAttractions: "多个景点 是否多景点",
    attraction: "景点 POI 东京迪士尼",
    duration: "时长 停留时间 有效期 shichang",
    attractionDescription: "景点说明 简介",
    liveGuide: "导游 真人导游",
    audioGuide: "语音导览",
    writtenGuide: "书面导览",
    guideLanguages: "导游语言",
    inclusions: "包含 包含项 通票 地铁",
    exclusions: "不包含 不含 JR 山手线",
    extraCostConfirm: "额外费用",
    briefDescription: "卖点 独特 概述 voucher 凭证",
    skipTheLine: "快速通关 免排队 skip",
    resellerStatus: "经销 转售",
    accessibility: "无障碍 轮椅",
    healthRestrictions: "健康限制",
    difficultyLevel: "难度 体能",
    phoneNumber: "电话 对客电话",
    additionalInfo: "须知 限制 日籍 护照持有人",
    priceType: "计价 按人 按车",
    ageGroups: "年龄档 成人 儿童 Adult Child",
    childAccompaniment: "婴儿 陪同",
    maxTravelers: "人数上限 每单人数",
    options: "套餐 option 地铁通票 TG6 TG7",
    currency: "币种 货币 HKD",
    supplierPrices: "价格 供应商价 报价",
    priceMatrixNote: "价格表 日历",
    cutoffType: "截止 截止类型 停售",
    cutoffHours: "截止小时 48 两天",
    confirmationMethod: "确认 即时确认",
    notificationEmail: "通知邮件",
    cancellationPolicy: "取消 取消政策 不可退 quxiao cancel",
    badWeather: "天气 恶劣天气 无需勾选",
    notEnoughTravelers: "人数不足 不成团 无需勾选",
    requiredTravelerFields: "客人资料 姓名 Full Names 要客人填",
    passportTiming: "护照 护照资料 上传护照",
    ticketType: "票类型 电子票 纸质票",
    ticketsPer: "几张票 按订单 按人",
    separateEntryTicket: "凭证 是不是门票 另发票",
    redemptionInstructions: "核销 核销说明 换票 入园 hexiao redemption QR",
    ticketPreview: "票面预览",
    companyLogo: "Logo 公司标志",
    tripadvisorListing: "Tripadvisor 点评",
    submitForReview: "提交 审核 Submit",
  };
  const PENDING = "待补";
  const OWNER_PENDING = "待负责人补全";

  const data = window.APP_DATA;
  if (!data) {
    document.getElementById("app").innerHTML =
      '<div class="boot">Missing js/data.js. Open index.html from this folder.</div>';
    return;
  }

  const product = getActiveProduct();
  const productType = product.productType || "ticket";
  const steps = getStepsForProductType(productType);
  const sections = data.steps.sections || [];
  const learning = data.learning;
  const fieldGuides = (data.fieldGuides && data.fieldGuides.fields) || {};
  const guideGlobal = (data.fieldGuides && data.fieldGuides.global) || {};
  const spots = (data.tour && data.tour.spots) || [];

  const RADIO_OPTIONS = {
    creationType: [
      {
        value: "Smart Creator",
        label: "Smart Creator (recommended)",
        sublabel: "Use AI-powered recommendations to quickly build your product.",
      },
      {
        value: "Manual Creation",
        label: "Manual Creation",
        sublabel: "Enter the details of your product manually.",
      },
    ],
    translationMode: [
      { value: "Add manual translation", label: "Add manual translation" },
      { value: "Use automated translation (recommended)", label: "Use automated translation (recommended)" },
    ],
    hasPickup: [
      { value: true, label: "Yes, pickup is optional" },
      { value: false, label: "No, travelers go directly to the location" },
    ],
    multipleAttractions: [
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ],
    liveGuide: [
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ],
    audioGuide: yesNo("Audio guide"),
    writtenGuide: yesNo("Written guide"),
    skipTheLine: [
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ],
    separateEntryTicket: [
      { value: true, label: "Yes, they will have a direct entry ticket delivered to them" },
      { value: false, label: "No" },
    ],
    cancellationPolicy: [
      {
        value: "Standard cancellation policy",
        label: "Standard",
        recommended: true,
        sublabel: "To receive a full refund, travelers may cancel up to 24 hours before the experience start time in the local timezone. No refunds will be given after that time period.",
      },
      {
        value: "All sales final. Travelers will not receive any refund regardless of cancellation status.",
        label: "All sales final",
        sublabel: "Travelers will not receive any refund regardless of cancellation status.",
      },
    ],
    resellerStatus: [
      { value: "Official reseller", label: "Official reseller" },
      { value: "Independent reseller", label: "Independent reseller" },
      { value: "I am not acting as a reseller", label: "I am not acting as a reseller" },
    ],
    difficultyLevel: [
      { value: "Easy — Most travelers can participate", label: "Easy", sublabel: "Most travelers can participate" },
      { value: "Moderate — Travelers should have a moderate physical fitness level", label: "Moderate", sublabel: "Travelers should have a moderate physical fitness level" },
      { value: "Challenging — Travelers should have a strong physical fitness level", label: "Challenging", sublabel: "Travelers should have a strong physical fitness level" },
    ],
    priceType: [
      { value: "Per person", label: "Per person" },
      { value: "Per vehicle/group", label: "Per vehicle/group" },
    ],
    ticketType: [
      { value: "Mobile or paper ticket accepted", label: "Mobile or paper ticket accepted", recommended: true },
      { value: "Paper ticket only accepted", label: "Paper ticket only accepted" },
    ],
    ticketsPer: [
      { value: "One per booking", label: "One per booking", recommended: true },
      { value: "One per traveler", label: "One per traveler" },
    ],
  };

  const SELECT_OPTIONS = {
    inputLanguage: ["English", "Chinese (Simplified)", "Chinese (Traditional)", "Japanese", "Korean"],
    translationMode: [
      "Use automated translation (recommended)",
      "Add manual translation",
    ],
    productType: ["Tour", "Activity", "Ticket or pass", "Rental", "Transport"],
    itineraryType: ["Ticket/pass", "Standard", "Hop-on hop-off", "Multi-day"],
    ticketPassType: ["Theme Park", "Admission ticket", "Pass", "Skip-the-line ticket"],
    resellerStatus: ["Official reseller", "Independent reseller", "I am not acting as a reseller"],
    difficultyLevel: [
      "Easy — Most travelers can participate",
      "Moderate — Travelers should have a moderate physical fitness level",
      "Challenging — Travelers should have a strong physical fitness level",
    ],
    priceType: ["Per person", "Per vehicle/group"],
    cutoffType: ["One set time", "Relative to start time"],
    confirmationMethod: [
      "Instant confirmation (Recommended)",
      "Instant confirmation then becomes manual",
      "Manual confirmation",
    ],
    passportTiming: ["At booking", "After booking", "Not required"],
    ticketType: ["Mobile or paper ticket accepted", "Paper ticket only accepted"],
    ticketsPer: ["One per booking", "One per traveler"],
    currency: ["HKD", "USD", "JPY", "CNY", "EUR"],
    durationUnit: ["hours", "days", "minutes"],
    pickupOption: [
      "Yes, pickup is optional",
      "No, travelers go directly to the location",
    ],
    smartCreatorTone: ["Expert", "Friendly", "Professional"],
    smartCreatorSource: ["Paste URL", "Enter product details"],
  };

  const PRODUCT_TYPE_CARDS = [
    { value: "Tour", label: "Tour", sub: "A guided visit to one or more sites" },
    { value: "Activity", label: "Activity", sub: "An instructed or interactive experience" },
    { value: "Ticket or pass", label: "Ticket or pass", aliases: ["Ticket/pass"], sub: "Independent entry and/or discounts to one or more attractions or events" },
    { value: "Rental", label: "Rental", sub: "Temporary access to a vehicle or equipment for independent use" },
    { value: "Transport", label: "Transport", sub: "Transferring travelers between locations, with a focus on transportation rather than sightseeing" },
  ];

  const TICKET_PASS_TAGS = ["Theme Park", "Cultural"];

  const FIELD_COPY = {
    inputLanguage: {
      question: "Select the language you will use to write your product details",
      help: "We recommend writing in your strongest language.",
    },
    translationMode: { question: "How would you like to translate your product details?" },
    title: {
      question: "What is your product title?",
      help: "A great title will help travelers understand what you are offering them at a glance.",
    },
    referenceCode: { question: "Add your product reference code", optionalLink: true },
    creationType: { hideLabel: true },
    smartCreatorSkipped: { hideLabel: true },
    productType: { hideLabel: true },
    themes: { hideLabel: true },
    coverPhoto: { hideLabel: true },
    gallery: { hideLabel: true },
    hasPickup: { question: "Do you offer pickup?" },
    meetingPoint: { question: "Meeting point / attraction location" },
    dropoff: { question: "Drop-off" },
    additionalPickupDetails: { question: "Additional pickup details" },
    multipleAttractions: { question: "Does your ticket offer admission to more than one attraction?" },
    attraction: { question: "What attraction does this ticket offer admission to?" },
    duration: { question: "How much time do travelers typically spend here?" },
    attractionDescription: { question: "Describe what travelers will see and do here" },
    liveGuide: { question: "Do you offer in-person, audio or written guides?" },
    inclusions: { question: "What's included" },
    exclusions: { question: "What's excluded" },
    extraCostConfirm: { hideChromeReq: true },
    briefDescription: { help: "Encourage travelers to book your product by highlighting what makes it unique and interesting." },
    skipTheLine: { question: "Does this ticket include skip-the-line access?" },
    resellerStatus: { question: "Are you acting as an official or independent reseller for your experience (or any part of it)?" },
    difficultyLevel: { question: "Select the physical difficulty level" },
    phoneNumber: { question: "Your phone number", help: "This is the number travelers will call if they need to reach you on the day of the travel." },
    priceType: { question: "How do you price your product?" },
    ageGroups: { question: "Define the age groups that can attend" },
    childAccompaniment: { question: "Do children and youth need to be accompanied by at least one adult?" },
    maxTravelers: { question: "What is the maximum number of travelers per booking?" },
    cutoffType: { question: "How would you like to set your cut-off time?", help: "This is the time when you stop accepting new bookings for this ticket/pass." },
    cutoffHours: { question: "What is your booking cut-off time in hours?" },
    confirmationMethod: { question: "How will you confirm your booking?", help: "This lets us know how and when you will process bookings for this product." },
    cancellationPolicy: { question: "Select your cancellation policy", help: "Most travelers prefer the flexibility of a standard cancellation policy. Your product is also more likely to obtain an Excellent quality status." },
    ticketType: { question: "Select a ticket type" },
    ticketsPer: { question: "How many tickets do you want us to create per booking?" },
    separateEntryTicket: { question: "Do travelers use a separate entry ticket?" },
    redemptionInstructions: { question: "Add or edit ticket redemption instructions", optionalBadge: true },
    tripadvisorListing: { question: "Select the listing for this product" },
    submitForReview: { hideLabel: true },
  };

  const THEME_CATEGORIES = [
    "Art, Design, & Fashion",
    "Entertainment",
    "Food & Drink",
    "Health & Fitness",
    "History & Culture",
    "Holidays",
    "Lifestyle & Celebrations",
    "Nature and Social Impact",
    "Outdoor & Adventure",
    "Religion",
    "Science & Technology",
    "Seasonal",
    "Time of Day",
    "Travel",
    "Virtual experience",
  ];
  const TIME_OF_DAY_THEMES = ["Day", "Night", "Sunrise", "Sunset"];

  const savedInit = loadStore();
  const state = {
    stepId: readSavedStep() || (steps[0] && steps[0].id),
    visited: new Set(readVisited()),
    askOpen: true,
    sidebarOpen: false,
    unlocked: savedInit.unlocked === true,
    spotIndex: Number.isInteger(savedInit.spotIndex) ? savedInit.spotIndex : 0,
    guideFieldId: null,
    openSelectId: null,
    selectClosedByUser: false,
    lang: savedInit.lang === "en" ? "en" : "zh",
    searchQ: "",
    searchComposing: false,
    highlightFieldId: null,
  };
  if (!state.unlocked && spots.length) {
    if (state.spotIndex < 0) state.spotIndex = 0;
    if (state.spotIndex > spots.length - 1) state.spotIndex = spots.length - 1;
    state.stepId = spots[state.spotIndex].stepId;
  }
  state.visited.add(state.stepId);

  function yesNo(label) {
    return [
      { value: true, label: "Yes — " + label },
      { value: false, label: "No — " + label },
    ];
  }

  function getActiveProduct() {
    const pack = data.products;
    const id = pack.activeProductId;
    return pack.products.find(function (p) { return p.id === id; }) || pack.products[0];
  }

  /** Reserved for transfer / charter products. Stage A only uses ticket. */
  function getStepsForProductType(type) {
    return (data.steps.steps || [])
      .filter(function (step) {
        return (step.appliesToProductTypes || []).indexOf(type) !== -1;
      })
      .sort(function (a, b) { return a.order - b.order; });
  }

  function currentIndex() {
    return steps.findIndex(function (s) { return s.id === state.stepId; });
  }

  function currentStep() {
    return steps[currentIndex()] || steps[0];
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveStore(patch) {
    var prev = loadStore();
    var next = {};
    Object.keys(prev).forEach(function (k) { next[k] = prev[k]; });
    Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
    next.version = 2;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function readSavedStep() {
    var hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (hash && steps.some(function (s) { return s.id === hash; })) return hash;
    var stored = loadStore().stepId;
    if (stored && steps.some(function (s) { return s.id === stored; })) return stored;
    return null;
  }

  function readVisited() {
    var list = loadStore().visited;
    return Array.isArray(list) ? list : [];
  }

  function persist() {
    try {
      saveStore({
        stepId: state.stepId,
        visited: Array.from(state.visited),
        unlocked: state.unlocked,
        spotIndex: state.spotIndex,
        lang: state.lang,
      });
    } catch (e) { /* file:// storage can be blocked */ }
    try {
      if (history.replaceState) history.replaceState(null, "", "#" + state.stepId);
      else location.hash = state.stepId;
    } catch (e) {
      try { location.hash = state.stepId; } catch (e2) { /* ignore */ }
    }
  }

  function goTo(stepId) {
    if (!steps.some(function (s) { return s.id === stepId; })) return;
    if (!state.unlocked && spots.length) {
      var allowed = spots[state.spotIndex] && spots[state.spotIndex].stepId;
      if (stepId !== allowed) return;
    }
    state.stepId = stepId;
    state.visited.add(stepId);
    persist();
    render();
  }

  var lastRenderedStepId = null;
  var tourPositioning = false;

  function resetMainScroll() {
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
    var scroller = document.querySelector(".main-scroll");
    if (scroller) scroller.scrollTop = 0;
  }

  function offsetTopInPane(pane, el) {
    return el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
  }

  function scrollPaneToShow(pane, el, align) {
    if (!pane || !el) return;
    var pad = 12;
    var elTop = offsetTopInPane(pane, el);
    var elBottom = elTop + el.offsetHeight;
    var viewTop = pane.scrollTop;
    var viewBottom = viewTop + pane.clientHeight;
    var fullyVisible = elTop >= viewTop + pad && elBottom <= viewBottom - pad;
    if (fullyVisible && align !== "start") return;
    var next = elTop - pad;
    if (next < 0) next = 0;
    var max = Math.max(0, pane.scrollHeight - pane.clientHeight);
    pane.scrollTop = Math.min(next, max);
  }

  function revealCurrentStepInSidebar() {
    scrollPaneToShow(
      document.querySelector(".sidebar-scroll"),
      document.querySelector(".step-btn.is-current")
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fieldEntry(fieldId) {
    if (fieldId === "options") {
      return { value: product.options, valueStatus: "confirmed_c_side" };
    }
    return (product.values && product.values[fieldId]) || { value: null, valueStatus: "todo_from_supplier_backend" };
  }

  function isPending(entry) {
    if (!entry) return true;
    if (entry.valueStatus === "todo_from_supplier_backend") return true;
    if (entry.valueStatus === "needs_owner") return true;
    if (entry.value === null || entry.value === undefined || entry.value === "") return true;
    if (Array.isArray(entry.value) && entry.value.length === 0 &&
        (entry.valueStatus === "todo_from_supplier_backend" || entry.valueStatus === "needs_owner")) {
      return true;
    }
    return false;
  }

  function pendingLabel(entry) {
    if (entry && entry.valueStatus === "needs_owner") return OWNER_PENDING;
    return PENDING;
  }

  function statusClass(status) {
    if (status === "todo_from_supplier_backend") return "todo";
    if (status === "needs_owner") return "owner";
    if (status === "inferred") return "inferred";
    if (status === "placeholder") return "placeholder";
    return "";
  }

  function statusText(status) {
    return ({
      confirmed_c_side: "C-side",
      owner_confirmed: "Confirmed",
      inferred: "Inferred",
      todo_from_supplier_backend: "待补",
      needs_owner: "待负责人",
      placeholder: "Training",
    })[status] || status || "";
  }

  function boolLabel(value) {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return String(value);
  }

  function t(key) {
    var pack = UI[state.lang] || UI.zh;
    return pack[key] || UI.zh[key] || key;
  }

  function sameValue(a, b) {
    if (typeof a === "boolean" || typeof b === "boolean") return a === b;
    return String(a) === String(b);
  }

  function disabledAttr() {
    return APP_MODE === "readonly" ? " disabled" : "";
  }

  function readonlyAttr() {
    return APP_MODE === "readonly" ? " readonly" : "";
  }

  function renderPending(entry) {
    return '<div class="pending">' + escapeHtml(pendingLabel(entry)) + "</div>";
  }

  function renderStatus(entry) {
    if (!entry || !entry.valueStatus) return "";
    if (
      entry.valueStatus === "confirmed_c_side" ||
      entry.valueStatus === "owner_confirmed" ||
      entry.valueStatus === "confirmed_live"
    ) return "";
    var cls = statusClass(entry.valueStatus);
    var label = statusText(entry.valueStatus);
    if (!label || label === entry.valueStatus) return "";
    return '<span class="status-pill ' + cls + '">' + escapeHtml(label) + "</span>";
  }

  function renderNote() {
    return "";
  }

  function renderRich(text) {
    if (!text) return "";
    var blocks = String(text).split(/\n\s*\n/);
    return blocks.map(function (block) {
      var lines = block.split("\n").map(function (s) { return s.replace(/^\s+|\s+$/g, ""); }).filter(Boolean);
      if (!lines.length) return "";
      var isList = lines.length > 1 && lines.every(function (l) { return /^[•\-\*] /.test(l); });
      if (isList) {
        return (
          '<ul class="tour-list">' +
          lines.map(function (l) {
            return "<li>" + escapeHtml(l.replace(/^[•\-\*] /, "")) + "</li>";
          }).join("") +
          "</ul>"
        );
      }
      return "<p>" + lines.map(function (l) { return escapeHtml(l); }).join("<br>") + "</p>";
    }).join("");
  }

  function renderTextInput(value, multiline, tall) {
    if (multiline) {
      return (
        '<textarea class="control' + (tall ? " tall" : "") + '"' +
        readonlyAttr() + ">" +
        escapeHtml(value == null ? "" : value) +
        "</textarea>"
      );
    }
    return (
      '<input class="control" type="text"' + readonlyAttr() +
      ' value="' + escapeHtml(value == null ? "" : value) + '" />'
    );
  }

  function selectOptionsFor(fieldId, value) {
    var opts = (SELECT_OPTIONS[fieldId] || (fieldId === "themeCategory" ? THEME_CATEGORIES.slice() : [])).slice();
    if (value && opts.indexOf(value) === -1) opts.unshift(value);
    if (!opts.length) opts = [value || PENDING];
    return opts;
  }

  function renderSelect(fieldId, value) {
    if (fieldId === "productType" && (value === "Ticket/pass" || value === "Ticket or pass")) {
      value = "Ticket or pass";
    }
    var opts = selectOptionsFor(fieldId, value);
    var open = state.openSelectId === fieldId;
    var html =
      '<div class="js-dd' + (open ? " is-open" : "") + '" data-select-id="' + escapeHtml(fieldId) + '">' +
      '<button type="button" class="js-dd-trigger" data-action="toggle-select" data-select="' +
      escapeHtml(fieldId) + '" aria-expanded="' + (open ? "true" : "false") + '">' +
      '<span class="js-dd-value">' + escapeHtml(value == null || value === "" ? "Choose one" : value) + "</span>" +
      '<span class="js-dd-caret" aria-hidden="true"></span></button>';
    if (open) {
      html += '<ul class="js-dd-menu" role="listbox">';
      opts.forEach(function (opt) {
        var on = sameValue(opt, value);
        html +=
          '<li class="js-dd-item' + (on ? " is-selected" : "") + '" role="option" aria-selected="' +
          (on ? "true" : "false") + '">' + escapeHtml(opt) + "</li>";
      });
      html += "</ul>";
    }
    html += "</div>";
    return html;
  }

  function renderThemePicker(value) {
    var selected = Array.isArray(value) ? value : [];
    var catHtml = renderSelect("themeCategory", "Time of Day");
    var checks = TIME_OF_DAY_THEMES.map(function (name) {
      var on = selected.indexOf(name) !== -1;
      return (
        '<label class="choice' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox"' + disabledAttr() + (on ? " checked" : "") + " />" +
        "<span>" + escapeHtml(name) + "</span></label>"
      );
    }).join("");
    return (
      '<div class="theme-picker">' +
      '<div class="theme-kicker">Select a theme</div>' +
      catHtml +
      '<div class="theme-kicker theme-kicker-2">Select theme(s)</div>' +
      '<div class="theme-checks">' + checks + "</div>" +
      "</div>"
    );
  }

  function renderDuration(value) {
    var raw = String(value == null ? "" : value);
    var num = "10";
    var unit = "hours";
    var m = raw.match(/^(\d+)\s*(hours?|days?|minutes?)?$/i);
    if (m) {
      num = m[1];
      var u = (m[2] || "hours").toLowerCase();
      if (u.indexOf("day") === 0) unit = "days";
      else if (u.indexOf("min") === 0) unit = "minutes";
      else unit = "hours";
    } else if (raw) {
      num = raw;
    }
    return (
      '<div class="duration-block">' +
      '<label class="choice is-on choice-detailed">' +
      '<input type="radio"' + disabledAttr() + " checked />" +
      '<span class="choice-copy"><span class="choice-label">Set duration</span>' +
      '<div class="duration-row">' +
      '<input class="control duration-num" type="text"' + readonlyAttr() + ' value="' + escapeHtml(num) + '" />' +
      renderSelect("durationUnit", unit) +
      "</div></span></label>" +
      '<label class="choice"><input type="radio"' + disabledAttr() + ' />' +
      '<span class="choice-copy"><span class="choice-label">Flexible duration</span></span></label>' +
      "</div>"
    );
  }

  function renderRadios(fieldId, value) {
    var opts = RADIO_OPTIONS[fieldId];
    if (!opts) {
      if (typeof value === "boolean") opts = yesNo("Selected");
      else if (value != null && value !== "") opts = [value];
      else return renderPending({ valueStatus: "todo_from_supplier_backend" });
    }
    var html = '<div class="radio-row" role="radiogroup">';
    opts.forEach(function (opt) {
      var v = typeof opt === "object" ? opt.value : opt;
      var label = typeof opt === "object" ? opt.label : opt;
      var sub = typeof opt === "object" ? opt.sublabel : "";
      var rec = typeof opt === "object" && opt.recommended;
      var on = sameValue(v, value);
      html +=
        '<label class="choice' + (on ? " is-on" : "") + (sub ? " choice-detailed" : "") + '">' +
        '<input type="radio"' + disabledAttr() + (on ? " checked" : "") + " />" +
        '<span class="choice-copy"><span class="choice-label">' + escapeHtml(label) +
        (rec ? ' <span class="rec-badge">RECOMMENDED</span>' : "") +
        "</span>" +
        (sub ? '<span class="choice-sub">' + escapeHtml(sub) + "</span>" : "") +
        "</span></label>";
    });
    html += "</div>";
    return html;
  }

  function isProductTypeSelected(card, value) {
    var raw = String(value || "");
    if (sameValue(card.value, value) || sameValue(card.label, value)) return true;
    return (card.aliases || []).indexOf(raw) !== -1;
  }

  function renderTicketPassPicker() {
    var entry = fieldEntry("ticketPassType");
    var selected = Array.isArray(entry.value) ? entry.value : (entry.value ? [entry.value] : []);
    var tags = (selected.length ? selected : TICKET_PASS_TAGS).map(function (name) {
      return '<span class="ms-tag">' + escapeHtml(name) + "</span>";
    }).join("");
    return (
      '<div class="type-extra" data-field="ticketPassType">' +
      '<div class="theme-kicker">What type(s) of ticket/pass is it?</div>' +
      '<div class="ms-field">' +
      '<div class="ms-value">' + tags + "</div>" +
      '<span class="js-dd-caret" aria-hidden="true"></span>' +
      "</div></div>"
    );
  }

  function renderProductTypeCards(value) {
    var html = '<div class="type-list" role="radiogroup">';
    PRODUCT_TYPE_CARDS.forEach(function (card) {
      var on = isProductTypeSelected(card, value);
      html +=
        '<label class="type-card' + (on ? " is-on" : "") + '">' +
        '<input type="radio"' + disabledAttr() + (on ? " checked" : "") + " />" +
        '<span class="type-copy"><span class="type-title">' + escapeHtml(card.label) + "</span>" +
        '<span class="type-sub">' + escapeHtml(card.sub) + "</span></span></label>";
      if (on && card.value === "Ticket or pass") html += renderTicketPassPicker();
    });
    html += "</div>";
    return html;
  }

  function renderSmartCreator() {
    return (
      '<div class="sc-form">' +
      '<div class="sc-block">' +
      '<div class="theme-kicker">Select your tone</div>' +
      '<p class="field-help">Choose a tone that helps us produce content matching your style and needs.</p>' +
      renderSelect("smartCreatorTone", "Expert") +
      "</div>" +
      '<div class="sc-block">' +
      '<div class="theme-kicker">Upload product details</div>' +
      '<p class="field-help">How would you like to add your product details?</p>' +
      '<div class="js-dd" data-select-id="smartCreatorSource">' +
      '<button type="button" class="js-dd-trigger" data-action="toggle-select" data-select="smartCreatorSource" aria-expanded="false">' +
      '<span class="js-dd-value">Paste URL <span class="rec-badge">RECOMMENDED</span></span>' +
      '<span class="js-dd-caret" aria-hidden="true"></span></button></div>' +
      "</div>" +
      '<div class="sc-block">' +
      '<div class="theme-kicker">Enter existing URL</div>' +
      '<p class="field-help">Paste your URL here and we’ll pull the relevant product details into your listing.</p>' +
      '<input class="control" type="text"' + readonlyAttr() + ' placeholder="Paste your URL here" value="" />' +
      '<p class="field-help">12 characters needed. Training replica does not generate.</p>' +
      "</div>" +
      '<p class="sc-legal">By proceeding, you represent and warrant that you are the owner or licensee of any content that will become part of your listing, and that you have the right to instruct Viator to obtain and use this content.</p>' +
      '<div class="sc-actions">' +
      '<button type="button" class="btn btn-primary" disabled>Generate</button>' +
      '<button type="button" class="btn btn-secondary" disabled>Skip</button>' +
      "</div></div>"
    );
  }

  function renderPhotoStage() {
    var cover = fieldEntry("coverPhoto").value;
    var gallery = fieldEntry("gallery").value || [];
    var urls = [];
    if (cover) urls.push(cover);
    (Array.isArray(gallery) ? gallery : []).forEach(function (u) {
      if (u && urls.indexOf(u) === -1) urls.push(u);
    });
    var html =
      '<div class="photo-stage">' +
      '<div class="photo-stage-head"><strong>Gallery</strong><span>' + urls.length + "/50</span></div>" +
      '<p class="field-help">Keep going. Travelers who explore beyond the 7th photo are around 5x more likely to book.</p>' +
      '<div class="photo-thumbs" data-field="gallery">';
    urls.forEach(function (url, i) {
      html +=
        '<figure class="photo-thumb' + (i === 0 ? " is-cover" : "") + '">' +
        '<img src="' + escapeHtml(url) + '" alt="Photo ' + (i + 1) + '" />' +
        "<figcaption>" + (i === 0 ? "Cover" : String(i + 1)) + "</figcaption></figure>";
    });
    html +=
      '<div class="photo-drop">Drag &amp; drop or browse</div>' +
      "</div>" +
      '<p class="sc-legal">By uploading these photos, I verify that I am the owner or lawful licensee of the copyrights in these photographs.</p>' +
      "</div>";
    return html;
  }

  function renderSubmit() {
    return (
      '<div class="submit-live">' +
      "<p>Almost done! Make sure your product meets our Acceptance Criteria, adheres to our Animal Welfare Policy, and is not operating in an unsupported location.</p>" +
      "<p>You can now submit your product listing for review by the Viator Launch Assist team. This process may take up to 48 hours.</p>" +
      '<div class="submit-fee"><div>Product Submission Fee</div><strong>$29.00</strong></div>' +
      '<div class="submit-box">' +
      '<button class="submit-btn" type="button" disabled>Submit</button>' +
      '<button class="btn btn-secondary" type="button" disabled>Save as draft</button>' +
      '<p class="submit-hint">Disabled in this training replica. Do not submit, save, pay, or publish on the real Viator backend.</p>' +
      "</div></div>"
    );
  }

  function renderCheckbox(label, value, skipHint) {
    var known = value === true;
    var html =
      '<label class="choice' + (known ? " is-on" : "") + '">' +
      '<input type="checkbox"' + disabledAttr() + (known ? " checked" : "") + " />" +
      "<span>" + escapeHtml(label) + "</span></label>";
    if (value === false && skipHint) {
      html += '<p class="hint-skip">' + escapeHtml(skipHint) + "</p>";
    } else if (value == null) {
      html += renderPending({ valueStatus: "todo_from_supplier_backend" });
    }
    return '<div class="check-row">' + html + "</div>";
  }

  function renderList(value) {
    if (!Array.isArray(value) || !value.length) {
      return renderPending({ valueStatus: "todo_from_supplier_backend" });
    }
    return (
      '<ul class="stack-list">' +
      value.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") +
      "</ul>" +
      '<button type="button" class="optional-link" disabled>+ Add another</button>'
    );
  }

  function renderChips(value) {
    if (!Array.isArray(value) || !value.length) {
      return '<div class="chip">None</div>';
    }
    return (
      '<div class="chips">' +
      value.map(function (item) { return '<span class="chip">' + escapeHtml(item) + "</span>"; }).join("") +
      "</div>"
    );
  }

  function renderImage(url, caption) {
    if (!url) return renderPending({ valueStatus: "todo_from_supplier_backend" });
    return (
      '<figure class="photo"><img src="' + escapeHtml(url) + '" alt="' + escapeHtml(caption || "Photo") +
      '" /><figcaption>' + escapeHtml(caption || "Photo") + "</figcaption></figure>"
    );
  }

  function renderGallery(urls) {
    if (!Array.isArray(urls) || !urls.length) {
      return renderPending({ valueStatus: "todo_from_supplier_backend" });
    }
    return (
      '<div class="gallery">' +
      urls.map(function (url, i) {
        return (
          '<figure class="photo"><img src="' + escapeHtml(url) + '" alt="Gallery ' + (i + 1) +
          '" /><figcaption>Photo ' + (i + 1) + "</figcaption></figure>"
        );
      }).join("") +
      "</div>"
    );
  }

  function renderOptionCards() {
    var options = product.options || [];
    if (!options.length) return renderPending({ valueStatus: "todo_from_supplier_backend" });
    return (
      '<div class="option-grid">' +
      options.map(function (opt) {
        var duration = opt.values && opt.values.duration ? opt.values.duration.value : "";
        var desc = opt.values && opt.values.description ? opt.values.description.value : "";
        var inclusions = (opt.values && opt.values.inclusions && opt.values.inclusions.value) || [];
        var price = opt.values && opt.values.cSidePriceFrom ? opt.values.cSidePriceFrom.value : "";
        return (
          '<article class="option-card" data-field="option:' + escapeHtml(opt.id) + '">' +
          "<h3>" + escapeHtml(opt.name) + "</h3>" +
          (duration ? '<p><strong>Duration:</strong> ' + escapeHtml(duration) + "</p>" : "") +
          (desc ? "<p>" + escapeHtml(desc) + "</p>" : "") +
          (inclusions.length
            ? "<p><strong>Included:</strong> " + escapeHtml(inclusions.join(" · ")) + "</p>"
            : "") +
          (price
            ? '<div class="price-note">' + escapeHtml(price) + "</div>"
            : "") +
          "</article>"
        );
      }).join("") +
      "</div>"
    );
  }

  function renderTicketPreview() {
    return (
      '<div class="ticket-preview">' +
      '<div class="tiny">Mobile ticket preview (simplified)</div>' +
      "<h3>" + escapeHtml(product.title) + "</h3>" +
      '<div class="tiny">' + escapeHtml(product.codes.live) + " · training replica</div>" +
      "</div>"
    );
  }

  function renderControl(field, entry) {
    if (field.control === "button-disabled") return renderSubmit();
    if (field.control === "option-cards") return renderOptionCards();
    if (field.id === "ticketPreview") return renderTicketPreview();
    if (field.id === "smartCreatorSkipped") return renderSmartCreator();
    if (field.id === "productType") return renderProductTypeCards(entry && entry.value);
    if (field.id === "coverPhoto") return renderPhotoStage();
    if (field.id === "referenceCode" && isPending(entry)) {
      return '<button type="button" class="optional-link" disabled>Add your product reference code <span class="opt-badge">(optional)</span></button>';
    }

    if (isPending(entry) && field.control !== "checkbox") return renderPending(entry);

    var value = entry ? entry.value : null;
    if (field.id === "themes") return renderThemePicker(value);
    if (field.id === "duration") return renderDuration(value);
    if (field.id === "hasPickup") {
      var pickupLabel = value === false
        ? "No, travelers go directly to the location"
        : value === true
          ? "Yes, pickup is optional"
          : value;
      return (
        '<div class="pickup-tip"><strong>Did you know?</strong> Travelers want to book products with accurate pickup locations so they can plan their day. Adding specific meeting and pickup points will help them find your product.</div>' +
        renderSelect("pickupOption", pickupLabel)
      );
    }
    if (field.id === "attraction") {
      var loc = fieldEntry("meetingPoint").value || value;
      return (
        '<div class="location-card">' +
        '<div class="location-name">' + escapeHtml(value || loc) + "</div>" +
        (loc && loc !== value ? '<div class="location-addr">' + escapeHtml(loc) + "</div>" : "") +
        "</div>"
      );
    }
    if (RADIO_OPTIONS[field.id]) return renderRadios(field.id, value);
    switch (field.control) {
      case "text":
      case "number":
        return renderTextInput(value, false);
      case "textarea":
        return renderTextInput(value, true, field.id === "briefDescription" || field.id === "redemptionInstructions");
      case "select":
        return renderSelect(field.id, value);
      case "radio":
        return renderRadios(field.id, value);
      case "checkbox":
        return renderCheckbox(
          field.labelEn,
          value,
          (field.id === "badWeather" || field.id === "notEnoughTravelers") ? "无需勾选" : ""
        );
      case "multi-select":
        return renderChips(Array.isArray(value) ? value : []);
      case "list":
        return renderList(value);
      case "image":
        return renderImage(value, field.labelEn);
      case "image-list":
        return renderGallery(value);
      case "readonly":
        if (typeof value === "boolean") return renderRadios(field.id, value);
        return renderTextInput(value, String(value || "").length > 80);
      default:
        return renderTextInput(value, false);
    }
  }

  function renderField(step, field) {
    if (field.id === "itineraryType" || field.id === "ticketPassType" || field.id === "gallery") return "";
    if ((field.id === "audioGuide" || field.id === "writtenGuide" || field.id === "guideLanguages") &&
        fieldEntry("liveGuide").value === false) {
      return "";
    }
    var entry = fieldEntry(field.id);
    var copy = FIELD_COPY[field.id] || {};
    var question = copy.question || field.labelEn;
    var help = copy.help || "";
    var hideLabel = copy.hideLabel === true;
    var optionalLink = copy.optionalLink && isPending(entry);
    var labelHtml = hideLabel || optionalLink
      ? ""
      : (
        '<div class="field-label-row">' +
        "<label>" + escapeHtml(question) + "</label>" +
        (copy.optionalBadge ? '<span class="opt-badge">(optional)</span>' : "") +
        '<button type="button" class="guide-btn" data-action="open-guide" data-guide="' +
        escapeHtml(field.id) + '" title="' + escapeHtml(state.unlocked ? t("guideTitle") : t("lockHint")) + '">?</button>' +
        renderStatus(entry) +
        "</div>" +
        (help ? '<p class="field-help">' + escapeHtml(help) + "</p>" : "")
      );
    if (hideLabel || optionalLink) {
      labelHtml =
        '<div class="field-label-row field-label-row-hidden">' +
        '<button type="button" class="guide-btn" data-action="open-guide" data-guide="' +
        escapeHtml(field.id) + '" title="' + escapeHtml(state.unlocked ? t("guideTitle") : t("lockHint")) + '">?</button>' +
        renderStatus(entry) +
        "</div>";
    }
    return (
      '<section class="field' + (state.highlightFieldId === field.id ? " is-search-hit" : "") + '" data-step="' + escapeHtml(step.id) + '" data-field="' + escapeHtml(field.id) + '">' +
      labelHtml +
      renderControl(field, entry) +
      renderNote(entry) +
      "</section>"
    );
  }

  function currentSpot() {
    return spots[state.spotIndex] || null;
  }

  function restartTour() {
    state.unlocked = false;
    state.spotIndex = 0;
    state.guideFieldId = null;
    resetSelectForSpot();
    if (spots[0]) state.stepId = spots[0].stepId;
    persist();
    render();
  }

  function finishTour() {
    state.unlocked = true;
    resetSelectForSpot();
    persist();
    render();
  }

  function tourPrev() {
    if (state.spotIndex <= 0) return;
    state.spotIndex -= 1;
    var spot = currentSpot();
    if (spot) state.stepId = spot.stepId;
    state.visited.add(state.stepId);
    resetSelectForSpot();
    persist();
    render();
  }

  function tourNext() {
    if (state.spotIndex >= spots.length - 1) {
      finishTour();
      return;
    }
    state.spotIndex += 1;
    var spot = currentSpot();
    if (spot) state.stepId = spot.stepId;
    state.visited.add(state.stepId);
    resetSelectForSpot();
    persist();
    render();
  }

  function fallbackGuide(fieldId) {
    var step = currentStep();
    var field = (step.fields || []).find(function (f) { return f.id === fieldId; });
    return {
      labelEn: field ? field.labelEn : fieldId,
      status: "draft_guess",
      draftZh: {
        meaning: field ? field.labelEn : fieldId,
        rule: step.summaryZh || "",
        example: "",
        think: learning.bannerZh,
        mistakes: "把东迪填法套到下一份产品。",
      },
    };
  }

  function renderGuideDrawer() {
    if (!state.guideFieldId) return "";
    var raw = fieldGuides[state.guideFieldId] || fallbackGuide(state.guideFieldId);
    var zh = raw.draftZh || {};
    var badge = "";
    if (raw.status === "needs_owner") badge = '<div class="guide-badge">待负责人确认</div>';
    else if (raw.status === "draft_guess") badge = '<div class="guide-badge">草稿说明</div>';
    return (
      '<div class="guide-drawer-backdrop" data-action="close-guide"></div>' +
      '<aside class="guide-drawer" role="dialog">' +
      "<header><div>" + badge + "<h2>" + escapeHtml(raw.labelEn || state.guideFieldId) + "</h2></div>" +
      '<button type="button" class="guide-close" data-action="close-guide" aria-label="Close">×</button></header>' +
      '<div class="guide-body">' +
      '<div class="guide-disclaimer">' + escapeHtml(guideGlobal.exampleDisclaimerZh || "") + "</div>" +
      "<h3>" + escapeHtml(t("fill")) + "</h3>" + renderRich(zh.fill || zh.meaning || "") +
      "<h3>" + escapeHtml(t("format")) + "</h3>" + renderRich(zh.format || zh.rule || "") +
      (zh.think
        ? "<h3>" + escapeHtml(t("think")) + "</h3>" + renderRich(zh.think)
        : "") +
      (zh.mistakes
        ? "<h3>" + escapeHtml(t("mistakes")) + "</h3><div class=\"guide-mistakes\">" + renderRich(zh.mistakes) + "</div>"
        : "") +
      "</div></aside>"
    );
  }

  function renderTourLayer() {
    if (state.unlocked || !spots.length) return "";
    var spot = currentSpot();
    if (!spot) return "";
    var last = state.spotIndex >= spots.length - 1;
    var nextLabel = last ? t("tourDone") : t("tourNext");
    return (
      '<div class="tour-layer" id="tour-layer">' +
      '<div class="tour-hole" id="tour-hole"></div>' +
      '<div class="tour-card" id="tour-card">' +
      '<div class="tour-caret" id="tour-caret"></div>' +
      '<div class="tour-card-top"><div class="tour-count">' + (state.spotIndex + 1) + " / " + spots.length + "</div></div>" +
      '<div class="tour-card-scroll">' +
      "<h3>" + escapeHtml(spot.titleZh) + "</h3>" +
      '<p class="tour-k">' + escapeHtml(t("fill")) + "</p>" +
      renderRich(spot.fill || spot.what || "") +
      '<p class="tour-k">' + escapeHtml(t("format")) + "</p>" +
      '<div class="tour-format">' + renderRich(spot.format || spot.why || "") + "</div>" +
      "</div>" +
      '<div class="tour-card-actions">' +
      '<button type="button" class="tour-prev" data-action="tour-prev"' + (state.spotIndex === 0 ? " disabled" : "") + ">" + escapeHtml(t("tourPrev")) + "</button>" +
      '<button type="button" class="tour-next" data-action="tour-next">' + nextLabel + "</button>" +
      "</div></div></div>"
    );
  }

  function targetElements(spot) {
    if (!spot) return [];
    if (spot.target === "banner") return [document.querySelector(".banner")].filter(Boolean);
    if (spot.target === "section-intro") return [document.querySelector(".section-intro")].filter(Boolean);
    if (spot.target === "sidebar") return [document.querySelector(".sidebar")].filter(Boolean);
    if (spot.target === "footer") return [document.querySelector(".footer")].filter(Boolean);
    if (spot.target === "step-head") return [document.querySelector(".step-head")].filter(Boolean);
    return (spot.fieldIds || [])
      .map(function (id) { return document.querySelector('[data-field="' + id + '"]'); })
      .filter(Boolean);
  }

  function unionRect(els) {
    if (!els.length) return null;
    var r = els[0].getBoundingClientRect();
    var top = r.top, left = r.left, right = r.right, bottom = r.bottom;
    els.slice(1).forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (b.top < top) top = b.top;
      if (b.left < left) left = b.left;
      if (b.right > right) right = b.right;
      if (b.bottom > bottom) bottom = b.bottom;
    });
    return { top: top, left: left, width: right - left, height: bottom - top };
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function chromeSafe() {
    var top = 8;
    var header = document.querySelector(".header");
    var banner = document.querySelector(".banner");
    var footer = document.querySelector(".footer");
    if (header) top = Math.max(top, header.getBoundingClientRect().bottom);
    if (banner) top = Math.max(top, banner.getBoundingClientRect().bottom);
    top += 8;
    var bottom = window.innerHeight - 8;
    if (footer) {
      var fb = footer.getBoundingClientRect();
      if (fb.height > 0 && fb.top < window.innerHeight) bottom = Math.min(bottom, fb.top - 8);
    }
    return { top: top, bottom: bottom, left: 8, right: window.innerWidth - 8 };
  }

  function positionTour() {
    if (state.unlocked) return;
    if (tourPositioning) return;
    tourPositioning = true;
    var holeEl = document.getElementById("tour-hole");
    var card = document.getElementById("tour-card");
    var caret = document.getElementById("tour-caret");
    if (!holeEl || !card || !holeEl.style || !card.style) {
      tourPositioning = false;
      return;
    }
    var spot = currentSpot();
    var els = targetElements(spot);
    if (spot && spot.target === "sidebar") {
      var cur = document.querySelector(".step-btn.is-tour-current") || document.querySelector(".step-btn.is-current");
      els = [document.querySelector(".progress-top"), cur].filter(Boolean);
      if (!els.length) els = [document.querySelector(".sidebar")].filter(Boolean);
      revealCurrentStepInSidebar();
    } else if (els[0]) {
      var mainPane = document.querySelector(".main-scroll");
      var safePre = chromeSafe();
      var fieldRect = els[0].getBoundingClientRect();
      var alreadyAtTop = fieldRect.top >= safePre.top - 4 && fieldRect.top <= safePre.top + 28;
      var inSafe = fieldRect.top >= safePre.top && fieldRect.bottom <= safePre.bottom;
      if (!alreadyAtTop && !inSafe && mainPane) {
        mainPane.scrollTop += fieldRect.top - safePre.top - 16;
      }
    }
    var safe = chromeSafe();
    var rect = unionRect(els) || { top: 140, left: 40, width: 280, height: 72 };
    if (els.length > 1 && rect.height > 220) {
      var first = els[0].getBoundingClientRect();
      rect = { top: first.top, left: first.left, width: first.width, height: first.height };
    }
    var scroller = document.querySelector(".main-scroll");
    if (scroller && rect.top < safe.top - 4) {
      scroller.scrollTop += rect.top - safe.top - 12;
      rect = unionRect(els) || rect;
    }

    var maxHoleH = Math.max(72, Math.min(rect.height, (safe.bottom - safe.top) * 0.36));
    var hole = {
      top: clamp(rect.top - 8, safe.top, safe.bottom - 48),
      left: clamp(rect.left - 8, 8, window.innerWidth - 40),
      width: clamp(rect.width + 16, 48, window.innerWidth - 16),
      height: clamp(maxHoleH + 16, 48, Math.max(48, safe.bottom - safe.top - 160))
    };
    if (hole.top + hole.height > safe.bottom) hole.height = Math.max(48, safe.bottom - hole.top);
    holeEl.style.top = hole.top + "px";
    holeEl.style.left = hole.left + "px";
    holeEl.style.width = hole.width + "px";
    holeEl.style.height = hole.height + "px";

    var gap = 12;
    var cardW = card.offsetWidth || 360;
    var cardH = card.offsetHeight || 220;
    var below = safe.bottom - (hole.top + hole.height) - gap;
    var above = hole.top - safe.top - gap;
    var right = safe.right - (hole.left + hole.width) - gap;
    var leftGap = hole.left - safe.left - gap;
    var scores = { below: below, right: right, above: above, left: leftGap };
    var order = (spot && spot.target === "sidebar") ? ["right", "below", "above", "left"] : ["below", "right", "above", "left"];
    var needH = Math.min(cardH, 150);
    var needW = Math.min(cardW, 220);
    var dir = null;
    var i;
    for (i = 0; i < order.length; i++) {
      var d = order[i];
      if ((d === "below" || d === "above") && scores[d] >= needH) { dir = d; break; }
      if ((d === "right" || d === "left") && scores[d] >= needW) { dir = d; break; }
    }
    if (!dir) {
      dir = order[0];
      for (i = 1; i < order.length; i++) {
        if (scores[order[i]] > scores[dir]) dir = order[i];
      }
    }

    var top;
    var left;
    if (dir === "below") {
      top = hole.top + hole.height + gap;
      left = clamp(hole.left, safe.left, safe.right - cardW);
    } else if (dir === "above") {
      top = hole.top - gap - cardH;
      left = clamp(hole.left, safe.left, safe.right - cardW);
    } else if (dir === "right") {
      left = hole.left + hole.width + gap;
      top = clamp(hole.top, safe.top, safe.bottom - cardH);
    } else {
      left = hole.left - gap - cardW;
      top = clamp(hole.top, safe.top, safe.bottom - cardH);
    }
    top = clamp(top, safe.top, Math.max(safe.top, safe.bottom - cardH));
    left = clamp(left, safe.left, Math.max(safe.left, safe.right - cardW));

    var cardBox = { top: top, left: left, width: cardW, height: cardH };
    var overlap = !(cardBox.left + cardBox.width < hole.left ||
      hole.left + hole.width < cardBox.left ||
      cardBox.top + cardBox.height < hole.top ||
      hole.top + hole.height < cardBox.top);
    if (overlap) {
      if (right >= needW) {
        dir = "right";
        left = hole.left + hole.width + gap;
        top = clamp(hole.top, safe.top, safe.bottom - cardH);
      } else if (below >= 80) {
        dir = "below";
        top = hole.top + hole.height + gap;
        left = clamp(hole.left, safe.left, safe.right - cardW);
      }
      top = clamp(top, safe.top, Math.max(safe.top, safe.bottom - cardH));
      left = clamp(left, safe.left, Math.max(safe.left, safe.right - cardW));
    }

    card.style.top = top + "px";
    card.style.left = left + "px";
    if (caret && caret.style) {
      var cx = 24;
      var cy = 24;
      if (dir === "below" || dir === "above") {
        cx = clamp(hole.left + hole.width / 2 - left - 6, 16, Math.max(16, cardW - 24));
        caret.style.left = cx + "px";
        caret.style.right = "auto";
        caret.style.top = dir === "below" ? "-6px" : (cardH - 6) + "px";
      } else {
        cy = clamp(hole.top + Math.min(hole.height, cardH) / 2 - top - 6, 16, Math.max(16, cardH - 24));
        caret.style.top = cy + "px";
        caret.style.left = dir === "right" ? "-6px" : (cardW - 6) + "px";
        caret.style.right = "auto";
      }
    }
    tourPositioning = false;
  }

  function renderSidebar() {
    var pct = Math.round(((currentIndex() + 1) / steps.length) * 100);
    var html =
      '<div class="sidebar-scroll">' +
      '<div class="progress-top"><div class="label">Product progress</div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>';
    sections.forEach(function (section) {
      var inSection = steps.filter(function (s) { return s.sectionId === section.id; });
      if (!inSection.length) return;
      html += '<div class="section-block"><div class="section-label">' + escapeHtml(section.labelEn) + "</div>";
      inSection.forEach(function (step) {
        var current = step.id === state.stepId ? " is-current" : "";
        var visited = state.visited.has(step.id) ? " is-visited" : "";
        var tourCur = (!state.unlocked && currentSpot() && currentSpot().stepId === step.id) ? " is-tour-current" : "";
        html +=
          '<button type="button" class="step-btn' + current + visited + tourCur + '" data-go="' + escapeHtml(step.id) + '">' +
          '<span class="step-text"><span class="step-en">' + escapeHtml(step.labelEn) +
          '</span><span class="step-zh">' + escapeHtml(step.labelZh || "") + "</span></span>" +
          "</button>";
      });
      html += "</div>";
    });
    html += "</div>";

    var questions = (learning.beforeListingQuestions || [])
      .map(function (q) { return "<li>" + escapeHtml(q.zh) + "</li>"; })
      .join("");
    var principles = (learning.principlesZh || [])
      .map(function (p) { return "<li>" + escapeHtml(p) + "</li>"; })
      .join("");
    html +=
      '<div class="ask-panel">' +
      '<button type="button" class="ask-toggle" data-action="toggle-ask">' +
      "<span>上架前先问自己</span><span>" + (state.askOpen ? "▾" : "▸") + "</span></button>" +
      (state.askOpen
        ? '<ul class="ask-principles">' + principles + '</ul><ol class="ask-list">' + questions + "</ol>"
        : "") +
      "</div>";
    return html;
  }

  function splitSearchTokens(text) {
    var raw = String(text || "").toLowerCase();
    var out = [];
    var buf = "";
    function flush() {
      if (buf) { out.push(buf); buf = ""; }
    }
    var i;
    for (i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      var code = raw.charCodeAt(i);
      var latin = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
      var cjk = code >= 0x3400;
      if (latin || cjk) buf += ch;
      else flush();
    }
    flush();
    return out;
  }

  function tokenPrefixScore(token, q) {
    if (!token || !q) return 0;
    if (token === q) return 100;
    if (token.indexOf(q) === 0) return 70;
    return 0;
  }

  function bestTokenScore(tokens, q, weight) {
    var best = 0;
    var i;
    for (i = 0; i < tokens.length; i++) {
      var s = tokenPrefixScore(tokens[i], q) * weight;
      if (s > best) best = s;
    }
    return best;
  }

  function searchFields(q) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return [];
    var hits = [];
    steps.forEach(function (step) {
      (step.fields || []).forEach(function (f) {
        var labelTokens = splitSearchTokens(f.labelEn + " " + (step.labelEn || "") + " " + (step.labelZh || ""));
        var aliasTokens = splitSearchTokens((SEARCH_ZH[f.id] || "") + " " + f.id);
        var score = 0;
        score = Math.max(score, bestTokenScore(labelTokens, q, 1.2));
        score = Math.max(score, bestTokenScore(aliasTokens, q, 1));
        if (f.id.toLowerCase() === q) score = Math.max(score, 110);
        if (score > 0) {
          hits.push({
            stepId: step.id,
            fieldId: f.id,
            label: f.labelEn,
            stepLabel: step.labelEn,
            score: score,
          });
        }
      });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, 10);
  }

  function searchPanelHtml(q) {
    if (!String(q || "").trim()) return "";
    var hits = searchFields(q);
    if (!hits.length) return '<div class="search-empty">' + escapeHtml(t("searchEmpty")) + "</div>";
    return '<ul class="search-hits">' + hits.map(function (h) {
      return (
        '<li><button type="button" class="search-hit" data-action="jump-field" data-step="' +
        escapeHtml(h.stepId) + '" data-field="' + escapeHtml(h.fieldId) + '">' +
        "<strong>" + escapeHtml(h.label) + "</strong>" +
        '<span>' + escapeHtml(h.stepLabel) + "</span></button></li>"
      );
    }).join("") + "</ul>";
  }

  function updateSearchPanel() {
    var panel = document.getElementById("field-search-panel");
    if (!panel) return;
    panel.innerHTML = searchPanelHtml(state.searchQ);
    panel.hidden = !String(state.searchQ || "").trim();
  }

  function renderSearch() {
    if (!state.unlocked) return "";
    return (
      '<div class="field-search">' +
      '<input class="search-input" type="search" data-role="field-search" autocomplete="off" placeholder="' +
      escapeHtml(t("searchPh")) + '" value="' + escapeHtml(state.searchQ) + '" />' +
      '<div class="search-panel" id="field-search-panel"' +
      (String(state.searchQ || "").trim() ? "" : " hidden") + ">" +
      searchPanelHtml(state.searchQ) +
      "</div></div>"
    );
  }

  function renderHeader() {
    var logo = '<img class="brand-logo" src="assets/viator-logo.svg" alt="Viator" />';
    var pct = Math.round(((currentIndex() + 1) / steps.length) * 100);
    var banner = state.lang === "en" ? (learning.bannerEn || learning.bannerZh) : learning.bannerZh;
    return (
      '<header class="header">' +
      '<button type="button" class="menu-btn" data-action="toggle-sidebar">Steps</button>' +
      '<div class="brand">' + logo + "</div>" +
      '<div class="header-product">' +
      '<span class="hw-kicker">New product</span><span class="hw-spacer">|</span>' +
      '<span class="hw-name">' + escapeHtml(product.title) + "</span>" +
      '<span class="replica-pill">TRAINING</span></div>' +
      '<div class="header-actions">' +
      '<button type="button" class="lang-btn" data-action="toggle-lang">' + escapeHtml(t("langBtn")) + "</button>" +
      (state.unlocked ? '<button type="button" class="restart-btn" data-action="restart-tour">' + escapeHtml(t("restart")) + "</button>" : "") +
      '<button type="button" class="save-exit" disabled>Save &amp; exit</button></div>' +
      "</header>" +
      '<div class="top-progress" aria-hidden="true"><div class="top-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="banner" role="note"><strong>Training replica · 非真实后台.</strong> ' +
      escapeHtml(banner) + "</div>" +
      renderSearch()
    );
  }

  function renderFooter() {
    var i = currentIndex();
    var prev = i > 0 ? steps[i - 1] : null;
    var next = i < steps.length - 1 ? steps[i + 1] : null;
    return (
      '<footer class="footer">' +
      '<div class="footer-actions">' +
      '<button type="button" class="btn btn-secondary" data-action="' + (state.unlocked ? "prev" : "tour-prev") + '"' +
      ((state.unlocked ? prev : state.spotIndex > 0) ? "" : " disabled") + ">Back</button>" +
      (state.unlocked
        ? (state.stepId === "basics.smartCreator"
          ? ""
          : (next
            ? '<button type="button" class="btn btn-primary" data-action="next">Save &amp; continue</button>'
            : '<button type="button" class="btn btn-primary" disabled>Submit for review</button>'))
        : '<button type="button" class="btn btn-primary" data-action="tour-next">' +
          (state.spotIndex >= spots.length - 1 ? t("tourDone") : t("tourNext")) + "</button>") +
      "</div></footer>"
    );
  }

  var SECTION_INTROS = {
    basics: {
      title: "Step 1 of 5: Basics",
      body: "First, select the language you will use to input your product details, then create a title and select your product category. You can also add photos in this section.",
      image: "assets/basics-intro.png",
    },
    productContent: {
      title: "Step 2 of 5: Product content",
      body: "Add meeting and pickup, ticket details, languages, inclusions, and the information travelers need from you.",
      image: "assets/basics-intro.png",
    },
    schedulesPricing: {
      title: "Step 3 of 5: Schedules & pricing",
      body: "Set traveler types, product options, and supplier prices. Do not paste guest-facing retail prices into supplier fields.",
      image: "assets/basics-intro.png",
    },
    bookingTickets: {
      title: "Step 4 of 5: Booking & tickets",
      body: "Choose booking cutoff, cancellation, required traveler information, and how each ticket is redeemed.",
      image: "assets/basics-intro.png",
    },
    finish: {
      title: "Step 5 of 5: Finish",
      body: "Connect to a Tripadvisor listing if needed, then submit your product for review. In this training replica the submit button stays disabled.",
      image: "assets/basics-intro.png",
    },
  };

  var STEP_TITLES = {
    "basics.creationType": {
      title: "Let's build your product",
      subtitle: "Create your product manually, or save time with Smart Creator, which uses content suggestions to help you get started faster.",
    },
    "basics.smartCreator": {
      title: "Create your product with AI",
      subtitle: "Simply copy and paste a URL, or enter existing product details. We’ll start to generate a new listing using the details provided—and all you need to do is just review and refine as needed.",
    },
    "basics.title": {
      title: "Let's get started",
      subtitle: "",
    },
    "basics.categorization": {
      title: "What type of product are you creating?",
      subtitle: "Please choose carefully as it impacts the following sections and you won't be able to edit this later.",
    },
    "basics.theme": {
      title: "Choose up to 3 themes that best describe this product",
      subtitle: "Increase your visibility in traveler searches by selecting all 3 themes.",
    },
    "basics.photos": {
      title: "Add Photos",
      subtitle: "Photos strongly influence what travelers book. Add 6+ high-quality photos that help travelers picture themselves in your experience.",
    },
    "content.pickup": {
      title: "Tell us how and where you meet your travelers",
      subtitle: "",
    },
    "content.ticketDetails": {
      title: "Tell us about your ticket",
      subtitle: "Be sure to enter all key attractions in your itinerary. This helps travelers find and book your experience.",
    },
    "content.languages": {
      title: "Tell us about the guides provided",
      subtitle: "",
    },
    "content.inclusions": {
      title: "What is and isn't included?",
      subtitle: "List everything included and excluded from the price. Specify any additional costs travelers will need to pay in-destination.",
    },
    "content.unique": {
      title: "What sets your ticket or pass apart?",
      subtitle: "",
    },
    "content.travelerInfo": {
      title: "What should travelers know before they book?",
      subtitle: "This information will help travelers know if this is a good ticket/pass for them.",
    },
    "pricing.travelerDetails": {
      title: "Let's start with how you price your product",
      subtitle: "",
    },
    "pricing.schedules": {
      title: "Create pricing schedules",
      subtitle: "",
    },
    "booking.process": {
      title: "Now let's customize your booking process",
      subtitle: "",
    },
    "booking.cancellation": {
      title: "Your cancellation policy",
      subtitle: "",
    },
    "booking.requiredInfo": {
      title: "Do you need any extra information from travelers?",
      subtitle: "",
    },
    "tickets.builder": {
      title: "Let's set up your tickets",
      subtitle: "We issue tickets for every booking so travelers have easy access to important information on the day of travel.",
    },
    "tickets.redemption": {
      title: "Add details about your ticket redemption",
      subtitle: "",
    },
    "tickets.preview": {
      title: "Here's a preview of your tickets",
      subtitle: "Add your company logo (optional).",
    },
    "finish.tripadvisor": {
      title: "Connect to Tripadvisor Listing",
      subtitle: "",
    },
    "finish.submit": {
      title: "Submit your product for review",
      subtitle: "",
    },
  };

  function renderMain() {
    var step = currentStep();
    var section = sections.find(function (s) { return s.id === step.sectionId; });
    var spot = currentSpot();
    if (!state.unlocked && spot && spot.target === "section-intro") {
      var intro = SECTION_INTROS[spot.sectionId || (section && section.id)] || SECTION_INTROS.basics;
      return (
        '<div class="main-scroll">' +
        '<div class="section-intro" data-tour-target="section-intro">' +
        '<div class="section-intro-copy">' +
        '<div class="section-intro-title">' + escapeHtml(intro.title) + "</div>" +
        '<div class="section-intro-body">' + escapeHtml(intro.body) + "</div>" +
        '<button type="button" class="btn btn-primary intro-next" data-action="tour-next">Next</button>' +
        "</div>" +
        '<div class="section-intro-image"><img src="' + escapeHtml(intro.image) + '" alt="" /></div>' +
        "</div></div>"
      );
    }
    var titles = STEP_TITLES[step.id] || {
      title: step.labelEn,
      subtitle: step.summaryZh || "",
    };
    var fields = (step.fields || []).map(function (field) { return renderField(step, field); }).join("");
    return (
      '<div class="main-scroll">' +
      '<div class="step-head">' +
      "<h1>" + escapeHtml(titles.title) + "</h1>" +
      (titles.subtitle ? '<p class="summary">' + escapeHtml(titles.subtitle) + "</p>" : "") +
      "</div>" +
      '<div class="form-card">' + fields + "</div>" +
      "</div>" +
      renderFooter()
    );
  }

  function selectIdForSpot(spot) {
    var ids = (spot && spot.fieldIds) || [];
    var map = {
      themes: "themeCategory",
      hasPickup: "pickupOption",
      duration: "durationUnit",
      inputLanguage: "inputLanguage",
      smartCreatorSkipped: "smartCreatorTone",
      cutoffType: "cutoffType",
      confirmationMethod: "confirmationMethod",
    };
    var si;
    for (si = 0; si < ids.length; si++) {
      if (map[ids[si]]) return map[ids[si]];
    }
    return null;
  }

  function resetSelectForSpot() {
    state.selectClosedByUser = false;
    state.openSelectId = null;
  }

  function autoOpenSelectForTour() {
    if (state.unlocked) return;
    if (state.selectClosedByUser) return;
    var id = selectIdForSpot(currentSpot());
    if (id) state.openSelectId = id;
  }

  function render() {
    autoOpenSelectForTour();
    var step = currentStep();
    var prevSide = document.querySelector(".sidebar-scroll");
    var prevMain = document.querySelector(".main-scroll");
    var savedSide = prevSide ? prevSide.scrollTop : 0;
    var savedMain = prevMain ? prevMain.scrollTop : 0;
    var stepChanged = lastRenderedStepId !== state.stepId;
    lastRenderedStepId = state.stepId;
    var html =
      '<div class="page">' +
      renderHeader() +
      '<div class="body">' +
      (state.sidebarOpen ? '<div class="sidebar-backdrop" data-action="close-sidebar"></div>' : "") +
      '<aside class="sidebar' + (state.sidebarOpen ? " is-open" : "") + '">' + renderSidebar() + "</aside>" +
      '<section class="main">' + renderMain() + "</section>" +
      "</div>" +
      renderTourLayer() +
      renderGuideDrawer() +
      "</div>";
    document.getElementById("app").innerHTML = html;
    document.title = step.labelEn + " · Viator training replica";
    document.body.classList.toggle("is-touring", !state.unlocked && spots.length > 0);
    var sidePane = document.querySelector(".sidebar-scroll");
    if (sidePane) sidePane.scrollTop = savedSide;
    if (stepChanged || state.highlightFieldId) resetMainScroll();
    else {
      var mainPane = document.querySelector(".main-scroll");
      if (mainPane) mainPane.scrollTop = savedMain;
    }
    revealCurrentStepInSidebar();
    requestAnimationFrame(function () {
      positionTour();
      requestAnimationFrame(function () {
        positionTour();
        if (state.highlightFieldId) {
          var hit = document.querySelector('[data-field="' + state.highlightFieldId + '"]');
          if (hit) scrollPaneToShow(document.querySelector(".main-scroll"), hit, "start");
        }
      });
    });
  }

  document.getElementById("app").addEventListener("compositionstart", function (ev) {
    if (ev.target && ev.target.getAttribute("data-role") === "field-search") state.searchComposing = true;
  });
  document.getElementById("app").addEventListener("compositionend", function (ev) {
    if (!ev.target || ev.target.getAttribute("data-role") !== "field-search") return;
    state.searchComposing = false;
    state.searchQ = ev.target.value;
    updateSearchPanel();
  });
  document.getElementById("app").addEventListener("input", function (ev) {
    if (!ev.target || ev.target.getAttribute("data-role") !== "field-search") return;
    state.searchQ = ev.target.value;
    if (state.searchComposing) return;
    updateSearchPanel();
  });

  document.getElementById("app").addEventListener("click", function (ev) {
    var target = ev.target.closest("[data-go], [data-action]");
    if (!target) return;
    var go = target.getAttribute("data-go");
    if (go) {
      if (target.focus) {
        try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
      }
      goTo(go);
      state.sidebarOpen = false;
      return;
    }
    var action = target.getAttribute("data-action");
    var i = currentIndex();
    if (action === "prev" && i > 0) goTo(steps[i - 1].id);
    if (action === "next" && i < steps.length - 1) goTo(steps[i + 1].id);
    if (action === "toggle-ask") {
      state.askOpen = !state.askOpen;
      render();
    }
    if (action === "toggle-sidebar") {
      state.sidebarOpen = !state.sidebarOpen;
      render();
    }
    if (action === "close-sidebar") {
      state.sidebarOpen = false;
      render();
    }
    if (action === "tour-next") tourNext();
    if (action === "tour-prev") tourPrev();
    if (action === "restart-tour") restartTour();
    if (action === "close-guide") {
      state.guideFieldId = null;
      render();
    }
    if (action === "open-guide") {
      if (!state.unlocked) return;
      state.guideFieldId = target.getAttribute("data-guide");
      render();
    }
    if (action === "toggle-lang") {
      state.lang = state.lang === "en" ? "zh" : "en";
      persist();
      render();
    }
    if (action === "jump-field") {
      ev.preventDefault();
      var jumpStep = target.getAttribute("data-step");
      var jumpField = target.getAttribute("data-field");
      state.searchQ = "";
      state.searchComposing = false;
      state.highlightFieldId = jumpField;
      goTo(jumpStep);
    }
    if (action === "toggle-select") {
      ev.preventDefault();
      ev.stopPropagation();
      var sid = target.getAttribute("data-select");
      if (state.openSelectId === sid) {
        state.openSelectId = null;
        state.selectClosedByUser = true;
      } else {
        state.openSelectId = sid;
        state.selectClosedByUser = false;
      }
      render();
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (state.unlocked) return;
    var tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (ev.key === "Enter" || ev.key === "ArrowRight") {
      ev.preventDefault();
      tourNext();
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      tourPrev();
    }
  });

  document.addEventListener("wheel", function (ev) {
    if (state.unlocked) return;
    var card = ev.target && ev.target.closest && ev.target.closest("#tour-card");
    if (!card) return;
    var pane = document.querySelector(".main-scroll");
    if (!pane) return;
    var inner = card.querySelector(".tour-card-scroll");
    if (inner && inner.scrollHeight > inner.clientHeight + 4) {
      var atTop = inner.scrollTop <= 0 && ev.deltaY < 0;
      var atBot = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1 && ev.deltaY > 0;
      if (!atTop && !atBot) return;
    }
    ev.preventDefault();
    pane.scrollTop += ev.deltaY;
  }, { passive: false });

  window.addEventListener("resize", function () { positionTour(); });
  document.addEventListener("scroll", function () { positionTour(); }, true);

  window.addEventListener("hashchange", function () {
    var hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (hash && hash !== state.stepId) goTo(hash);
  });

  persist();
  render();
})();
