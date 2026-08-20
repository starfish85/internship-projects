---
name: nol-domestic-ticket-listing-helper
description: Assist with NOL domestic attraction ticket listings, including Korean-facing product copy, ticket/pass categories, age-based ticket types, supplier-based admission and redemption rules, child-sale restrictions, inventory-cost pricing, reservation fields, and review checks. Use when the user lists Chinese domestic scenic spot tickets, theme park tickets, admission tickets, passes, or voucher products.
---

# NOL Domestic Ticket Listing Helper

Use this skill for NOL **domestic attraction ticket** products only. Do **not** reuse private-car transfer skill defaults (vehicles, pickup times, luggage, hotel transfer copy, `기사제공차량`, etc.).

**Primary batch source (learn and unify from):**  
`~/Downloads/NOL 待上架产品 (1).xlsx` → sheet **`国内景区门票`**  
(Also accept `NOL 待上架产品.xlsx` with the same sheet name when present.)

Source priority: **user Excel batch** > visible supplier-chain page/screenshot > older skill examples. If sources conflict, follow the higher-priority source and state the conflict.

---

## Operating Mode

- Use Chinese for operational guidance; paste-ready **Korean** for all customer-facing NOL fields.
- Ticket products = admission / pass / voucher / session entry — never transfer.
- Do not invent admission, redemption, issuance, cancellation, age, inventory, or price rules. Follow supplier + Excel.
- Every field recommendation must be traceable to Excel, supplier page, screenshot, or explicit user note.
- For a new pattern product, prefer assisted field-by-field mode until the user asks for autonomous browser listing.
- **Never** click approval/submission (`批准請求` / `提交審核` / `승인요청`, etc.).
- After option setup is done and the page is on step 4 `選項管理`, **stop**. Do not click page-level black `臨時存儲` unless the user explicitly asks in that turn for temporary save; default handoff is human operator review.

---

## Approval Submission Safety Boundary

- Never click approval/submission during listing work.
- Phrases like “上架 / 做完 / 保存 / 提交 / 批准 / 按 skill 操作” do **not** authorize approval click.
- If an approval confirmation dialog appears by mistake: stop; only cancel/close if unambiguous; never confirm.
- Identify `臨時存儲` by exact text, not by coordinates next to `批准請求`.

---

## Product Families From Excel (unified)

Classify every row into **one** family before filling sale settings. Mixing families is the main source of “售卖设置不统一”.

| Family | Excel examples | What customer buys | Age | Pricing | Entry / ticket | Reservation identity |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Session scenic (一般景区·场次)** | 上海豫园, 北京恭王府, 雍和宫, 天坛, 颐和园, 圆明园 | Morning / Afternoon **session** options | **Adult only** (no child/senior sale) | Excel **售价** as-is (copy-paste; no auto markup) | **Email e-ticket / ticket notice** ~within 7 days before use; customer presents ticket from email | All travelers: **full name + passport number** (collect at booking) |
| **B. Passport-entry theme park (护照入园·不预发票券)** | **上迪单门票**, **北环单门票** | One option: **1日票** | Adult 12+ + Child 3–11; **child cannot sell alone** | Excel **售价** as-is when filled; if only inventory cost given, use user/Excel stated sale price — **do not** auto ÷0.8 | **No advance e-ticket or paper ticket.** Day-of **passport recognition** entry; still may send **email notice** within ~7 days | All travelers: **English name + passport number** (per quantity) |
| **C. E-ticket theme park (电子票入园)** | 港迪单门票 (see do-not-list) | 1日票 adult+child | Same age bands; child not alone | Variable / Excel 售价 | **E-ticket by email**; **passport not required for entry** (unlike B) | Usually phone + email only unless supplier changes |
| **D. Do not list** | 港迪 when Excel says NOL has official park coop | — | — | — | — | **Do not list** from this batch |

### Family decision rules

1. If Excel says **只卖成人票** + Morning/Afternoon Session → **Family A**.
2. If product is 上迪 / 北环 / same wording “**不预先提供电子票或纸质票** / **护照识别入园**” → **Family B**.
3. If product is 港迪 and Excel says **NOL平台有和景区官方合作，不给上** → **Family D** (stop; do not create draft).
4. If e-ticket entry **without** passport recognition (港迪-style when allowed) → **Family C**.

Never apply Family A “email QR entry” copy to Family B, or Family B “passport gate only” copy to Family A.

---

## Unified Sale Settings Matrix (售卖设置统一)

Use this matrix for every domestic ticket product so option/price/period settings stay consistent.

### Product attributes (all families)

