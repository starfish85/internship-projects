/* Auto-generated from data/*.json. Run: python3 scripts/build-data.py */
window.APP_DATA = {
  "steps": {
    "schemaVersion": "0.1.0",
    "productTypesReserved": [
      "ticket",
      "transfer",
      "charter"
    ],
    "ui": {
      "primarySurface": "draft_wizard",
      "language": {
        "chrome": "en",
        "guidance": "zh"
      },
      "note": "阶段A只做草稿向导只读仿真。已上线Tab对照见字段与步骤对照.md。"
    },
    "sections": [
      {
        "id": "basics",
        "labelEn": "Basics",
        "labelZh": "基础信息"
      },
      {
        "id": "productContent",
        "labelEn": "Product content",
        "labelZh": "产品内容"
      },
      {
        "id": "schedulesPricing",
        "labelEn": "Schedules & pricing",
        "labelZh": "场次与价格"
      },
      {
        "id": "bookingTickets",
        "labelEn": "Booking & tickets",
        "labelZh": "预订与出票"
      },
      {
        "id": "finish",
        "labelEn": "Finish",
        "labelZh": "完成"
      }
    ],
    "steps": [
      {
        "id": "basics.creationType",
        "sectionId": "basics",
        "order": 1,
        "labelEn": "Creation type",
        "labelZh": "创建方式",
        "draftUrlHint": "/basicsWithCreationType/...",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "workflow_only",
        "summaryZh": "只决定怎么开始建草稿，不是客人看到的内容。",
        "fields": [
          {
            "id": "creationType",
            "labelEn": "Smart Creator vs Manual Creation",
            "required": true,
            "control": "radio"
          }
        ]
      },
      {
        "id": "basics.smartCreator",
        "sectionId": "basics",
        "order": 2,
        "labelEn": "Smart Creator",
        "labelZh": "智能生成",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "workflow_only",
        "summaryZh": "可用网址/说明生成初稿。本样例按已有产品展示，不需要做成真的生成器。",
        "fields": [
          {
            "id": "smartCreatorSkipped",
            "labelEn": "Generate or skip",
            "required": false,
            "control": "readonly"
          }
        ]
      },
      {
        "id": "basics.title",
        "sectionId": "basics",
        "order": 3,
        "labelEn": "Language and title",
        "labelZh": "语言与标题",
        "draftUrlHint": "/basicsWithCreationType/title",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "标题会出现在搜索和产品页。本产品用 Optional 表示地铁通票是加购。",
        "fields": [
          {
            "id": "inputLanguage",
            "labelEn": "Input language",
            "required": true,
            "control": "select"
          },
          {
            "id": "translationMode",
            "labelEn": "Translation mode",
            "required": true,
            "control": "radio"
          },
          {
            "id": "title",
            "labelEn": "Product title",
            "required": true,
            "control": "text"
          },
          {
            "id": "referenceCode",
            "labelEn": "Product reference code",
            "required": false,
            "control": "text"
          }
        ]
      },
      {
        "id": "basics.categorization",
        "sectionId": "basics",
        "order": 4,
        "labelEn": "Categorization",
        "labelZh": "分类",
        "draftUrlHint": "/basicsWithCreationType/productType",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "产品类型决定后面会出现哪些字段。门票、接送、包车不要选错。",
        "fields": [
          {
            "id": "productType",
            "labelEn": "Product type",
            "required": true,
            "control": "radio"
          },
          {
            "id": "itineraryType",
            "labelEn": "Itinerary type",
            "required": true,
            "control": "select"
          },
          {
            "id": "ticketPassType",
            "labelEn": "Ticket / pass type",
            "required": false,
            "control": "multi-select"
          }
        ]
      },
      {
        "id": "basics.theme",
        "sectionId": "basics",
        "order": 5,
        "labelEn": "Theme",
        "labelZh": "主题",
        "draftUrlHint": "/basicsWithCreationType/theme",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "最多 3 个主题，影响搜索筛选。",
        "fields": [
          {
            "id": "themes",
            "labelEn": "Themes (up to 3)",
            "required": true,
            "control": "multi-select"
          }
        ]
      },
      {
        "id": "basics.photos",
        "sectionId": "basics",
        "order": 6,
        "labelEn": "Photos",
        "labelZh": "照片",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "第一张通常是封面。训练页用公开样例图即可，不必上传文件。",
        "fields": [
          {
            "id": "coverPhoto",
            "labelEn": "Cover photo",
            "required": true,
            "control": "image"
          },
          {
            "id": "gallery",
            "labelEn": "Photo gallery and order",
            "required": true,
            "control": "image-list"
          }
        ]
      },
      {
        "id": "content.pickup",
        "sectionId": "productContent",
        "order": 7,
        "labelEn": "Meeting & pickup",
        "labelZh": "集合与接送",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "本门票样例无酒店接送，集合点是乐园本身。接送/包车后续会主要改这一步。",
        "fields": [
          {
            "id": "hasPickup",
            "labelEn": "Hotel pickup included?",
            "required": true,
            "control": "radio"
          },
          {
            "id": "meetingPoint",
            "labelEn": "Meeting point / attraction location",
            "required": true,
            "control": "text"
          },
          {
            "id": "dropoff",
            "labelEn": "Drop-off",
            "required": false,
            "control": "text"
          },
          {
            "id": "additionalPickupDetails",
            "labelEn": "Additional pickup details",
            "required": false,
            "control": "textarea"
          }
        ]
      },
      {
        "id": "content.ticketDetails",
        "sectionId": "productContent",
        "order": 8,
        "labelEn": "Ticket details",
        "labelZh": "门票 / 行程详情",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "门票类重点是 POI、主票有效期、景点说明。Duration 按主票能用多久，一日票填 1 day。",
        "fields": [
          {
            "id": "multipleAttractions",
            "labelEn": "Multiple attractions?",
            "required": true,
            "control": "radio"
          },
          {
            "id": "attraction",
            "labelEn": "Attraction / POI",
            "required": true,
            "control": "text"
          },
          {
            "id": "duration",
            "labelEn": "Duration",
            "required": true,
            "control": "text"
          },
          {
            "id": "attractionDescription",
            "labelEn": "Attraction description",
            "required": true,
            "control": "textarea"
          }
        ]
      },
      {
        "id": "content.languages",
        "sectionId": "productContent",
        "order": 9,
        "labelEn": "Languages offered",
        "labelZh": "讲解语言",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "纯门票通常没有导游。不要为了好看填一堆语言。",
        "fields": [
          {
            "id": "liveGuide",
            "labelEn": "Live guide",
            "required": true,
            "control": "radio"
          },
          {
            "id": "audioGuide",
            "labelEn": "Audio guide",
            "required": true,
            "control": "radio"
          },
          {
            "id": "writtenGuide",
            "labelEn": "Written guide",
            "required": true,
            "control": "radio"
          },
          {
            "id": "guideLanguages",
            "labelEn": "Guide languages",
            "required": false,
            "control": "multi-select"
          }
        ]
      },
      {
        "id": "content.inclusions",
        "sectionId": "productContent",
        "order": 10,
        "labelEn": "Inclusions & exclusions",
        "labelZh": "包含与不包含",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "先写两档都有的包含项；只某套餐才有的加括号「选择对应套餐才有」。",
        "fields": [
          {
            "id": "inclusions",
            "labelEn": "What's included",
            "required": true,
            "control": "list"
          },
          {
            "id": "exclusions",
            "labelEn": "What's excluded",
            "required": true,
            "control": "list"
          },
          {
            "id": "extraCostConfirm",
            "labelEn": "Extra-cost confirmation",
            "required": false,
            "control": "checkbox"
          }
        ]
      },
      {
        "id": "content.unique",
        "sectionId": "productContent",
        "order": 11,
        "labelEn": "What makes your product unique",
        "labelZh": "产品卖点 / 独特之处",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "本产品最重要的是「凭证不是入园票」和「可选地铁、无接送」。",
        "fields": [
          {
            "id": "briefDescription",
            "labelEn": "Main sales description",
            "required": true,
            "control": "textarea"
          },
          {
            "id": "skipTheLine",
            "labelEn": "Skip the line",
            "required": true,
            "control": "radio"
          }
        ]
      },
      {
        "id": "content.travelerInfo",
        "sectionId": "productContent",
        "order": 12,
        "labelEn": "Information travelers need from you",
        "labelZh": "出行须知",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "限制条件写这里。本样例日籍限制是整产品。换产品时以供应链适用人群为准。",
        "fields": [
          {
            "id": "resellerStatus",
            "labelEn": "Reseller status",
            "required": true,
            "control": "select"
          },
          {
            "id": "accessibility",
            "labelEn": "Accessibility",
            "required": false,
            "control": "textarea"
          },
          {
            "id": "healthRestrictions",
            "labelEn": "Health restrictions",
            "required": false,
            "control": "textarea"
          },
          {
            "id": "difficultyLevel",
            "labelEn": "Difficulty level",
            "required": false,
            "control": "select"
          },
          {
            "id": "phoneNumber",
            "labelEn": "Phone number",
            "required": false,
            "control": "text"
          },
          {
            "id": "additionalInfo",
            "labelEn": "Additional information",
            "required": false,
            "control": "list"
          }
        ]
      },
      {
        "id": "pricing.travelerDetails",
        "sectionId": "schedulesPricing",
        "order": 13,
        "labelEn": "Traveler details",
        "labelZh": "出行人与票种",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "年龄档必须能出票。本样例对齐东京迪士尼官方年龄；换产品对齐该景点官方票种。",
        "fields": [
          {
            "id": "priceType",
            "labelEn": "Price type",
            "required": true,
            "control": "select"
          },
          {
            "id": "ageGroups",
            "labelEn": "Age groups",
            "required": true,
            "control": "list"
          },
          {
            "id": "childAccompaniment",
            "labelEn": "Child accompaniment rule",
            "required": false,
            "control": "text"
          },
          {
            "id": "maxTravelers",
            "labelEn": "Max travelers per booking",
            "required": true,
            "control": "number"
          }
        ]
      },
      {
        "id": "pricing.schedules",
        "sectionId": "schedulesPricing",
        "order": 14,
        "labelEn": "Pricing schedules",
        "labelZh": "价格与 option",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "两个 option 卡片必做。可以展示供应商后台真实填价；完整日历可简化。不要用前台零售价冒充后台价。",
        "fields": [
          {
            "id": "options",
            "labelEn": "Product options",
            "required": true,
            "control": "option-cards"
          },
          {
            "id": "currency",
            "labelEn": "Product currency",
            "required": true,
            "control": "select"
          },
          {
            "id": "supplierPrices",
            "labelEn": "Supplier prices (from backend)",
            "required": false,
            "control": "readonly"
          },
          {
            "id": "priceMatrixNote",
            "labelEn": "Price matrix (simplified)",
            "required": false,
            "control": "readonly"
          }
        ]
      },
      {
        "id": "booking.process",
        "sectionId": "bookingTickets",
        "order": 15,
        "labelEn": "Booking process",
        "labelZh": "预订流程",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "截止收订时间和确认方式。影响能不能卖当天票。",
        "fields": [
          {
            "id": "cutoffType",
            "labelEn": "Cut-off type",
            "required": true,
            "control": "select"
          },
          {
            "id": "cutoffHours",
            "labelEn": "Cut-off hours",
            "required": true,
            "control": "number"
          },
          {
            "id": "confirmationMethod",
            "labelEn": "Confirmation method",
            "required": true,
            "control": "select"
          },
          {
            "id": "notificationEmail",
            "labelEn": "Notification email",
            "required": false,
            "control": "checkbox"
          }
        ]
      },
      {
        "id": "booking.cancellation",
        "sectionId": "bookingTickets",
        "order": 16,
        "labelEn": "Cancellation policy",
        "labelZh": "取消政策",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "门票类默认 All sales final。换产品仍先看采购能不能退。",
        "fields": [
          {
            "id": "cancellationPolicy",
            "labelEn": "Standard vs all-sales-final",
            "required": true,
            "control": "radio"
          },
          {
            "id": "badWeather",
            "labelEn": "Bad weather",
            "required": false,
            "control": "checkbox"
          },
          {
            "id": "notEnoughTravelers",
            "labelEn": "Not enough travelers",
            "required": false,
            "control": "checkbox"
          }
        ]
      },
      {
        "id": "booking.requiredInfo",
        "sectionId": "bookingTickets",
        "order": 17,
        "labelEn": "Traveler required information",
        "labelZh": "需要客人提供的信息",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "订票要收哪些资料。和核销、日籍限制有关。",
        "fields": [
          {
            "id": "requiredTravelerFields",
            "labelEn": "Required traveler fields",
            "required": true,
            "control": "multi-select"
          },
          {
            "id": "passportTiming",
            "labelEn": "Passport requirement timing",
            "required": false,
            "control": "select"
          }
        ]
      },
      {
        "id": "tickets.builder",
        "sectionId": "bookingTickets",
        "order": 18,
        "labelEn": "Ticket builder",
        "labelZh": "票种设置",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "电子票还是纸票、一张订单出几张票。",
        "fields": [
          {
            "id": "ticketType",
            "labelEn": "Ticket type",
            "required": true,
            "control": "select"
          },
          {
            "id": "ticketsPer",
            "labelEn": "Tickets per booking or traveler",
            "required": true,
            "control": "select"
          }
        ]
      },
      {
        "id": "tickets.redemption",
        "sectionId": "bookingTickets",
        "order": 19,
        "labelEn": "Ticket redemption",
        "labelZh": "核销说明",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "core",
        "summaryZh": "把每一种票的核销写清楚即可，不必按 option 拆两套模板。",
        "fields": [
          {
            "id": "separateEntryTicket",
            "labelEn": "Separate entry ticket?",
            "required": true,
            "control": "radio"
          },
          {
            "id": "redemptionInstructions",
            "labelEn": "Special ticket redemption instructions",
            "required": true,
            "control": "textarea"
          }
        ]
      },
      {
        "id": "tickets.preview",
        "sectionId": "bookingTickets",
        "order": 20,
        "labelEn": "Ticket preview",
        "labelZh": "票面预览",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "optional",
        "summaryZh": "第一版可简化成示意票面。",
        "fields": [
          {
            "id": "ticketPreview",
            "labelEn": "Mobile / paper preview",
            "required": false,
            "control": "readonly"
          },
          {
            "id": "companyLogo",
            "labelEn": "Company logo",
            "required": false,
            "control": "image"
          }
        ]
      },
      {
        "id": "finish.tripadvisor",
        "sectionId": "finish",
        "order": 21,
        "labelEn": "Connect Tripadvisor listing",
        "labelZh": "关联 Tripadvisor",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "optional",
        "summaryZh": "只展示状态，不要在训练页里操作真实 listing。",
        "fields": [
          {
            "id": "tripadvisorListing",
            "labelEn": "Tripadvisor listing",
            "required": false,
            "control": "readonly"
          }
        ]
      },
      {
        "id": "finish.submit",
        "sectionId": "finish",
        "order": 22,
        "labelEn": "Submit for review",
        "labelZh": "提交审核",
        "appliesToProductTypes": [
          "ticket",
          "transfer",
          "charter"
        ],
        "importance": "workflow_only",
        "summaryZh": "真实后台才会提交并可能涉及付费。训练页按钮必须禁用。",
        "fields": [
          {
            "id": "submitForReview",
            "labelEn": "Submit for review",
            "required": false,
            "control": "button-disabled"
          }
        ]
      }
    ]
  },
  "products": {
    "schemaVersion": "0.1.0",
    "activeProductId": "5514894P11",
    "productTypesReserved": [
      "ticket",
      "transfer",
      "charter"
    ],
    "products": [
      {
        "id": "5514894P11",
        "productType": "ticket",
        "status": "ACTIVE",
        "codes": {
          "live": "5514894P11",
          "draft": "5514894P513"
        },
        "sources": {
          "supplierLive": "https://supplier.viator.com/product/5514894P11",
          "supplierDraft": "https://supplier.viator.com/product/build/5514894P513/basicsWithCreationType/title",
          "cSideViator": "https://www.viator.com/tours/Tokyo/Tokyo-Disneyland-Entry-Ticket-with-Tokyo-Subway-Ticket/d334-5514894P11"
        },
        "title": "Tokyo Disneyland Ticket & Optional Tokyo Subway Pass",
        "values": {
          "creationType": {
            "value": "Manual Creation",
            "valueStatus": "inferred",
            "noteZh": "已有完整产品，训练页按手工创建后的结果展示。"
          },
          "smartCreatorSkipped": {
            "value": "Skipped / not used for this training replica",
            "valueStatus": "placeholder"
          },
          "inputLanguage": {
            "value": "English",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Product Setup: Input Language English。"
          },
          "translationMode": {
            "value": "Use automated translation (recommended)",
            "valueStatus": "inferred"
          },
          "title": {
            "value": "Tokyo Disneyland Ticket & Optional Tokyo Subway Pass",
            "valueStatus": "confirmed_c_side"
          },
          "referenceCode": {
            "value": null,
            "valueStatus": "todo_from_supplier_backend"
          },
          "productType": {
            "value": "Ticket/pass",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Categories: Product types Ticket/pass。"
          },
          "itineraryType": {
            "value": "Ticket/pass",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage: Product itinerary types Ticket/pass。"
          },
          "ticketPassType": {
            "value": [
              "Theme Park",
              "Cultural"
            ],
            "valueStatus": "confirmed_live",
            "noteZh": "P513 草稿 Categorization 已选 Theme Park、Cultural。Manage 现网展示 Ticket/passes Theme Park。"
          },
          "themes": {
            "value": [
              "Day",
              "Sunset",
              "Night"
            ],
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Categories & themes。"
          },
          "coverPhoto": {
            "value": "https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/17/0a/c0/04.jpg",
            "valueStatus": "confirmed_c_side",
            "noteZh": "前台公开图，仅训练展示。是否为后台封面需核对。"
          },
          "gallery": {
            "value": [
              "https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/17/0a/c0/04.jpg",
              "https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/15/25/cf/29.jpg"
            ],
            "valueStatus": "confirmed_c_side"
          },
          "hasPickup": {
            "value": false,
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Meeting & pickup: No, travelers go directly to the location。"
          },
          "meetingPoint": {
            "value": "Tokyo Disneyland, 1-1 Maihama, Maihama, Urayasu 279-0031 Chiba Prefecture",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Ticket details 地址。"
          },
          "dropoff": {
            "value": "This activity ends back at the meeting point.",
            "valueStatus": "confirmed_c_side"
          },
          "additionalPickupDetails": {
            "value": "No hotel pick-up or private transfer included. Public transportation options are available nearby.",
            "valueStatus": "inferred"
          },
          "multipleAttractions": {
            "value": false,
            "valueStatus": "inferred",
            "noteZh": "主景点是东京迪士尼乐园；地铁通票是交通加项，不是第二个景点。"
          },
          "attraction": {
            "value": "Tokyo Disneyland",
            "valueStatus": "confirmed_c_side"
          },
          "duration": {
            "value": "10 hours",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Ticket details: Total Duration 10 hours。这是 typically spend，不是票面有效期。"
          },
          "attractionDescription": {
            "value": "Tokyo Disneyland is a world-renowned theme park that offers a plethora of thrilling rides and immersive experiences, making it a dream destination for Disney enthusiasts.",
            "valueStatus": "confirmed_c_side",
            "noteZh": "来自分销页 itinerary 文案，后台原文可能更长或不同。"
          },
          "liveGuide": {
            "value": false,
            "valueStatus": "confirmed_live",
            "noteZh": "Manage: No language guides have been defined。"
          },
          "audioGuide": {
            "value": false,
            "valueStatus": "inferred"
          },
          "writtenGuide": {
            "value": false,
            "valueStatus": "inferred"
          },
          "guideLanguages": {
            "value": [],
            "valueStatus": "inferred"
          },
          "inclusions": {
            "value": [
              "1-day Tokyo Disneyland pass",
              "24-hour unlimited Tokyo Metro & Toei Subway Pass (only if the Ticket and Tokyo Subway Pass option is selected)"
            ],
            "valueStatus": "owner_confirmed",
            "noteZh": "现网产品级未写括号；训练页仍用括号示范，避免按 combo 写满。"
          },
          "exclusions": {
            "value": [
              "JR Lines (including Yamanote line) ticket",
              "Other private railways",
              "Other personal expenses"
            ],
            "valueStatus": "confirmed_c_side"
          },
          "extraCostConfirm": {
            "value": null,
            "valueStatus": "todo_from_supplier_backend"
          },
          "briefDescription": {
            "value": "IMPORTANT ENTRY POLICY - PLEASE READ:\n1. VOUCHER IS NOT A TICKET: The booking confirmation/voucher from this platform will NOT be accepted at the gates.\n2. OFFICIAL TICKETS REQUIRED: You must present the Official E-Tickets for entry. We will send them to your email and platform inbox within 7 days before your visit (please check your spam folder).\n\nEnjoy a 1-Day Tokyo Disneyland admission ticket and a 24-hour Tokyo Metro & Toei Subway Pass. Travel easily across Tokyo before or after your park visit with unlimited subway rides. Perfect for budget travellers seeking flexibility and convenience. No hotel pick-up included.\n\n1. 1-Day Tokyo Disneyland admission ticket (QR code entry)\n2. 24-hour unlimited rides on Tokyo Metro & Toei subway lines\n3. Save time and money with a convenient combo package\n4. Ideal for budget and independent travellers\n5. No hotel pick-up or private transfer included",
            "valueStatus": "confirmed_c_side"
          },
          "skipTheLine": {
            "value": false,
            "valueStatus": "confirmed_live",
            "noteZh": "Manage: Skip the line access No。"
          },
          "resellerStatus": {
            "value": "Independent reseller",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Information travelers need。"
          },
          "accessibility": {
            "value": "Public transportation options are available nearby",
            "valueStatus": "inferred"
          },
          "healthRestrictions": {
            "value": null,
            "valueStatus": "todo_from_supplier_backend"
          },
          "difficultyLevel": {
            "value": "Easy — Most travelers can participate",
            "valueStatus": "confirmed_c_side"
          },
          "phoneNumber": {
            "value": "HK +852 3428 8182",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Your phone number。"
          },
          "additionalInfo": {
            "value": [
              "Public transportation options are available nearby",
              "Infants are required to sit on an adult’s lap",
              "Suitable for all physical fitness levels",
              "Need to exchange a physical subway ticket at major stations of the Tokyo Metro and Toei Subway.",
              "This offer is not available for Japanese passport holders (whole product, all options)"
            ],
            "valueStatus": "owner_confirmed",
            "noteZh": "日籍限制是整产品。换产品时不要默认所有日本门票都有这条。"
          },
          "priceType": {
            "value": "Per person",
            "valueStatus": "confirmed_live",
            "noteZh": "P513 Traveler details: How do you price your product? Per person。"
          },
          "ageGroups": {
            "value": [
              "Adults: 18–99",
              "Youth: 12–17",
              "Children: 4–11"
            ],
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Booking details → Pricing Type。Infant 未单独挂价。"
          },
          "childAccompaniment": {
            "value": "Infants are required to sit on an adult’s lap",
            "valueStatus": "inferred"
          },
          "maxTravelers": {
            "value": 15,
            "valueStatus": "confirmed_live",
            "noteZh": "Manage: Max travelers per booking 15。"
          },
          "currency": {
            "value": "HKD",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Schedules: prices set in HKD。"
          },
          "priceMatrixNote": {
            "value": "Copy real supplier-backend prices into the training replica (allowed). Guest-facing C-side starting-from USD 59.60 / 64.94 is only a retail observation, not the supplier input.",
            "valueStatus": "owner_confirmed"
          },
          "supplierPrices": {
            "value": {
              "note": "SUGGESTED RETAIL PRICE + 26% commission; Connectivity synced; this login cannot edit price.",
              "Ticket and Tokyo Subway Pass (TG7)": {
                "schedule": "Jan 12, 2026 - Dec 31, 2027; Sun–Sat 9:00am",
                "Adult": "HK$967.06",
                "Youth": "HK$772.30",
                "Child": "HK$496.96"
              },
              "Ticket Only (No Subway Pass) (TG6)": {
                "schedule": "Thu 9:00am priced; other days No prices added",
                "Adult": "HK$885.14",
                "Youth": "HK$731.42",
                "Child": "HK$456.08"
              }
            },
            "valueStatus": "confirmed_live",
            "noteZh": "不要把客人页 starting-from 价当后台填入值。"
          },
          "cutoffType": {
            "value": "Relative to start time",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Booking process Cut-off time。"
          },
          "cutoffHours": {
            "value": 48,
            "valueStatus": "confirmed_live",
            "noteZh": "48 hours = 现网 Stop selling 2 days before start time。"
          },
          "confirmationMethod": {
            "value": "Instant confirmation (Recommended)",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Booking process。"
          },
          "notificationEmail": {
            "value": true,
            "valueStatus": "confirmed_live",
            "noteZh": "Manage: Notification emails for each booking Yes。"
          },
          "cancellationPolicy": {
            "value": "All sales final. Travelers will not receive any refund regardless of cancellation status.",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Cancellation policy。"
          },
          "badWeather": {
            "value": false,
            "valueStatus": "confirmed_live",
            "noteZh": "现网 Other post-booking policies: None。无需勾选。"
          },
          "notEnoughTravelers": {
            "value": false,
            "valueStatus": "confirmed_live",
            "noteZh": "现网 Other post-booking policies: None。无需勾选。"
          },
          "requiredTravelerFields": {
            "value": [
              "Full Names"
            ],
            "valueStatus": "confirmed_live",
            "noteZh": "自动收集 Lead Traveler's Name、Phone Number；另外要 Full Names。"
          },
          "passportTiming": {
            "value": null,
            "valueStatus": "todo_from_supplier_backend"
          },
          "ticketType": {
            "value": "Mobile or paper ticket accepted",
            "valueStatus": "confirmed_live"
          },
          "ticketsPer": {
            "value": "One per booking",
            "valueStatus": "confirmed_live",
            "noteZh": "前台写法，后台枚举名需核对。"
          },
          "separateEntryTicket": {
            "value": true,
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Tickets: Separate direct entry ticket will be delivered to traveler。"
          },
          "redemptionInstructions": {
            "value": "STOP: THIS VOUCHER IS NOT YOUR ENTRY TICKET!\nDo NOT scan this page at the attraction.\nOfficial E-Tickets (QR Codes) are sent to email and platform messages within 7 days before the visit.\nTokyo Disneyland: scan the official QR at the main entrance.\nTokyo Subway Pass: scan the official QR at Tokyo Metro / Toei gates; 24-hour starts at first entry; not valid on JR.",
            "valueStatus": "confirmed_live",
            "noteZh": "来自 Manage Tickets 核销原文。须知里另有「换实体地铁票」一句，两处口径不完全一致。"
          },
          "ticketPreview": {
            "value": "Simplified preview only in training UI.",
            "valueStatus": "placeholder"
          },
          "companyLogo": {
            "value": null,
            "valueStatus": "todo_from_supplier_backend"
          },
          "tripadvisorListing": {
            "value": "Reotrip Tokyo / Shinjuku, Tokyo",
            "valueStatus": "confirmed_live",
            "noteZh": "Manage Tripadvisor Listing。"
          },
          "submitForReview": {
            "value": "Disabled in training replica. Do not submit.",
            "valueStatus": "placeholder"
          }
        },
        "options": [
          {
            "id": "ticket-only",
            "name": "Ticket Only (No Subway Pass)",
            "valueStatus": "confirmed_c_side",
            "values": {
              "duration": {
                "value": "1 day",
                "valueStatus": "confirmed_c_side"
              },
              "description": {
                "value": "1-Day Tokyo Disneyland Ticket: Admission ticket only; no hotel pick-up or transfer.",
                "valueStatus": "confirmed_c_side"
              },
              "inclusions": {
                "value": [
                  "1-day Tokyo Disneyland pass"
                ],
                "valueStatus": "inferred"
              },
              "cSidePriceFrom": {
                "value": "USD 59.60 starting from (guest-facing, not supplier input)",
                "valueStatus": "confirmed_c_side"
              }
            }
          },
          {
            "id": "ticket-and-subway",
            "name": "Ticket and Tokyo Subway Pass",
            "valueStatus": "confirmed_c_side",
            "values": {
              "duration": {
                "value": "1 day: Valid for one full day at Disneyland and 24-hour subway use.",
                "valueStatus": "confirmed_c_side"
              },
              "description": {
                "value": "Ticket + Tokyo Subway Pass: Includes 1-Day Tokyo Disneyland admission ticket and 24-hour Tokyo Metro & Toei Subway Pass.",
                "valueStatus": "confirmed_c_side"
              },
              "inclusions": {
                "value": [
                  "1-day Tokyo Disneyland pass",
                  "24-hour unlimited Tokyo Metro & Toei Subway Pass"
                ],
                "valueStatus": "inferred"
              },
              "cSidePriceFrom": {
                "value": "USD 64.94 starting from (guest-facing, not supplier input)",
                "valueStatus": "confirmed_c_side"
              }
            }
          }
        ]
      }
    ]
  },
  "learning": {
    "schemaVersion": "0.1.0",
    "usage": "阶段A起就要展示。运营学员常驻可见，不要藏进问号里才出现。",
    "bannerZh": "东京迪士尼只是入门样例。真实上架时，每个字段都要回到该产品的供应链信息判断，不要照抄这一页。",
    "bannerEn": "Tokyo Disneyland is a training example only. For a real listing, decide each field from that product's supply-chain facts — do not copy this page.",
    "principlesZh": [
      "后台字段是空壳，供应链才是内容来源。",
      "样例教你该问什么，不教你下一份产品也填同样的英文。",
      "填之前能讲清：主票是什么、能用多久、谁能买、怎么用、能不能退、哪些只在对应套餐才有。"
    ],
    "beforeListingQuestions": [
      {
        "id": "mainTicket",
        "zh": "主票到底是哪一张？哪个景点、哪个票种？"
      },
      {
        "id": "duration",
        "zh": "主票允许用多久？一日票可以填 1 day，两日票、兑换后有效的票不要套成 1 day。"
      },
      {
        "id": "options",
        "zh": "有几个套餐？哪些是可选加项，哪些是强制打包？"
      },
      {
        "id": "inclusions",
        "zh": "两档都有的包含项写在前面；只某套餐才有的，用括号写明选择对应套餐才有。"
      },
      {
        "id": "eligibility",
        "zh": "谁不能买？国籍/居住地限制是整产品限制还是某套餐限制？本样例是整产品不向日本护照持有人出售。"
      },
      {
        "id": "ageGroups",
        "zh": "年龄档是否对齐该景点或供应商官方票种？本样例必须对齐东京迪士尼官方年龄。"
      },
      {
        "id": "redemption",
        "zh": "每一种票怎么用？电子票、换票、凭证能不能入园，分别写清楚。"
      },
      {
        "id": "cancellation",
        "zh": "采购侧能不能退？公司门票类默认 All sales final，仍要先核对这一单。"
      },
      {
        "id": "pickup",
        "zh": "有没有接送？没有就不要写成 Transfer。"
      },
      {
        "id": "price",
        "zh": "供应商后台真实填价是多少？可以对照展示；不要把客人前台零售价当成后台填入值。"
      }
    ]
  },
  "fieldGuides": {
    "schemaVersion": "0.2.0",
    "usage": "指引只保留两块：此处填什么信息、建议文案格式。例句来自 2026-08-25 Manage P11 只读采集。东迪例句不是下一份产品的标准答案。",
    "global": {
      "exampleDisclaimerZh": "「建议文案格式」里的例句只属于东京迪士尼+地铁 5514894P11。下一份门票按供应链重写。",
      "sourceNoteZh": "来源：supplier.viator.com/product/5514894P11 的 Product content、Schedules & prices、Booking details、Tickets。"
    },
    "fields": {
      "title": {
        "status": "confirmed_live",
        "faqId": "B1",
        "labelEn": "Product title",
        "required": true,
        "draftZh": {
          "meaning": "填客人在搜索和产品页看到的英文主标题。",
          "rule": "景点名 + Ticket + Optional 加项。有加购才写 Optional，无车不要写 Transfer。\n现网：\n- Tokyo Disneyland Ticket & Optional Tokyo Subway Pass",
          "example": "Tokyo Disneyland Ticket & Optional Tokyo Subway Pass",
          "think": "供应链里主产品叫什么、加项是不是可选？没有地铁就不要写 Optional Subway；有接送才写 Transfer。",
          "mistakes": "写成中文；把地铁写成 Transfer；漏 Optional；堆砌折扣词；把东迪标题套到别的景点。",
          "fill": "填客人在搜索和产品页看到的英文主标题。",
          "format": "景点名 + Ticket + Optional 加项。有加购才写 Optional，无车不要写 Transfer。\n现网：\n- Tokyo Disneyland Ticket & Optional Tokyo Subway Pass"
        }
      },
      "referenceCode": {
        "status": "needs_owner",
        "faqId": "B2",
        "labelEn": "Product reference code",
        "required": false,
        "draftZh": {
          "meaning": "选填内部对照码，客人通常看不到。",
          "rule": "填采购 SKU / 内部编码。没有就空着。现网 Product Setup 未展示内部码。",
          "example": "",
          "think": "这一单内部用什么对照码（Bókun / 采购 SKU）？没有就空着，不要编。",
          "mistakes": "乱填一串和订单无关的数字。",
          "fill": "选填内部对照码，客人通常看不到。",
          "format": "填采购 SKU / 内部编码。没有就空着。现网 Product Setup 未展示内部码。"
        }
      },
      "productType": {
        "status": "confirmed_live",
        "faqId": "B3",
        "labelEn": "Product type",
        "required": true,
        "draftZh": {
          "meaning": "选产品大类，决定后面模块。",
          "rule": "草稿向导是大卡片：Tour / Activity / Ticket or pass / Rental / Transport。门票选 Ticket or pass。现网 Manage：Ticket/pass。不要因地铁加项改成 Transfer。",
          "example": "Ticket or pass",
          "think": "这一单卖的是票券、行程团、接送还是包车？类型选错，后面模块会整套跑偏。",
          "mistakes": "门票产品选成 Tour；接送选成 Ticket。",
          "fill": "选产品大类，决定后面模块。",
          "format": "草稿向导是大卡片：Tour / Activity / Ticket or pass / Rental / Transport。门票选 Ticket or pass。现网 Manage：Ticket/pass。不要因地铁加项改成 Transfer。"
        }
      },
      "themes": {
        "status": "confirmed_live",
        "faqId": "B4",
        "labelEn": "Themes",
        "required": true,
        "draftZh": {
          "meaning": "最多选 3 个主题，选和景点真实属性相关的，不要刷无关项。",
          "rule": "真后台是：先下拉选类目，再勾该类目下的主题。\n本产品现网类目 Time of Day，勾选：\n- Day\n- Sunset\n- Night",
          "example": "Day, Sunset, Night",
          "think": "这个景点在平台上客人会用哪些主题筛？最多 3 个，先问负责人有没有门票主题池。",
          "mistakes": "选满不相关主题刷曝光。",
          "fill": "最多选 3 个主题，选和景点真实属性相关的，不要刷无关项。",
          "format": "真后台是：先下拉选类目，再勾该类目下的主题。\n本产品现网类目 Time of Day，勾选：\n- Day\n- Sunset\n- Night"
        }
      },
      "coverPhoto": {
        "status": "draft_guess",
        "faqId": "C1",
        "labelEn": "Cover photo",
        "required": true,
        "draftZh": {
          "meaning": "列表和产品页第一张图。",
          "rule": "一眼能认出景点；去水印、去别家品牌和价格字。横图优先。现网 Photos +7。",
          "example": "公开前台图仅作训练展示。",
          "think": "供应链/官方有没有可用图？封面要一眼看出是哪个景点，不要带别家品牌或价格字。",
          "mistakes": "带 Klook/价格字/二维码；用无关图。",
          "fill": "列表和产品页第一张图。",
          "format": "一眼能认出景点；去水印、去别家品牌和价格字。横图优先。现网 Photos +7。"
        }
      },
      "hasPickup": {
        "status": "confirmed_live",
        "faqId": "D3",
        "labelEn": "Hotel pickup included?",
        "required": true,
        "draftZh": {
          "meaning": "勾选是否含酒店接送。真后台是下拉 Choose one。",
          "rule": "无车选：No, travelers go directly to the location。\n有可选接送选：Yes, pickup is optional。\n须和标题、卖点一致。",
          "example": "No, travelers go directly to the location",
          "think": "采购含不含车？不含就不要写 Transfer，集合点填景点。",
          "mistakes": "无接送却填一堆酒店区域；有接送却在卖点写 No pickup；把东迪的无接送抄到含接送的产品。",
          "fill": "勾选是否含酒店接送。真后台是下拉 Choose one。",
          "format": "无车选：No, travelers go directly to the location。\n有可选接送选：Yes, pickup is optional。\n须和标题、卖点一致。"
        }
      },
      "meetingPoint": {
        "status": "confirmed_live",
        "faqId": "D3",
        "labelEn": "Meeting point",
        "required": true,
        "draftZh": {
          "meaning": "客人自行前往的入园/集合地址。",
          "rule": "无接送填景点官方地址，不要填酒店。现网：Tokyo Disneyland, 1-1 Maihama, Maihama, Urayasu 279-0031 Chiba Prefecture。",
          "example": "Tokyo Disneyland, 1-1 Maihama, Maihama, Urayasu 279-0031 Chiba Prefecture",
          "think": "客人实际去哪入园或集合？无接送就填景点地址，不要抄酒店名。",
          "mistakes": "写成酒店名；只写 Tokyo。",
          "fill": "客人自行前往的入园/集合地址。",
          "format": "无接送填景点官方地址，不要填酒店。现网：Tokyo Disneyland, 1-1 Maihama, Maihama, Urayasu 279-0031 Chiba Prefecture。"
        }
      },
      "duration": {
        "status": "confirmed_live",
        "faqId": "E1",
        "labelEn": "Duration",
        "required": true,
        "draftZh": {
          "meaning": "填客人在这个景点通常待多久（typically spend / Total Duration）。",
          "rule": "真后台是数字 + 单位下拉（hours / days）。\n本产品现网填 10 hours。\n这不是票面有效期（一日票），也不要把地铁 24-hour 填进这一格。",
          "example": "10 hours",
          "think": "这张主票是一日、两日、下午票，还是兑换后 N 天有效？只看这一单采购/票面。",
          "mistakes": "把前台 10 hours 填进来；把地铁 24 小时当成乐园票时长；所有门票都抄 1 day。",
          "fill": "填客人在这个景点通常待多久（typically spend / Total Duration）。",
          "format": "真后台是数字 + 单位下拉（hours / days）。\n本产品现网填 10 hours。\n这不是票面有效期（一日票），也不要把地铁 24-hour 填进这一格。"
        }
      },
      "attractionDescription": {
        "status": "draft_guess",
        "faqId": "E2",
        "labelEn": "Attraction description",
        "required": true,
        "draftZh": {
          "meaning": "介绍景点/门票是什么。",
          "rule": "2–4 句英文：乐园是什么 + 含入园。不写核销和交通攻略。",
          "example": "前台 itinerary 有一段东京迪士尼简介。",
          "think": "这个 POI 是什么、票含不含入园？交通和换票细节放到须知或核销，不要写成攻略。",
          "mistakes": "复制整篇 Overview；不写 POI 只写促销。",
          "fill": "介绍景点/门票是什么。",
          "format": "2–4 句英文：乐园是什么 + 含入园。不写核销和交通攻略。"
        }
      },
      "liveGuide": {
        "status": "confirmed_live",
        "faqId": "F1",
        "labelEn": "Live guide",
        "required": true,
        "draftZh": {
          "meaning": "是否有真人导游。",
          "rule": "纯门票选 No。现网无导游语言。有导游再选 Yes 并补语言。",
          "example": "No language guides",
          "think": "采购含不含真人/语音/书面导游？纯门票通常全关，有导览再勾对应语言。",
          "mistakes": "没有导游却勾多种语言。",
          "fill": "是否有真人导游。",
          "format": "纯门票选 No。现网无导游语言。有导游再选 Yes 并补语言。"
        }
      },
      "inclusions": {
        "status": "confirmed_live",
        "faqId": "G1",
        "labelEn": "What's included",
        "required": true,
        "draftZh": {
          "meaning": "列出付钱后客人得到什么。一条一项。",
          "rule": "先写两档都有的；仅某套餐才有的加括号。现网产品级没写括号，训练示范加括号。\n现网例句：\n- 1-day Tokyo Disneyland pass\n- 24-hour unlimited Tokyo Metro & Toei Subway Pass (only if the Ticket and Tokyo Subway Pass option is selected)",
          "example": "1-day Tokyo Disneyland pass；24-hour subway pass (only if the Ticket and Tokyo Subway Pass option is selected)",
          "think": "打开套餐清单：哪些人人都有，哪些加购才有。不要按最贵那档写满。",
          "mistakes": "按完整 combo 写得好像每单都有地铁；括号不写套餐名；照抄东迪两行到没有地铁的产品。",
          "fill": "列出付钱后客人得到什么。一条一项。",
          "format": "先写两档都有的；仅某套餐才有的加括号。现网产品级没写括号，训练示范加括号。\n现网例句：\n- 1-day Tokyo Disneyland pass\n- 24-hour unlimited Tokyo Metro & Toei Subway Pass (only if the Ticket and Tokyo Subway Pass option is selected)"
        }
      },
      "exclusions": {
        "status": "confirmed_live",
        "faqId": "G1",
        "labelEn": "What's excluded",
        "required": true,
        "draftZh": {
          "meaning": "列出不含、客人容易误会的项目。一条一项，专有名词保留英文。",
          "rule": "有地铁通票时写明不含 JR / 山手线和其他私铁。没有地铁加项不要抄这几条。\n现网例句：\n- JR Lines (including Yamanote line) ticket\n- Other private railways\n- Other personal expenses",
          "example": "JR Lines (including Yamanote line) ticket; Other private railways; Other personal expenses",
          "think": "加项实际覆盖哪些交通？不含的线路要写出来，避免客人按常识去坐 JR。没有地铁加项就不要抄东迪这几条。",
          "mistakes": "只写 Personal expenses，客人以为能坐山手线。",
          "fill": "列出不含、客人容易误会的项目。一条一项，专有名词保留英文。",
          "format": "有地铁通票时写明不含 JR / 山手线和其他私铁。没有地铁加项不要抄这几条。\n现网例句：\n- JR Lines (including Yamanote line) ticket\n- Other private railways\n- Other personal expenses"
        }
      },
      "briefDescription": {
        "status": "confirmed_live",
        "faqId": "G3",
        "labelEn": "Main sales description",
        "required": true,
        "draftZh": {
          "meaning": "产品页主销售 / 独特之处长文。",
          "rule": "先写履约，再写套餐，再写不含接送。不要只堆形容词。\n现网开头：\n- IMPORTANT ENTRY POLICY\n- VOUCHER IS NOT A TICKET\n- 出行前 7 天发 Official E-Tickets",
          "example": "见 products.json 的 briefDescription",
          "think": "这一单履约最大风险是什么（凭证能不能进、何时出票、有没有加项限制）？先写这个，再写卖点。",
          "mistakes": "只写梦幻乐园形容词；不写履约方式；把东迪 7 天发电票套到当场可用的票。",
          "fill": "产品页主销售 / 独特之处长文。",
          "format": "先写履约，再写套餐，再写不含接送。不要只堆形容词。\n现网开头：\n- IMPORTANT ENTRY POLICY\n- VOUCHER IS NOT A TICKET\n- 出行前 7 天发 Official E-Tickets"
        }
      },
      "skipTheLine": {
        "status": "confirmed_live",
        "faqId": "G4",
        "labelEn": "Skip the line",
        "required": true,
        "draftZh": {
          "meaning": "是否含快速通关。",
          "rule": "园内另售选 No。现网：Skip the line access: No。勾 Yes 必须在包含项写明。",
          "example": "No",
          "think": "采购含不含快速通关/优先入园？园内另售的通道不要写成已包含。",
          "mistakes": "勾了 skip the line 但包含项没有。",
          "fill": "是否含快速通关。",
          "format": "园内另售选 No。现网：Skip the line access: No。勾 Yes 必须在包含项写明。"
        }
      },
      "additionalInfo": {
        "status": "confirmed_live",
        "faqId": "H1",
        "labelEn": "Additional information",
        "required": false,
        "draftZh": {
          "meaning": "预订前必须知道的限制，逐条列出。",
          "rule": "写清整产品还是某档。现网：换地铁票（须知写实体票）；This offer is not available for Japanese passport holders。没有日籍限制不要抄。",
          "example": "This offer is not available for Japanese passport holders (whole product, all options)",
          "think": "供应链写的是国籍、居住地，还是本地人票？是整产品不能卖，还是某一档不能卖？没有限制就不要抄东迪这条。",
          "mistakes": "所有日本景点都写日籍不可买；限制和可售范围不一致。",
          "fill": "预订前必须知道的限制，逐条列出。",
          "format": "写清整产品还是某档。现网：换地铁票（须知写实体票）；This offer is not available for Japanese passport holders。没有日籍限制不要抄。"
        }
      },
      "phoneNumber": {
        "status": "confirmed_live",
        "faqId": "H3",
        "labelEn": "Phone number",
        "required": false,
        "draftZh": {
          "meaning": "出行当天对客电话。",
          "rule": "公司号码。现网：HK +852 3428 8182。不要填私人手机。",
          "example": "HK +852 3428 8182",
          "think": "对客/运营用哪支公司电话？没有统一号码就空着等负责人，不要填私人手机。",
          "mistakes": "填实习生自己的号。",
          "fill": "出行当天对客电话。",
          "format": "公司号码。现网：HK +852 3428 8182。不要填私人手机。"
        }
      },
      "ageGroups": {
        "status": "confirmed_live",
        "faqId": "I1",
        "labelEn": "Age groups",
        "required": true,
        "draftZh": {
          "meaning": "可售年龄档，必须能出票。",
          "rule": "对齐该景点官方票种。现网：Adults 18–99；Youth 12–17；Children 4–11。不要套别国切分。",
          "example": "Adults 18–99 / Youth 12–17 / Children 4–11",
          "think": "打开该景点或供应商的官方票种表，年龄切分以出票为准，不要套东迪或欧美习惯。",
          "mistakes": "用 13+ Child 去套东迪；所有乐园都抄 18+/12–17/4–11。",
          "fill": "可售年龄档，必须能出票。",
          "format": "对齐该景点官方票种。现网：Adults 18–99；Youth 12–17；Children 4–11。不要套别国切分。"
        }
      },
      "options": {
        "status": "confirmed_live",
        "faqId": "G2",
        "labelEn": "Product options",
        "required": true,
        "draftZh": {
          "meaning": "创建客人下单时选的套餐档，每档有名称和说明。",
          "rule": "名称写出差别，不要 Option 1。\n现网：\n- Ticket and Tokyo Subway Pass (TG7)\n- Ticket Only (No Subway Pass) (TG6)",
          "example": "Ticket and Tokyo Subway Pass; Ticket Only (No Subway Pass)",
          "think": "供应链有几个可卖套餐？名称要让人看出差别，不要 Option 1。",
          "mistakes": "option 名和包含项矛盾；用 Option 1 / Option 2；没有加项却抄 Optional。",
          "fill": "创建客人下单时选的套餐档，每档有名称和说明。",
          "format": "名称写出差别，不要 Option 1。\n现网：\n- Ticket and Tokyo Subway Pass (TG7)\n- Ticket Only (No Subway Pass) (TG6)"
        }
      },
      "currency": {
        "status": "confirmed_live",
        "faqId": "A3",
        "labelEn": "Product currency / supplier prices",
        "required": true,
        "draftZh": {
          "meaning": "供应商后台填价的币种和数字。",
          "rule": "现网币种 HKD，展示 SUGGESTED RETAIL PRICE + 26% commission，由 Connectivity 同步。不要填客人页零售价。",
          "example": "HKD suggested retail（Connectivity）",
          "think": "这一单采购币种和净价是什么？和前台美元展示价通常不是同一个数。",
          "mistakes": "把 $59.60 前台价填进供应商价；不敢抄后台真实价。",
          "fill": "供应商后台填价的币种和数字。",
          "format": "现网币种 HKD，展示 SUGGESTED RETAIL PRICE + 26% commission，由 Connectivity 同步。不要填客人页零售价。"
        }
      },
      "cancellationPolicy": {
        "status": "confirmed_live",
        "faqId": "J3",
        "labelEn": "Cancellation policy",
        "required": true,
        "draftZh": {
          "meaning": "能不能退。",
          "rule": "现网 Policy type: All sales final。Travelers will not receive any refund regardless of cancellation status.",
          "example": "All sales final",
          "think": "先看这一单采购能不能退。公司门票默认不可退；采购可退时先问负责人，不要自己改成免费取消。",
          "mistakes": "所有产品都抄东迪；采购不可退却勾免费取消。",
          "fill": "能不能退。",
          "format": "现网 Policy type: All sales final。Travelers will not receive any refund regardless of cancellation status."
        }
      },
      "confirmationMethod": {
        "status": "confirmed_live",
        "faqId": "J2",
        "labelEn": "Confirmation method",
        "required": true,
        "draftZh": {
          "meaning": "下单后即时确认还是人工确认，以及是否接收预订通知邮件。真后台是下拉。",
          "rule": "库存已对接才选即时确认。\n现网：Instant confirmation (Recommended)；通知邮件 Yes。",
          "example": "Instant confirmation",
          "think": "这一单是系统即时出票，还是人工确认？库存未对接就不要选即时确认。",
          "mistakes": "库存未对接却选即时确认。",
          "fill": "下单后即时确认还是人工确认，以及是否接收预订通知邮件。真后台是下拉。",
          "format": "库存已对接才选即时确认。\n现网：Instant confirmation (Recommended)；通知邮件 Yes。"
        }
      },
      "redemptionInstructions": {
        "status": "confirmed_live",
        "faqId": "K3",
        "labelEn": "Ticket redemption",
        "required": true,
        "draftZh": {
          "meaning": "用英文写清每种票怎么用。",
          "rule": "先写凭证不能扫，再分段写乐园票和地铁票。不要只写 Show this voucher at the gate。\n现网结构：\n- STOP: THIS VOUCHER IS NOT YOUR ENTRY TICKET\n- 乐园票：官方 QR 入园\n- 地铁通票：Metro / Toei 闸机扫官方 QR，首次进站起算 24 小时，不含 JR",
          "example": "乐园票：凭证不能入园，出行前约 7 天发官方电子票。地铁通票：到 Metro/Toei 主要车站换实体票，不含 JR。",
          "think": "供应链出票说明里，每种票分别怎么用？扫码、换票、窗口取票、能否用平台凭证？没有的票不要写。",
          "mistakes": "只写 Show this voucher at the gate；把东迪 7 天发电票套到当场扫码就能进的票。",
          "fill": "用英文写清每种票怎么用。",
          "format": "先写凭证不能扫，再分段写乐园票和地铁票。不要只写 Show this voucher at the gate。\n现网结构：\n- STOP: THIS VOUCHER IS NOT YOUR ENTRY TICKET\n- 乐园票：官方 QR 入园\n- 地铁通票：Metro / Toei 闸机扫官方 QR，首次进站起算 24 小时，不含 JR"
        }
      },
      "separateEntryTicket": {
        "status": "confirmed_live",
        "faqId": "K3",
        "labelEn": "Separate entry ticket?",
        "required": true,
        "draftZh": {
          "meaning": "平台凭证是不是入园凭证。",
          "rule": "现网：Separate direct entry ticket will be delivered to traveler。凭证不能进则必须另发官方票。",
          "example": "Separate direct entry ticket will be delivered to traveler",
          "think": "平台凭证能不能直接入园？不能就必须另发官方票，并在卖点和核销里写清。",
          "mistakes": "勾成凭证可直接入园。",
          "fill": "平台凭证是不是入园凭证。",
          "format": "现网：Separate direct entry ticket will be delivered to traveler。凭证不能进则必须另发官方票。"
        }
      },
      "requiredTravelerFields": {
        "status": "confirmed_live",
        "faqId": "K1",
        "labelEn": "Required traveler fields",
        "required": true,
        "draftZh": {
          "meaning": "预订表要客人填什么。",
          "rule": "只收出票需要的。现网自动收集领队姓名和电话；另外要 Full Names。不要无故要求客人上传或填写护照资料。",
          "example": "Full Names（另自动收集 Lead Traveler's Name, Phone Number）",
          "think": "出票和适用人群核验真正要哪些字段？姓名是否够用，护照号何时才要。",
          "mistakes": "必填项和真正出票所需不一致。",
          "fill": "预订表要客人填什么。",
          "format": "只收出票需要的。现网自动收集领队姓名和电话；另外要 Full Names。不要无故要求客人上传或填写护照资料。"
        }
      },
      "submitForReview": {
        "status": "draft_guess",
        "faqId": "L2",
        "labelEn": "Submit for review",
        "required": false,
        "draftZh": {
          "meaning": "把产品交给 Viator 审核。",
          "rule": "训练页按钮保持 Disabled。不要在真后台点 Submit 测试。",
          "example": "Disabled",
          "think": "这是训练页还是真实后台？训练任务里永远不要点真实 Submit / Pay / Publish。",
          "mistakes": "在真实后台点提交来「测试」。",
          "fill": "把产品交给 Viator 审核。",
          "format": "训练页按钮保持 Disabled。不要在真后台点 Submit 测试。"
        }
      }
    }
  },
  "tour": {
    "schemaVersion": "0.3.0",
    "noSkip": true,
    "spots": [
      {
        "id": "intro-basics",
        "stepId": "basics.creationType",
        "target": "section-intro",
        "sectionId": "basics",
        "fieldIds": [],
        "titleZh": "Basics 这一段先看介绍",
        "what": "Basics 这一段填：撰写语言、标题、产品类型、主题、照片。点 Next 进入字段。",
        "why": "按向导顺序走。门票先把「卖哪张票」写进标题。本产品现网标题：Tokyo Disneyland Ticket & Optional Tokyo Subway Pass。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "Basics 这一段填：撰写语言、标题、产品类型、主题、照片。点 Next 进入字段。",
        "format": "按向导顺序走。门票先把「卖哪张票」写进标题。本产品现网标题：Tokyo Disneyland Ticket & Optional Tokyo Subway Pass。"
      },
      {
        "id": "welcome-banner",
        "stepId": "basics.creationType",
        "target": "banner",
        "fieldIds": [],
        "titleZh": "这是训练页，不是真实后台",
        "what": "这是训练页提示，不是后台字段。样例产品是已上线的 5514894P11。",
        "why": "东迪+地铁只是这一份的填法。下一份按该产品供应链重写，不要整页照抄。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "这是训练页提示，不是后台字段。样例产品是已上线的 5514894P11。",
        "format": "东迪+地铁只是这一份的填法。下一份按该产品供应链重写，不要整页照抄。"
      },
      {
        "id": "welcome-sidebar",
        "stepId": "basics.creationType",
        "target": "sidebar",
        "fieldIds": [],
        "titleZh": "左侧是整条上架步骤",
        "what": "左侧是草稿向导的 22 步，按五大段分组。引导结束前不能跳步。",
        "why": "实习生以后会碰到两种后台：第一种是新产品，左边一列一步一步填；第二种是已经在卖的产品，点 Manage 后上面有几个栏目，想改标题就点标题那块。两种要填的东西一样。这个练习页用的是第一种。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "左侧是草稿向导的 22 步，按五大段分组。引导结束前不能跳步。",
        "format": "实习生以后会碰到两种后台：第一种是新产品，左边一列一步一步填；第二种是已经在卖的产品，点 Manage 后上面有几个栏目，想改标题就点标题那块。两种要填的东西一样。这个练习页用的是第一种。"
      },
      {
        "id": "creationType",
        "stepId": "basics.creationType",
        "target": "fields",
        "fieldIds": [
          "creationType"
        ],
        "titleZh": "怎么开始建草稿",
        "what": "选怎么创建草稿：Smart Creator（AI）或 Manual Creation（手填）。",
        "why": "门票训练选手填 Manual Creation。有现成产品页再用 AI，生成后仍要逐项核对。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "选怎么创建草稿：Smart Creator（AI）或 Manual Creation（手填）。",
        "format": "门票训练选手填 Manual Creation。有现成产品页再用 AI，生成后仍要逐项核对。"
      },
      {
        "id": "smartCreator",
        "stepId": "basics.smartCreator",
        "target": "fields",
        "fieldIds": [
          "smartCreatorSkipped"
        ],
        "titleZh": "Smart Creator 不是本页重点",
        "what": "若选了 AI：选语气、贴产品 URL 或粘贴说明。本训练不走生成。",
        "why": "真页是 Select your tone + Paste URL。本样例按已跳过展示。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "若选了 AI：选语气、贴产品 URL 或粘贴说明。本训练不走生成。",
        "format": "真页是 Select your tone + Paste URL。本样例按已跳过展示。"
      },
      {
        "id": "title-lang",
        "stepId": "basics.title",
        "target": "fields",
        "fieldIds": [
          "inputLanguage",
          "translationMode"
        ],
        "titleZh": "输入语言和翻译",
        "what": "选撰写语言，以及翻译方式（人工 / 自动翻译）。",
        "why": "对客英文选 English。现网 Product Setup：Input Language English。翻译用 Use automated translation（recommended），或 Add manual translation。不要中英混标题。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "选撰写语言，以及翻译方式（人工 / 自动翻译）。",
        "format": "对客英文选 English。现网 Product Setup：Input Language English。翻译用 Use automated translation（recommended），或 Add manual translation。不要中英混标题。"
      },
      {
        "id": "title",
        "stepId": "basics.title",
        "target": "fields",
        "fieldIds": [
          "title"
        ],
        "titleZh": "产品标题",
        "what": "填客人在搜索和产品页看到的英文主标题。",
        "why": "景点名 + Ticket + Optional 加项。有加购才写 Optional，无车不要写 Transfer。\n现网：\n- Tokyo Disneyland Ticket & Optional Tokyo Subway Pass",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "填客人在搜索和产品页看到的英文主标题。",
        "format": "景点名 + Ticket + Optional 加项。有加购才写 Optional，无车不要写 Transfer。\n现网：\n- Tokyo Disneyland Ticket & Optional Tokyo Subway Pass"
      },
      {
        "id": "referenceCode",
        "stepId": "basics.title",
        "target": "fields",
        "fieldIds": [
          "referenceCode"
        ],
        "titleZh": "内部参考码",
        "what": "选填供应商内部对照码，客人通常看不到。",
        "why": "填采购 SKU / 内部编码。没有就空着，不要编。现网 Product Setup 未展示内部码。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "选填供应商内部对照码，客人通常看不到。",
        "format": "填采购 SKU / 内部编码。没有就空着，不要编。现网 Product Setup 未展示内部码。"
      },
      {
        "id": "productType",
        "stepId": "basics.categorization",
        "target": "fields",
        "fieldIds": [
          "productType"
        ],
        "titleZh": "产品类型",
        "what": "选产品大类，决定后面出现哪些模块。",
        "why": "门票选 Ticket or pass（现网：Ticket/pass）。不要因为有地铁加项改成 Transfer / Tour。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "选产品大类，决定后面出现哪些模块。",
        "format": "门票选 Ticket or pass（现网：Ticket/pass）。不要因为有地铁加项改成 Transfer / Tour。"
      },
      {
        "id": "itineraryType",
        "stepId": "basics.categorization",
        "target": "fields",
        "fieldIds": [
          "ticketPassType"
        ],
        "titleZh": "行程类型和票种",
        "what": "门票选 Ticket or pass 后，再勾票种细类。",
        "why": "草稿向导没有单独的 itinerary type 下拉。现网 Manage：Product itinerary types = Ticket/pass。P513 票种已选 Theme Park、Cultural。地铁是 option 加项，不要选成多日团。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "门票选 Ticket or pass 后，再勾票种细类。",
        "format": "草稿向导没有单独的 itinerary type 下拉。现网 Manage：Product itinerary types = Ticket/pass。P513 票种已选 Theme Park、Cultural。地铁是 option 加项，不要选成多日团。"
      },
      {
        "id": "themes",
        "stepId": "basics.theme",
        "target": "fields",
        "fieldIds": [
          "themes"
        ],
        "titleZh": "主题（最多 3 个）",
        "what": "最多选 3 个主题，选和景点真实属性相关的，不要刷无关项。",
        "why": "真后台是：先下拉选类目，再勾该类目下的主题。\n本产品现网类目 Time of Day，勾选：\n- Day\n- Sunset\n- Night",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "最多选 3 个主题，选和景点真实属性相关的，不要刷无关项。",
        "format": "真后台是：先下拉选类目，再勾该类目下的主题。\n本产品现网类目 Time of Day，勾选：\n- Day\n- Sunset\n- Night"
      },
      {
        "id": "photos",
        "stepId": "basics.photos",
        "target": "fields",
        "fieldIds": [
          "coverPhoto",
          "gallery"
        ],
        "titleZh": "封面和相册",
        "what": "上传封面（第一张）和相册。现网 Photos 旁显示 +7。",
        "why": "封面一眼能认出哪个乐园；去水印、去别家品牌、无价格字/二维码。横图优于竖图。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "上传封面（第一张）和相册。现网 Photos 旁显示 +7。",
        "format": "封面一眼能认出哪个乐园；去水印、去别家品牌、无价格字/二维码。横图优于竖图。"
      },
      {
        "id": "intro-content",
        "stepId": "content.pickup",
        "target": "section-intro",
        "sectionId": "productContent",
        "fieldIds": [],
        "titleZh": "Product content 介绍",
        "what": "这一段填集合接送、门票详情、包含项、卖点、须知。",
        "why": "先问清：有没有车、主票是哪张、加项写在包含还是 option。本产品现网无接送，主票东迪，地铁是加购。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "这一段填集合接送、门票详情、包含项、卖点、须知。",
        "format": "先问清：有没有车、主票是哪张、加项写在包含还是 option。本产品现网无接送，主票东迪，地铁是加购。"
      },
      {
        "id": "hasPickup",
        "stepId": "content.pickup",
        "target": "fields",
        "fieldIds": [
          "hasPickup"
        ],
        "titleZh": "有没有酒店接送",
        "what": "勾选是否含酒店接送。真后台是下拉 Choose one。",
        "why": "无车选：No, travelers go directly to the location。\n有可选接送选：Yes, pickup is optional。\n须和标题、卖点一致。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "勾选是否含酒店接送。真后台是下拉 Choose one。",
        "format": "无车选：No, travelers go directly to the location。\n有可选接送选：Yes, pickup is optional。\n须和标题、卖点一致。"
      },
      {
        "id": "meetingPoint",
        "stepId": "content.pickup",
        "target": "fields",
        "fieldIds": [
          "meetingPoint",
          "dropoff"
        ],
        "titleZh": "集合点和落客",
        "what": "填客人自行前往的入园/集合地址，以及结束后去哪。",
        "why": "无接送填景点官方地址，不要填酒店。现网 Ticket details 地址：Tokyo Disneyland, 1-1 Maihama, Maihama, Urayasu 279-0031 Chiba Prefecture。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "填客人自行前往的入园/集合地址，以及结束后去哪。",
        "format": "无接送填景点官方地址，不要填酒店。现网 Ticket details 地址：Tokyo Disneyland, 1-1 Maihama, Maihama, Urayasu 279-0031 Chiba Prefecture。"
      },
      {
        "id": "pickupDetails",
        "stepId": "content.pickup",
        "target": "fields",
        "fieldIds": [
          "additionalPickupDetails"
        ],
        "titleZh": "接送补充说明",
        "what": "补充怎么到达、有没有接送。",
        "why": "无车写清 No hotel pick-up or private transfer included。可加附近有公共交通。不要列酒店接送区域。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "补充怎么到达、有没有接送。",
        "format": "无车写清 No hotel pick-up or private transfer included。可加附近有公共交通。不要列酒店接送区域。"
      },
      {
        "id": "attraction",
        "stepId": "content.ticketDetails",
        "target": "fields",
        "fieldIds": [
          "multipleAttractions",
          "attraction"
        ],
        "titleZh": "景点 / POI",
        "what": "是否多个景点，以及主 POI 名称。",
        "why": "主票对应的官方景点。地铁通票不是第二个景点。本产品：多个景点选 No；POI = Tokyo Disneyland。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "是否多个景点，以及主 POI 名称。",
        "format": "主票对应的官方景点。地铁通票不是第二个景点。本产品：多个景点选 No；POI = Tokyo Disneyland。"
      },
      {
        "id": "duration",
        "stepId": "content.ticketDetails",
        "target": "fields",
        "fieldIds": [
          "duration"
        ],
        "titleZh": "时长 Duration",
        "what": "填客人在这个景点通常待多久（typically spend / Total Duration）。",
        "why": "真后台是数字 + 单位下拉（hours / days）。\n本产品现网填 10 hours。\n这不是票面有效期（一日票），也不要把地铁 24-hour 填进这一格。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "填客人在这个景点通常待多久（typically spend / Total Duration）。",
        "format": "真后台是数字 + 单位下拉（hours / days）。\n本产品现网填 10 hours。\n这不是票面有效期（一日票），也不要把地铁 24-hour 填进这一格。"
      },
      {
        "id": "attractionDescription",
        "stepId": "content.ticketDetails",
        "target": "fields",
        "fieldIds": [
          "attractionDescription"
        ],
        "titleZh": "景点说明",
        "what": "用英文介绍这个景点/门票是什么。",
        "why": "2–4 句：乐园是什么 + 票含入园。不写核销步骤、不写交通攻略。草稿向导现填：Tokyo Disneyland is a world-renowned theme park…。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "用英文介绍这个景点/门票是什么。",
        "format": "2–4 句：乐园是什么 + 票含入园。不写核销步骤、不写交通攻略。草稿向导现填：Tokyo Disneyland is a world-renowned theme park…。"
      },
      {
        "id": "guides",
        "stepId": "content.languages",
        "target": "fields",
        "fieldIds": [
          "liveGuide",
          "audioGuide",
          "writtenGuide"
        ],
        "titleZh": "有没有导游",
        "what": "分别勾选：真人导游 / 语音导览 / 书面导览 有没有。",
        "why": "纯门票三项都选 No。现网：No language guides have been defined。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "分别勾选：真人导游 / 语音导览 / 书面导览 有没有。",
        "format": "纯门票三项都选 No。现网：No language guides have been defined。"
      },
      {
        "id": "guideLanguages",
        "stepId": "content.languages",
        "target": "fields",
        "fieldIds": [
          "guideLanguages"
        ],
        "titleZh": "导游语言",
        "what": "仅当上面有导游时，勾导游语言。",
        "why": "无导游留空。不要为了好看勾一堆语言。本产品现网无导游语言。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "仅当上面有导游时，勾导游语言。",
        "format": "无导游留空。不要为了好看勾一堆语言。本产品现网无导游语言。"
      },
      {
        "id": "inclusions",
        "stepId": "content.inclusions",
        "target": "fields",
        "fieldIds": [
          "inclusions"
        ],
        "titleZh": "包含项",
        "what": "列出付钱后客人得到什么。一条一项。",
        "why": "先写两档都有的；仅某套餐才有的加括号。现网产品级没写括号，训练示范加括号。\n现网例句：\n- 1-day Tokyo Disneyland pass\n- 24-hour unlimited Tokyo Metro & Toei Subway Pass (only if the Ticket and Tokyo Subway Pass option is selected)",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "列出付钱后客人得到什么。一条一项。",
        "format": "先写两档都有的；仅某套餐才有的加括号。现网产品级没写括号，训练示范加括号。\n现网例句：\n- 1-day Tokyo Disneyland pass\n- 24-hour unlimited Tokyo Metro & Toei Subway Pass (only if the Ticket and Tokyo Subway Pass option is selected)"
      },
      {
        "id": "exclusions",
        "stepId": "content.inclusions",
        "target": "fields",
        "fieldIds": [
          "exclusions"
        ],
        "titleZh": "不包含项",
        "what": "列出不含、客人容易误会的项目。一条一项，专有名词保留英文。",
        "why": "有地铁通票时写明不含 JR / 山手线和其他私铁。没有地铁加项不要抄这几条。\n现网例句：\n- JR Lines (including Yamanote line) ticket\n- Other private railways\n- Other personal expenses",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "列出不含、客人容易误会的项目。一条一项，专有名词保留英文。",
        "format": "有地铁通票时写明不含 JR / 山手线和其他私铁。没有地铁加项不要抄这几条。\n现网例句：\n- JR Lines (including Yamanote line) ticket\n- Other private railways\n- Other personal expenses"
      },
      {
        "id": "extraCost",
        "stepId": "content.inclusions",
        "target": "fields",
        "fieldIds": [
          "extraCostConfirm"
        ],
        "titleZh": "额外费用确认",
        "what": "确认是否还有未写入的现场必付费用。",
        "why": "有则写进包含/不包含；没有就按后台确认。不要把园内另购（如 Premier Access）写成已含。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "确认是否还有未写入的现场必付费用。",
        "format": "有则写进包含/不包含；没有就按后台确认。不要把园内另购（如 Premier Access）写成已含。"
      },
      {
        "id": "briefDescription",
        "stepId": "content.unique",
        "target": "fields",
        "fieldIds": [
          "briefDescription"
        ],
        "titleZh": "卖点 / 独特之处",
        "what": "产品页主销售 / 独特之处长文。",
        "why": "先写履约，再写套餐，再写不含接送。不要只堆形容词。\n现网开头：\n- IMPORTANT ENTRY POLICY\n- VOUCHER IS NOT A TICKET\n- 出行前 7 天发 Official E-Tickets",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "产品页主销售 / 独特之处长文。",
        "format": "先写履约，再写套餐，再写不含接送。不要只堆形容词。\n现网开头：\n- IMPORTANT ENTRY POLICY\n- VOUCHER IS NOT A TICKET\n- 出行前 7 天发 Official E-Tickets"
      },
      {
        "id": "skipTheLine",
        "stepId": "content.unique",
        "target": "fields",
        "fieldIds": [
          "skipTheLine"
        ],
        "titleZh": "是否含快速通关",
        "what": "是否包含快速通关 / 免排队。",
        "why": "园内另售通道选 No。现网：Skip the line access: No。勾 Yes 必须在包含项写明。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "是否包含快速通关 / 免排队。",
        "format": "园内另售通道选 No。现网：Skip the line access: No。勾 Yes 必须在包含项写明。"
      },
      {
        "id": "reseller",
        "stepId": "content.travelerInfo",
        "target": "fields",
        "fieldIds": [
          "resellerStatus"
        ],
        "titleZh": "经销身份",
        "what": "选经销身份：官方转售、独立转售，或非转售运营商。",
        "why": "按公司口径勾。现网：Independent reseller。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "选经销身份：官方转售、独立转售，或非转售运营商。",
        "format": "按公司口径勾。现网：Independent reseller。"
      },
      {
        "id": "accessHealth",
        "stepId": "content.travelerInfo",
        "target": "fields",
        "fieldIds": [
          "accessibility",
          "healthRestrictions",
          "difficultyLevel"
        ],
        "titleZh": "无障碍、健康、难度",
        "what": "无障碍说明、健康限制、体能难度。",
        "why": "现网：Not wheelchair accessible；Near public transportation；Infants must sit on laps；Health restrictions 未选；Level of difficulty = Most travelers can participate。没有的限制不要编。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "无障碍说明、健康限制、体能难度。",
        "format": "现网：Not wheelchair accessible；Near public transportation；Infants must sit on laps；Health restrictions 未选；Level of difficulty = Most travelers can participate。没有的限制不要编。"
      },
      {
        "id": "phoneNumber",
        "stepId": "content.travelerInfo",
        "target": "fields",
        "fieldIds": [
          "phoneNumber"
        ],
        "titleZh": "对客电话",
        "what": "出行当天客人能打到的对客电话。",
        "why": "填公司号码，不要私人手机。现网：HK +852 3428 8182。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "出行当天客人能打到的对客电话。",
        "format": "填公司号码，不要私人手机。现网：HK +852 3428 8182。"
      },
      {
        "id": "additionalInfo",
        "stepId": "content.travelerInfo",
        "target": "fields",
        "fieldIds": [
          "additionalInfo"
        ],
        "titleZh": "出行须知 / 限制",
        "what": "预订前必须知道的限制和注意点，一条一条列。",
        "why": "限制写清整产品还是某 option。现网两条关键：Need to exchange a physical subway ticket at major stations of the Tokyo Metro and Toei Subway.；This offer is not available for Japanese passport holders。没有日籍限制不要抄第二条。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "预订前必须知道的限制和注意点，一条一条列。",
        "format": "限制写清整产品还是某 option。现网两条关键：Need to exchange a physical subway ticket at major stations of the Tokyo Metro and Toei Subway.；This offer is not available for Japanese passport holders。没有日籍限制不要抄第二条。"
      },
      {
        "id": "intro-pricing",
        "stepId": "pricing.travelerDetails",
        "target": "section-intro",
        "sectionId": "schedulesPricing",
        "fieldIds": [],
        "titleZh": "Schedules & pricing 介绍",
        "what": "这一段填计价方式、年龄档、option 和价格日历。",
        "why": "门票按人出票；option 名称要能看出差别。本产品现网两档：Ticket and Tokyo Subway Pass；Ticket Only (No Subway Pass)。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "这一段填计价方式、年龄档、option 和价格日历。",
        "format": "门票按人出票；option 名称要能看出差别。本产品现网两档：Ticket and Tokyo Subway Pass；Ticket Only (No Subway Pass)。"
      },
      {
        "id": "priceType",
        "stepId": "pricing.travelerDetails",
        "target": "fields",
        "fieldIds": [
          "priceType"
        ],
        "titleZh": "计价方式",
        "what": "选按人、按车或按团计价。",
        "why": "门票选按人。现网 Booking details → Pricing Type 按 Adult / Youth / Children 分档，即按人出票。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "选按人、按车或按团计价。",
        "format": "门票选按人。现网 Booking details → Pricing Type 按 Adult / Youth / Children 分档，即按人出票。"
      },
      {
        "id": "ageGroups",
        "stepId": "pricing.travelerDetails",
        "target": "fields",
        "fieldIds": [
          "ageGroups"
        ],
        "titleZh": "年龄档",
        "what": "勾选并填写可售年龄档，必须能出票。",
        "why": "对齐该景点官方票种，不要套别国。现网 Pricing Type：Adults 18–99；Youth 12–17；Children 4–11。Infant 在须知里写坐成人腿上，现网未单独挂价。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "勾选并填写可售年龄档，必须能出票。",
        "format": "对齐该景点官方票种，不要套别国。现网 Pricing Type：Adults 18–99；Youth 12–17；Children 4–11。Infant 在须知里写坐成人腿上，现网未单独挂价。"
      },
      {
        "id": "maxTravelers",
        "stepId": "pricing.travelerDetails",
        "target": "fields",
        "fieldIds": [
          "childAccompaniment",
          "maxTravelers"
        ],
        "titleZh": "随行规则和人数上限",
        "what": "儿童是否需成人陪同，以及每单人数上限。",
        "why": "现网：Infants must sit on laps；Max travelers per booking: 15。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "儿童是否需成人陪同，以及每单人数上限。",
        "format": "现网：Infants must sit on laps；Max travelers per booking: 15。"
      },
      {
        "id": "options",
        "stepId": "pricing.schedules",
        "target": "fields",
        "fieldIds": [
          "options"
        ],
        "titleZh": "产品 option",
        "what": "创建客人下单时选的套餐档，每档有名称和说明。",
        "why": "名称写出差别，不要 Option 1。\n现网：\n- Ticket and Tokyo Subway Pass (TG7)\n- Ticket Only (No Subway Pass) (TG6)",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "创建客人下单时选的套餐档，每档有名称和说明。",
        "format": "名称写出差别，不要 Option 1。\n现网：\n- Ticket and Tokyo Subway Pass (TG7)\n- Ticket Only (No Subway Pass) (TG6)"
      },
      {
        "id": "prices",
        "stepId": "pricing.schedules",
        "target": "fields",
        "fieldIds": [
          "currency",
          "supplierPrices"
        ],
        "titleZh": "币种和供应商价",
        "what": "选产品币种，并填供应商后台价（各 option × 年龄档）。",
        "why": "现网币种 HKD；展示的是 SUGGESTED RETAIL PRICE + 26% COMMISSION，价格由 Connectivity 同步，本账号不能改价。不要把客人页 starting-from 日元/美元填进来。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "选产品币种，并填供应商后台价（各 option × 年龄档）。",
        "format": "现网币种 HKD；展示的是 SUGGESTED RETAIL PRICE + 26% COMMISSION，价格由 Connectivity 同步，本账号不能改价。不要把客人页 starting-from 日元/美元填进来。"
      },
      {
        "id": "priceMatrix",
        "stepId": "pricing.schedules",
        "target": "fields",
        "fieldIds": [
          "priceMatrixNote"
        ],
        "titleZh": "价格矩阵（简化）",
        "what": "真实后台是按日期、星期、开场时间的报价表。训练页只展示口径。",
        "why": "每个 option × 每个年龄档都要有价。现网 combo 档全年每天 9:00am 有价；Ticket Only 档目前只有周四有价、其余天 No prices added——那是现网状态，新上架不要学漏价。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "真实后台是按日期、星期、开场时间的报价表。训练页只展示口径。",
        "format": "每个 option × 每个年龄档都要有价。现网 combo 档全年每天 9:00am 有价；Ticket Only 档目前只有周四有价、其余天 No prices added——那是现网状态，新上架不要学漏价。"
      },
      {
        "id": "intro-booking",
        "stepId": "booking.process",
        "target": "section-intro",
        "sectionId": "bookingTickets",
        "fieldIds": [],
        "titleZh": "Booking & tickets 介绍",
        "what": "这一段填截止收订、确认方式、取消、客人资料、出票和核销。",
        "why": "核销按「每种票怎么用」写。本产品凭证不能入园，要另发官方电子票。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "这一段填截止收订、确认方式、取消、客人资料、出票和核销。",
        "format": "核销按「每种票怎么用」写。本产品凭证不能入园，要另发官方电子票。"
      },
      {
        "id": "cutoff",
        "stepId": "booking.process",
        "target": "fields",
        "fieldIds": [
          "cutoffType",
          "cutoffHours"
        ],
        "titleZh": "截止收订",
        "what": "最晚能卖到出行前多久。真后台先选截止类型下拉，再填小时数。",
        "why": "本产品现网：Relative to start time，48 hours（即出行前 2 天）。\n当天来不及出票就不要设成 0。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "最晚能卖到出行前多久。真后台先选截止类型下拉，再填小时数。",
        "format": "本产品现网：Relative to start time，48 hours（即出行前 2 天）。\n当天来不及出票就不要设成 0。"
      },
      {
        "id": "confirmation",
        "stepId": "booking.process",
        "target": "fields",
        "fieldIds": [
          "confirmationMethod",
          "notificationEmail"
        ],
        "titleZh": "确认方式",
        "what": "下单后即时确认还是人工确认，以及是否接收预订通知邮件。真后台是下拉。",
        "why": "库存已对接才选即时确认。\n现网：Instant confirmation (Recommended)；通知邮件 Yes。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "下单后即时确认还是人工确认，以及是否接收预订通知邮件。真后台是下拉。",
        "format": "库存已对接才选即时确认。\n现网：Instant confirmation (Recommended)；通知邮件 Yes。"
      },
      {
        "id": "cancellation",
        "stepId": "booking.cancellation",
        "target": "fields",
        "fieldIds": [
          "cancellationPolicy"
        ],
        "titleZh": "取消政策",
        "what": "选取消政策。",
        "why": "现网 Policy type: All sales final。说明：Travelers will not receive any refund regardless of cancellation status. 采购可退时先问负责人，不要自己改成免费取消。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "选取消政策。",
        "format": "现网 Policy type: All sales final。说明：Travelers will not receive any refund regardless of cancellation status. 采购可退时先问负责人，不要自己改成免费取消。"
      },
      {
        "id": "cancelExtras",
        "stepId": "booking.cancellation",
        "target": "fields",
        "fieldIds": [
          "badWeather",
          "notEnoughTravelers"
        ],
        "titleZh": "天气和人数不足",
        "what": "恶劣天气、人数不足是否可作为取消理由。",
        "why": "门票通常不因天气/不成团自动退。这两项无需勾选。现网 Other post-booking policies: None。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "恶劣天气、人数不足是否可作为取消理由。",
        "format": "门票通常不因天气/不成团自动退。这两项无需勾选。现网 Other post-booking policies: None。"
      },
      {
        "id": "requiredInfo",
        "stepId": "booking.requiredInfo",
        "target": "fields",
        "fieldIds": [
          "requiredTravelerFields",
          "passportTiming"
        ],
        "titleZh": "要客人填什么",
        "what": "预订时要客人填哪些资料。",
        "why": "只收出票需要的。现网自动收集 Lead Traveler's Name、Phone Number；另外要 Full Names。不要无故要求客人上传或填写护照资料。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "预订时要客人填哪些资料。",
        "format": "只收出票需要的。现网自动收集 Lead Traveler's Name、Phone Number；另外要 Full Names。不要无故要求客人上传或填写护照资料。"
      },
      {
        "id": "ticketBuilder",
        "stepId": "tickets.builder",
        "target": "fields",
        "fieldIds": [
          "ticketType",
          "ticketsPer"
        ],
        "titleZh": "票种设置",
        "what": "票类型（电子/纸质）以及一张订单出几张票。",
        "why": "现网：Mobile or paper ticket accepted；One per booking。须和核销一致。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "票类型（电子/纸质）以及一张订单出几张票。",
        "format": "现网：Mobile or paper ticket accepted；One per booking。须和核销一致。"
      },
      {
        "id": "separateEntry",
        "stepId": "tickets.redemption",
        "target": "fields",
        "fieldIds": [
          "separateEntryTicket"
        ],
        "titleZh": "凭证是不是入园票",
        "what": "平台凭证能不能当入园凭证。",
        "why": "现网 Exchange requirements：Separate direct entry ticket will be delivered to traveler。凭证不能进园的产品必须选另发官方票。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "平台凭证能不能当入园凭证。",
        "format": "现网 Exchange requirements：Separate direct entry ticket will be delivered to traveler。凭证不能进园的产品必须选另发官方票。"
      },
      {
        "id": "redemption",
        "stepId": "tickets.redemption",
        "target": "fields",
        "fieldIds": [
          "redemptionInstructions"
        ],
        "titleZh": "核销说明",
        "what": "用英文写清每种票怎么用。",
        "why": "先写凭证不能扫，再分段写乐园票和地铁票。不要只写 Show this voucher at the gate。\n现网结构：\n- STOP: THIS VOUCHER IS NOT YOUR ENTRY TICKET\n- 乐园票：官方 QR 入园\n- 地铁通票：Metro / Toei 闸机扫官方 QR，首次进站起算 24 小时，不含 JR",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "用英文写清每种票怎么用。",
        "format": "先写凭证不能扫，再分段写乐园票和地铁票。不要只写 Show this voucher at the gate。\n现网结构：\n- STOP: THIS VOUCHER IS NOT YOUR ENTRY TICKET\n- 乐园票：官方 QR 入园\n- 地铁通票：Metro / Toei 闸机扫官方 QR，首次进站起算 24 小时，不含 JR"
      },
      {
        "id": "preview",
        "stepId": "tickets.preview",
        "target": "fields",
        "fieldIds": [
          "ticketPreview",
          "companyLogo"
        ],
        "titleZh": "票面预览",
        "what": "预览客人票面，可选公司 Logo。",
        "why": "训练页只做示意。现网 Ticket preview：Click the edit button to add your logo。Logo 用公司文件。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "预览客人票面，可选公司 Logo。",
        "format": "训练页只做示意。现网 Ticket preview：Click the edit button to add your logo。Logo 用公司文件。"
      },
      {
        "id": "intro-finish",
        "stepId": "finish.tripadvisor",
        "target": "section-intro",
        "sectionId": "finish",
        "fieldIds": [],
        "titleZh": "Finish 介绍",
        "what": "最后关联 Tripadvisor，并提交审核。",
        "why": "训练页到此为止，提交按钮禁用。不要在真后台点 Submit 测试。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "最后关联 Tripadvisor，并提交审核。",
        "format": "训练页到此为止，提交按钮禁用。不要在真后台点 Submit 测试。"
      },
      {
        "id": "tripadvisor",
        "stepId": "finish.tripadvisor",
        "target": "fields",
        "fieldIds": [
          "tripadvisorListing"
        ],
        "titleZh": "关联 Tripadvisor",
        "what": "把本产品连到对应的 Tripadvisor listing。",
        "why": "现网 Listing name: Reotrip Tokyo；地点 Shinjuku, Tokyo。训练页只展示，不要在真后台乱连。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "把本产品连到对应的 Tripadvisor listing。",
        "format": "现网 Listing name: Reotrip Tokyo；地点 Shinjuku, Tokyo。训练页只展示，不要在真后台乱连。"
      },
      {
        "id": "submit",
        "stepId": "finish.submit",
        "target": "fields",
        "fieldIds": [
          "submitForReview"
        ],
        "titleZh": "提交审核",
        "what": "把产品交给 Viator 审核。真实流程可能涉及付费。",
        "why": "训练页按钮保持 Disabled。不要在真后台点 Submit / Pay / Publish 来测试。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "把产品交给 Viator 审核。真实流程可能涉及付费。",
        "format": "训练页按钮保持 Disabled。不要在真后台点 Submit / Pay / Publish 来测试。"
      },
      {
        "id": "unlock",
        "stepId": "finish.submit",
        "target": "footer",
        "fieldIds": [],
        "titleZh": "完成基础引导",
        "what": "基础引导已走完。可以点左侧步骤，并用「?」查看字段说明。",
        "why": "下一份门票至少核对：主票、时长口径、套餐包含、适用人群、核销、取消。不要整页照抄东迪。",
        "example": "例句见「建议文案格式」。东迪只是这一份。",
        "think": "换产品按该单供应链重写，不要照抄东迪。",
        "fill": "基础引导已走完。可以点左侧步骤，并用「?」查看字段说明。",
        "format": "下一份门票至少核对：主票、时长口径、套餐包含、适用人群、核销、取消。不要整页照抄东迪。"
      }
    ],
    "sourceNoteZh": "fill/format 按 2026-08-25 只读 Manage P11：Product content + pricingAndSchedule + bookingSettings + tickets。"
  }
};