| Setting | Unified value |
| --- | --- |
| Product type | Ticket / pass / admission (`通票` when platform Chinese-only) — **not** transportation |
| Theme | Match attraction: `主题公园` for Disney/Universal; scenic category for temples/parks |
| Person limit | **否** unless supplier forces group size |
| Progress language | **韩语** |
| Nationality | 不限 unless supplier restricts |
| Location | Real POI from search (with coordinates), not free-text only |
| Schedule type | **没有单独的时间表 / NONE** (sessions are **options**, not course schedules) |
| Images | ≥3 attraction images when required |
| Shortest booking days | Default **0** when supplier shows immediate access; do **not** set 7 just because email copy says “7 days before use” (that is delivery timing) |

### Option / sales calendar (all families)

| Setting | Unified value |
| --- | --- |
| Option creation | `註冊/添加選項` for each sales package; do not misuse transfer option patterns |
| Sales period | Default **1 year** (or first selectable date → +1 year) for ongoing inventory; report actual retained dates |
| Price entry | Fill calendar / period price **once** per price type; verify cells, not only list cards |
| Include | Prefer common include `시설 입장료` (facility admission) |
| Exclude (Korean) | `개인 경비` + `포함 사항에 명시되지 않은 기타 비용` |
| Option-level include override | Prefer **共同**; delete stale option override that shows Chinese / “不存在” and causes `포함 사항 작성 부탁드립니다.` |
| Stop | After options visible on 選項管理 → hand off; no approval |

### Family-specific sale settings

#### Family A — Session scenic

| Setting | Unified value |
| --- | --- |
| Options | **Two** sales options: Morning Session + Afternoon Session (use Excel time windows in Korean option name/description) |
| Price types | **Adult only** (`성인` / age text from supplier if needed). Do **not** add child/senior types |
| Min/max qty | Min `1`; max blank unless supplier max |
| Representative | Adult price type = representative |
| Mandatory purchase | Off |
| Sale price | Use Excel **售价** column as-is (copy-paste). **Do not** auto-divide cost by 0.8 |
| Reservation | **Representative:** phone + email required. **Per quantity:** English surname, English given name, passport number required for every ticket |
| Voucher / ticket copy | Email e-ticket or ticket notice; emphasize valid email + attachment receive |

Example option names (Korean, adapt times from Excel):

```text
오전 세션 입장권 (09:00-12:30)
오후 세션 입장권 (12:30-16:00)
```

#### Family B — 上迪 / 北环 (passport entry)

| Setting | Unified value |
| --- | --- |
| Options | **One** option: `1일 입장권` |
| Price types | Age-based: **성인** + **아동** only |
| Adult | Name `성인`, desc `만 12세 이상`, min 1, max blank, **representative yes**, mandatory **no** |
| Child | Name `아동`, desc `만 3-11세`, min 1, max blank, representative **no**, mandatory **no** (mandatory would force every order to include a child) |
| Child alone | UI often has no true dependency → state in option desc + must-know + FAQ; do not fake mandatory |
| Cost basis | If Excel only notes inventory costs without 售价: take the value Excel/user designates as sale price; do not invent a markup |
| Sale price | Excel **售价** copy-paste. **No** fixed `cost/0.8` formula |
| Reservation | **Representative:** phone + email. **Per quantity:** English surname, English given name, passport number for every traveler |
| Voucher / ticket copy | **Do not** promise QR/e-ticket/paper ticket for gate entry. State **passport recognition on visit day**. Email within ~7 days is **notice/confirmation**, not a pre-issued park ticket |

#### Family C — E-ticket theme park (when listing is allowed)

| Setting | Same as Family B for ages/option structure |
| --- | --- |
| Entry copy | **E-ticket by email**; **passport not required** for entry (港迪 Excel) |
| Reservation | Prefer phone + email only unless supplier demands passport |

#### Family D

Stop listing; explain NOL official coop / batch “不给上”.

---

## Pricing Rules (unified)

1. **Use Excel/screenshot 售价 as-is** — copy-paste into NOL calendar. **Do not** auto-apply `成本 / 0.8` (or any fixed markup divisor).
2. If the table only shows one numeric column for the row (and user/Excel presents it as sale price), use that number directly as HKD sale.
3. If Excel has both 成本 and 售价, always set sale from **售价**; ignore cost for customer price unless user says recompute.
4. Variable parks (上迪/北环 notes about inventory cost): only recompute when user explicitly asks; otherwise use Excel **售价** columns as filled.
5. Adult and child prices calculated **separately** when both exist.
6. Never invent cancellation windows when supplier only shows vague labels.
7. Do not invent a default margin formula (no `/0.8`, no `/0.9`) unless the user gives an explicit formula in that turn.

### Reference sale prices from `NOL 待上架产品 (1).xlsx` (recheck supplier before reuse)

| Product | Options | Sale HKD (batch) |
| --- | --- | --- |
| 上海豫园 | Morning / Afternoon | 60 / 60 |
| 北京恭王府 | Morning / Afternoon | 58 / 58 |
| 北京雍和宫 | Morning / Afternoon | 65 / 65 |
| 北京天坛 | Morning / Afternoon | 30 / 30 |
| 北京颐和园 | Morning / Afternoon | 131 / 131 |
| 北京圆明园 | Morning / Afternoon | 56 / 56 |
| 上迪 1日票 | Adult / Child | 986 / 726 (batch; still revalidate inventory max cost) |
| 北环 1日票 | Adult / Child | 969 / 730 (batch; still revalidate inventory max cost) |
| 港迪 1日票 | Adult / Child | 869 / 653 — **do not list** if coop rule applies |

---

## Copy Rules by Family

All customer-facing text: **Korean only**. No Chinese leftovers in option include/exclude, FAQ, etc.

### Shared must-emphasize blocks (from Excel 备注)

**All listable products (A/B, and C when allowed)** should cover where applicable:

1. Email: ticket **or notice** usually sent within **7 days before travel** to the booking email; email must be real and can receive attachments.  
2. Identity: booking needs **all travelers’ full names and passport numbers** (except Family C 港迪-style when Excel does not require passport for entry — then do not force passport fields).

### Family A only (session scenic)

- Emphasize **session time windows** (morning vs afternoon).
- Emphasize **adult-only** sale when Excel says 只卖成人票.
- Emphasize **email ticket/notice** for entry presentation.
- Do **not** say “no ticket provided / passport-only gate” unless supplier truly works that way (Excel Family A does not).

Template points (Korean):

```text
티켓 안내는 이용일 기준 보통 7일 이내에 예약 시 입력한 이메일로 발송됩니다. 이메일 주소가 정확하고 첨부파일을 수신할 수 있는지 확인해 주세요.
모든 이용자의 영문 성명과 여권번호를 예약 시 입력해 주세요.
```

### Family B only — 上迪 / 北环 (passport entry, no pre-ticket)

Excel items 3–4 for both parks (must appear in intro + must-know + FAQ as appropriate):

3. **景区不预先提供电子票或纸质票**；出行当天所有旅客需 **护照识别入园**；务必携带护照。  
4. **3–11岁儿童须购儿童票，12岁及以上须购成人票**；儿童票不可单卖。

Do **not** copy Family A “出示邮箱电子票入园” as the main entry method.

#### 上迪 copy anchors

- Product name: `상하이 디즈니랜드 1일 입장권`
- One-line:

```text
상하이 디즈니랜드를 하루 동안 자유롭게 즐길 수 있는 1일 입장권입니다.
```

- Summary:

```text
상하이 디즈니랜드 1일 입장권
성인권과 아동권 선택 가능
사전 전자티켓/지류 티켓 없이 이용일 여권 인식으로 입장
```

- Entry/must-know core:

```text
본 상품은 이용 전 별도의 전자티켓이나 종이 티켓을 미리 제공하지 않습니다.
이용 당일 모든 방문객은 여권을 지참하고 여권 인식으로 입장해야 합니다.
티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 이메일로 발송될 수 있으나, 이는 안내 성격이며 사전 입장권 교부를 의미하지 않습니다.
만 3-11세는 아동권, 만 12세 이상은 성인권을 구매해야 합니다.
아동권은 단독 구매가 불가하며 동일 주문 내 성인권과 함께 구매해야 합니다.
모든 이용자의 영문 성명과 여권번호를 예약 시 정확히 입력해 주세요.
```

#### 北环 copy anchors

- Product name: `베이징 유니버설 리조트 1일 입장권`
- Same structure as 上迪: passport gate, no pre e-ticket/paper ticket, adult/child rules, email notice ≠ ticket, child not alone.

```text
본 상품은 이용 전 별도의 전자티켓이나 종이 티켓을 미리 제공하지 않습니다.
이용 당일 모든 방문객은 여권을 지참하고 여권 인식으로 입장해야 합니다.
```

#### Recommended FAQ set

**Family A:** email delivery; passport/name required for booking; adult-only if applicable; session times.  

**Family B:** email notice timing; **passport required for entry**; no pre-issued ticket; child not alone; age bands.

```text
Q: 전자티켓이나 종이 티켓을 미리 받나요?
A: 아니요. 본 상품은 사전 전자티켓/지류 티켓을 제공하지 않으며, 이용 당일 여권 인식으로 입장합니다. 예약 이메일로 안내가 발송될 수 있습니다.

Q: 아동권만 따로 살 수 있나요?
A: 아니요. 아동권은 동일 주문 내 성인권과 함께 구매해야 합니다.
```

### Family C (港迪 when allowed)

- E-ticket by email; **passport not required for entry**.
- Child not alone; age 12+ / 3–11.
- Do not use Family B passport-gate copy.

---

## Reservation Information (unified)

| Need | Family A | Family B (上迪/北环) | Family C (港迪 e-ticket) |
| --- | --- | --- | --- |
| Phone + email (order once) | Required | Required | Required |
| English name per traveler | Required | Required | Off unless supplier asks |
| Passport number per traveler | Required | Required | **Off** for entry (Excel 港迪) |
| Hotel / flight / pickup / luggage | Off | Off | Off |

Modal: `选择` = shown; `必填` = required. Per-traveler identity → **按數量**, not only 代表.

WhatsApp if needed and no field → additional request Korean:

```text
예약 후 연락 가능한 WhatsApp 번호를 입력해 주세요.
```

---

## Option Management Details

### Age-based UI pitfall

Translated labels may mis-map (e.g. `CHILDREN` shown as 嬰兒). Prefer internal type + rename display to `아동` for 3–11. Do not pick real infant type for child tickets.

### Family A session products

- Two options, adult price type each.
- Put session window in option name/description in Korean.
- Same sale period length for both sessions when inventory allows.

### Family B single day ticket

- One option `1일 입장권`.
- Adult + child price types as matrix above.
- Option description must mention ages + child not alone + passport entry (B only).

### Include/exclude recovery

If card shows `포함 사항 작성 부탁드립니다.`:

1. Open option edit.  
2. Check option-specific include override.  
3. Switch to 共同 or delete bad override; set `시설 입장료` + Korean exclude.  
4. Save include modal then option `下個`/save.  
5. Recheck card.

---

## Product Regulations / Voucher Notes

- Passport-entry (B): must-know and usage describe **bring passport → recognition entry**, not “show QR at gate from email ticket”.
- Email “7 days” is **delivery/notice timing**, not platform voucher SLA and not shortest book day.
- Soft warning shortest book `0` vs intro `7` days can remain when 7 = email timing only.
- Soft warning voucher issue `0h` vs intro `168h` same idea — do not invent voucher delay rules.
- Cancellation: if supplier only shows vague conditional/non-refundable labels, do not invent windows; use conservative setting or ask user.

---

## Automation Workflow (ticket only)

1. Read Excel `国内景区门票` row → classify Family A/B/C/D.  
2. Open supplier link; confirm ticket types, costs, entry method.  
3. Write Korean copy per family.  
4. Fill attributes → intro → regulations → options with **unified sale matrix**.  
5. Save options onto 選項管理.  
6. Stop; human temporary-save / approval.  
7. Self-check list below.  
8. Recap learnings into this skill when user asks.

---

## Hong Kong Disneyland Notes (Family C / D)

- If Excel says **NOL平台有和景区官方合作，不给上** → **do not list**.
- When listing is explicitly allowed later: e-ticket entry, no passport for entry, adult/child, child not alone, email delivery, prices from Excel **售价** as-is.
- Do **not** reuse 上迪/北环 passport-gate assumptions.

---

## Final Check

- [ ] Family A/B/C/D classified from Excel before fill  
- [ ] Ticket product, not transfer  
- [ ] Korean customer fields only  
- [ ] Sale settings match **unified matrix** for that family  
- [ ] Family A: two sessions, adult only, email ticket copy  
- [ ] Family B: one 1-day option, adult+child, child not alone, **passport entry / no pre-ticket** copy  
- [ ] Sale prices match Excel/screenshot **售价** as-is (no auto `/0.8`)  
- [ ] Reservation fields match family (passport per traveler for A/B identity rules)  
- [ ] Shortest book day not wrongly set to 7  
- [ ] Include warning cleared on option card  
- [ ] Stopped on 選項管理; approval not clicked  
- [ ] 港迪 not listed when batch forbids  

---

## Source Snapshot (workbook learning note)

File: `NOL 待上架产品 (1).xlsx` / sheet `国内景区门票` columns:

`产品 | 待上option/套餐 | 年龄档位 | 加价逻辑 | 售价hkd | 供应链 | 备注`

Reusable Excel defaults embedded above. When a new row appears, map it to Family A/B/C/D first, then apply the matching sale + copy block — do not invent a third hybrid pattern without user confirmation.
