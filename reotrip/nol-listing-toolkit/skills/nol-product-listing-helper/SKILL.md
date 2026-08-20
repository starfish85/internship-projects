---
name: nol-product-listing-helper
description: Assist with NOL product listing forms, especially Korean travel/private-car transfer products (Japan airport/station/port/attraction and China attraction transfers). Use when the user sends NOL admin screenshots, asks how to fill a field, says 怎么填/可以吗/怎么添加/继续上架, or wants to list a product from a task brief, Excel/CSV price table, or example listing. Distinguish transfer products from ticket products (use nol-domestic-ticket-listing-helper for tickets).
---

# NOL Product Listing Helper

Use this skill to answer field-by-field NOL listing questions and prepare copy, options, prices, policies, and review checks for Korean-facing **transfer** products. Do not use ticket-product flows for private-car transfers.

## Absolute Safety Stops

- **Never** click `批准請求`, `승인 요청`, `提交審核`, or any approval-submission control unless the user explicitly asks for approval submission **in that same turn**.
- If the user states a standing ban (e.g. “坚决不允许点击批准请求”), treat it as session-wide law. Temporary save only.
- **Default completion stop for Japanese hub/airport live runs (user 2026-08-05):** after all option cards exist on **選項管理 list** (`판매중`), **stop automation there**. Optional exact `臨時存儲` only. Do not keep driving the browser after the list looks complete unless the user asks.
- Final preservation when saving = exact `臨時存儲` + green/temporary-save toast. The approval button remaining visible afterward is normal and is **not** a prompt to click it.
- Never coordinate-click the bottom bar when `臨時存儲` and `批准請求` are adjacent. Enumerate buttons by exact text/DOM index.

## User Corrections That Override Old Habits (2026-08-04~05)

These are **hard process rules** learned from live Kansai (KIX) / Narita / **Itami (ITM)** / **Haneda edit** work. Prefer them over any older “URL shortcut” notes elsewhere in this skill or playbook.

**修改已有草稿（改预约、改价格类型等）** → 先读并严格执行  
`references/nol-draft-edit-save-playbook.md`（保存顺序、离开弹窗、简体文案、验收清单）。

1. **Strict source table**  
   Prices and route rows come only from the user’s Excel/CSV (e.g. `~/Downloads/NOL 待上架产品.xlsx` → sheet `日本接送产品`). Never invent HKD, holiday columns, or vehicle rows.

2. **No direct URL jump across registration steps**  
   Do **not** `goto` `/registration/introduction|regulations|option?...` to skip a page that is still incomplete. Advance only when the current page’s **`保存然後`/`保存然后` is enabled and clicked**, or when the **stepper** item is enabled and clicked.  
   (Historical note: older Haneda notes mentioned direct option URL when the stepper stuck. That is **last-resort only after regulations truly complete**; user forbids using URL as a routine bypass.)  
   **Never navigate while an option form is dirty** — see leave-dialog rule below.

3. **`保存然後`/`保存然后` is the completion gate (new section)**  
   A page is not “done” until that button is **clickable** (`disabled=false`). Grey button = missing required field (common: 私人的, theme, language, POI, 缩略图, 代表预约信息, voucher, blank cancel window, empty min qty). Fix the red/invalid fields; do not start filling the next major section.

4. **Attributes: always select 私人的**  
   Under `團體/私人`, select **`私人的`** (`input[name=tourTypes][value="0"]`). Unchecked → red `請選擇旅遊類型。` and both temp-save / save-then disabled.  
   **ITM pitfall:** the real checkbox is often **off-screen** (`boundingBox.x ≈ -9999`). Force-check on the input can fail; **mouse-click the visible label** (text starts with `私人的`). Exact `getByText('私人的')` may timeout when label text is multi-line.

5. **Regulations: 代表预约信息 is required**  
   Empty shows red `须填写「代表预约信息」…` / `您必須輸入代表預訂信息…` and blocks save-then. Open the modal, tick required ids, confirm with **`已选`/`已選`**, verify summary lists phone/flight/hotel/etc.  
   Prefer **real mouse clicks** on each required control; re-check until the **page summary** lists the fields.

6. **Option form save order（用户硬规则，修改必用）**  
   - **修改已有选项**：改完后必须 **`临时保存` → `下一个`**（繁体：`臨時存儲` → `下個`）。用户：*「先点临时保存再点下一个」*。  
   - 只点「下一个」、或只匹配繁体文案导致点空 = **没保存**。  
   - 表单打开时 footer 有较窄的 `临时保存`(≈120px) + 宽 `下一个`(≈600px)；**优先点表单 footer**，不要误点页底 `提交审核`。  
   - 新建选项至少保证 `下一个` 落卡；修改场景不可省略 `临时保存`。  
   细节见 `nol-draft-edit-save-playbook.md`。

7. **离开确认弹窗 = 没保存（用户硬规则）**  
   文案：`有变化…更改将丢失…确定要离开吗？`  
   - **消除** = 留下继续保存；**确定** = 丢改离开。  
   - 出现此窗说明未走完临时保存流程；点消除后先 **临时保存→下一个**，禁止点确定逃页。

8. **Stop on option list**  
   When four cards show (go/return × 7/10) with `판매중` / `可销售` / `可供出售`, stop. User: **「以后就停在这里」**.

9. **Introduction images: 썸네일 only (user 2026-08-05 ITM)**  
   Product photos go under **`썸네일 이미지` → `상품 이미지 등록(3개 이상)`**, **not** under **`프로그램 이미지`**.  
   Never use `input[type=file].last()` blindly; bind the **first** image file input under the 썸네일 / 상품 이미지 section.

10. **Step-by-step when the user asks to “边操作边展示 / 像真人鼠标”**  
    Announce → one click/fill → report result → wait. Do not silent-batch the whole product unless the user opts into autonomous multi-step.

11. **Price-type name must be Korean (audit 2026-08 post-review)**  
    Do **not** use English short codes such as `5seat go` / `7seat rtn` / `10seat return` in **价格类型名称**.  
    Use Korean names: `5인승 가는` / `7인승 가는` / `10인승 오는` 等.  
    **说明** stays Korean vehicle text: `7인승 차량`.  
    修改时流程见 playbook §5.B；改完 **临时保存→下一个**，再打开弹窗读 value 验收。

12. **Japan hub/attraction times always start 07:00 (not 09:30)**  
    Default slots: **`07:00`–`21:30` every 30 minutes → 30 slots**. Last slot is **21:30** (not 21:00).  
    **简体 UI 真路径（大阪站 2026-08 踩坑）：**  
    已有时段 → 点时间段旁 **⋯（`더 보기`）→ 菜单「编辑」**（不要只点 `21:00` 文字）。  
    清空错误行 → **「重复 小时 添加」** → 07:00 / 21:30 → **「分钟」30** → **「生成」**（扩展可能显示 **「一代」**）→ 弹窗 **「保存」**。  
    **未点生成就保存 = 只剩一条 `21:00`（用户已截图否决）。**  
    验收只读 **「时间段」下一行** compact 列表，禁止用整页 `HH:MM` first/last 冒充通过。

13. **UI language may be Simplified Chinese**  
    Live partner UI often shows `临时保存` / `下一个` / `保存然后` / `修改选项` / `选择价格类型` / `已选` / `提交审核` / `设置时间` / `重复 小时 添加`.  
    Scripts that only match 繁体 `臨時存儲`/`下個`/`設定時間` will fail silently. Always match 简+繁+韩.

14. **Never click 提交审核**  
    Same ban as `批准請求`. Bottom bar often has `临时保存` | `提交审核` side by side.

15. **Excel 红字逐条改（用户 2026-08）**  
    表格红字 = 待办。**改完一个就停，汇报，等用户检查，再下一个。**  
    映射见 `nol-draft-edit-save-playbook.md` §0。

16. **大阪站 ≠ 新大阪站**  
    产品/选项/介绍/包含 **禁止** `신오사카역` / `오사카역/신오사카역`；只写 **`오사카역`**。  
    （旧 skill 示例若仍写双站，以本条与用户红字为准。）

17. **打开草稿要点卡片中部**  
    `div[class*="slot___StyledContainer4"]` + **mouse.click**；只点标题小 div 可能进不去。

## Operating Mode

- Infer the current field from the screenshot, page title, visible validation message, or the user's short follow-up.
- Answer with the exact value or action first; add brief reasoning only when it prevents a likely mistake.
- For screenshot-only follow-ups, continue from the last active product context.
- Use Chinese for operational guidance. Every customer-facing text or typed free-text value in NOL, including option include/exclude popups, must be paste-ready Korean unless the field is explicitly internal-only.
- Never invent route, vehicle capacity, date range, holiday price, confirmation rule, or cancellation rule. Ask for the single missing item when it changes the listing.
- When the user asks to continue listing inside the NOL partner center, load and follow `references/nol-transfer-live-listing-workflow.md` before operating the browser. Treat it as the execution checklist for full product listing, option creation, sales calendar overrides, saving, and review-safe stopping.
- For direct browser operation, also load `references/nol-partner-browser-playbook.md`. Use its selector patterns, fill order, verification snippets, and recovery logic instead of rediscovering the page behavior from scratch.
- When the user asks to **fix / 改 / 修复** an existing draft (预约、价格类型韩文、时段、选项字段等), load **`references/nol-draft-edit-save-playbook.md` first**. Hard rules: leave dialog = unsaved; option edit ends with **临时保存 → 下一个**; never 提交审核. Reuse script pattern `nol-listing-automation/fix-haneda-resv-pt.mjs` when automating.
- For Tokyo city hotel ↔ Tokyo Disney Resort, Tokyo Station/Tokyo Port/Yokohama Port, **Osaka Station (`오사카역` only)**, Osaka city hotel ↔ Universal Studios Japan, or similar hotel/transport-hub/private-attraction transfer listings, also load `references/tokyo-disney-transfer-live-notes.md`.
- For Tokyo city hotel ↔ Haneda Airport (HND) or other Japanese airport transfers (Narita/NRT, Kansai/KIX, Itami/ITM), also load `references/haneda-airport-live-notes.md`. Airport products need flight reservation fields, `항공권` exclude wording, fixed Japan pricing (no holiday overrides), and option-form pitfalls.
- For Osaka city hotel ↔ Kansai Airport (KIX), also load `references/kansai-airport-live-notes.md` (prices `99`/`133`, live draft id, page-gate pitfalls from 2026-08-04~05).
- For Osaka city hotel ↔ **Itami / Osaka International Airport (ITM)**, also load **`references/itami-airport-live-notes.md`** (prices **`77`/`105`**, 썸네일 image pitfall, 私人的 label click, POI `오사카 국제공항`, draft id `88b3861b-…`).
- For Osaka city hotel ↔ Universal Studios Japan listings, also load `references/osaka-universal-studios-live-notes.md`.
- For Osaka city hotel ↔ Osaka Port listings, also load `references/osaka-port-live-notes.md`.
- For Tokyo city hotel ↔ Yokohama Port listings, also load `references/yokohama-port-live-notes.md`.
- For Beijing attraction transfer listings, run the workflow directly from the skill and references when data is present.
- If the user asks to show the whole input process, announce the exact field values before entering each major section and report the saved result after each section.
- When the user says to create another option, always use `註冊/添加選項` to make a new option card. Do not use `옵션 수정하기` unless the user explicitly asks to edit an existing saved option.
- If the product list already shows the target Korean route name as an UNPUBLISHED draft, **resume** it. Do not create a duplicate.

## Inputs To Collect

- Route and scope: city, origin area, destination, direction, pickup/drop-off scope.
- Vehicle details: vehicle size, usable passenger capacity, luggage capacity, and night surcharge rule.
- Price table: normal price, special dates, holiday prices, currency (**Excel only**).
- Availability: sales period, use period, operating days, time slots.
- Policy: confirmation SLA, voucher method, cancellation cutoff, inclusions, exclusions, and required reservation information.
- Images: user prompt attachments or Downloads basename matches.

## Field Flow

### Product Attributes

- Product name pattern: `{출발지} ↔ {도착지} 단독 차량 편도 이동 서비스`.
- One-way option name pattern: `{출발지} 출발 → {도착지} 편도 이동 ({차량})`.
- Partner product name: use the internal Chinese route name from Excel, such as `大阪市区-关西机场(KIX)`.
- Subtitle: leave blank unless a short, non-duplicative differentiator is needed.
- Usage type: choose use date specified at booking.
- Product category: choose `运输货物` / transportation goods.
- Theme/category: choose `기사제공차량` via `選擇類別（主題）` → tick → `已選`.
- Person limit: choose yes for vehicle-capacity products.
- **Travel type: private — must select `私人的`** (`tourTypes` = `0`). Not optional. Prefer visible-label mouse click when the checkbox is off-screen.
- Min/max participants: use min `1`; max is the vehicle's usable passenger cap (airport 7/10 products: product max often `9`). Do not leave fields at `0`.
- Nationality: choose no restriction unless the task brief limits nationality.
- Progress language: choose Korean (`選擇你的语言` → `韓語` → `已選`).
- Area/location: `添加地區和地點` → search + **Enter/search button** → pick official airport/attraction POI (not nearby hotels) → `添加地點` → location type **`旅遊地` / `TRAVEL_PLACE`** → final **`添加`**.  
  Examples: KIX → `간사이 국제공항`; ITM → search `이타미 공항` → **`오사카 국제공항`**.

### Product Introduction

- Write one-line marketing copy in Korean, focused on private transfer convenience.
- Write exactly three summary lines.
- Write product introduction that states route, included transfer, driver/vehicle, pickup method, and who the service suits.
- **Upload at least three product images into `썸네일 이미지` / `상품 이미지 등록(3개 이상)` only.**
  - There is a second zone **`프로그램 이미지`** (optional program/description images). **Do not** put listing photos there.
  - Bind the **first** `input[type=file][accept*="image"]` under 썸네일 / 상품 이미지 — not `.last()`.
  - Success criteria: three thumbs visible **in the 썸네일 section** and red `必須至少註冊 3 個縮略圖。` gone. Counting any `img` on the page is insufficient.
  - If images were uploaded to 프로그램 by mistake, delete each with the red **×** and re-upload to 썸네일.
- When the user supplies exact product images in the prompt, use those files rather than searching for substitute images. Copy them into a workspace upload-ready folder first when needed, then upload every supplied relevant image unless the user specifies a smaller set.
- When product images are required in live listing, first search the user's Downloads folder (`~/Downloads`) for three files whose basename is similar to the Chinese scenic-spot/product name.
- Prepare upload-ready copies by changing only the copy's suffix to `.jpg` or `.png` when needed. Keep originals in Downloads unchanged.
- Schedule type for simple transfer products: `NONE` (没有单独的时间表).

### Product Rules

- Confirmation: manual confirmation; confirmation time `3` business days (Japan transfer notes) unless brief differs.
- Voucher: reservation information / no exchange (`예약정보로 확인` + `無需換貨`). Template name may reference another product; method text is what matters.
- Include: customer-facing Korean only, e.g. route + parking under TRANSPORTATION; `픽업/샌딩 서비스 및 주차비 포함` under PICK_UP / OTHER as needed.
- Must-know / how-to-use / FAQ: luggage, WhatsApp/SMS, no voucher, 2-day change notice, flight fields for airport, round-trip = two one-ways, **no mid-route stops**.
- **Standard FAQ (add for all private one-way transfers, Disney/USJ audit):**
  - Q: `중간에 다른 장소에서 승하차할 수 있나요?`
  - A: `본 서비스는 출발지에서 목적지까지 바로 이동하는 지점 간 전용 차량 서비스입니다. 중간 경유지 추가 또는 중간 승하차는 제공되지 않습니다.`
- Cancellation: cancellable; partner **`是（手动取消）` / `예 (수동취소)`** — not auto cancel. `2` business days before use, `0%` fee, `100%` refund; after cutoff non-refundable.
- **Do not** click `添加` for a second cancel window if `windows.0` already has 2/0 — blank `windows.1` invalidates the form.
- Soft warnings (3-day book vs 2-day change copy; voucher 0h vs 72h) can remain if `保存然後` works.

### Reservation Information

- Required fields should be the minimum necessary for operation.
- For hotel/attraction/station/port transfers, require phone, email, English name, departure date/time, hotel address, pickup point, pickup time, drop-off point, Kakaotalk ID, messenger ID, passenger count, and luggage count. Keep airport flight ids **off**.
- For **airport** transfers, **also** require flight fields (arrival/departure flight number and times, etc. — full id list in `haneda-airport-live-notes.md` / `kansai-airport-live-notes.md`). Turn flight ids **on** only for airport products.
- Modal confirm control may show as `已選` rather than `節省`.
- After confirm, the summary under 代表預約信息 must list selected fields. Red “您必須輸入…” = not done.
- Prefer real UI clicks on `[role=checkbox]` rows over assigning `input.checked = true` only (React may ignore synthetic checked).

### Option Management

- Create separate options for each direction and vehicle size via **`註冊/添加選項`** only.
- Option description must include route, vehicle size, usable passenger cap, and luggage cap.
- Price type: `기타 가격 타입 (직접 입력)` / `其他價格類型（手動輸入）`.
- **價格類型名稱 (Korean only):** `{N}인승 가는` (outbound) / `{N}인승 오는` (return).  
  Examples: `5인승 가는`, `7인승 가는`, `10인승 오는`.  
  **Deprecated:** English codes `5seat go`, `7seat go`, `7seat rtn`, `10seat return` (audit correction 2026-08).
- **價格類型說明:** `{N}인승 차량` (already Korean; keep).
- Mark both **required purchase** and **representative** via `role=checkbox` (`aria-labelledby="ETC-required-label"` / `ETC-representative-label`).
- After price-type `완료`, **re-fill the option name** (NOL overwrites with display description).
- Sale period: prefer `1年` (`input[value="ONE_YEAR"]`). Price stays disabled until period exists.
- Fill price **once** (double-fill can produce `7070` style bugs).
- Verify prices from **calendar cells**, not list cards alone.
- Times (Japan hub / airport / Disney / USJ / port / station): **`07:00`–`21:30` / 30 min / 30 unique slots**.  
  **Never** use `09:30` as the first slot for USJ or other Japan private transfers unless Excel explicitly says so.  
  Sequence (韩/繁): `設定時間` → `반복 시간 추가` → `07:00` / `21:30` → `30 分鐘` → **`생성`** → popup `節省` → form **`下個`**.  
  Sequence (简体，已有时段): ⋯`더 보기` → **编辑** → 删旧 → **重复 小时 添加** → `07:00`/`21:30` → **分钟 30** → **生成/一代** → **保存** → **临时保存→下一个**.  
  **Must click generate before modal save.** Verify via **时间段** compact line only.
- Japan fixed fleet: **no** holiday calendar overrides unless Excel says otherwise.
- After all cards exist: **stop on list**; optional `臨時存儲`; never approval.
- **Osaka Station copy:** destination is **`오사카역` only** — never bundle `신오사카역` in product/option/intro/include text.

## Live Listing Workflow

When operating the partner center directly, use `references/nol-transfer-live-listing-workflow.md` + `references/nol-partner-browser-playbook.md`.

Page order (do not skip):

```text
產品列表 resume/create
  → 產品屬性 (含 私人的) → 保存然後 enabled → click
  → 產品介紹 (文案+图片+NONE) → 保存然後 enabled → click
  → 產品法規 (截单3天、包含、代金券、代表预约、取消2天0%) → 保存然後 enabled → click
  → 選項管理 stepper if needed
  → 四个选项 (註冊/添加選項 … 下個) ×4
  → STOP on option list (+ optional 臨時存儲)
```

### Fast path — Japanese airport / hub (7-seat + 10-seat)

1. Read Excel row(s); fix Chinese internal name, Korean product name, four prices.
2. Resume UNPUBLISHED draft by clicking product **card** (`slot___StyledContainer4`); `修復` is often text, not a button.
3. Fill attributes including **私人的**; wait for `保存然後`.
4. Intro + images + Korean copy; wait for `保存然後`.
5. Regulations: full reservation (airport flight ids), voucher, include Korean, cancel manual; wait for `保存然後`.
6. Create four options; each ends with times `생성` + **`下個`**.
7. Stop on option list; optional `臨時存儲`; **never** `批准請求`.

### Fast path — Beijing (holiday overrides)

Unchanged: three price tiers, calendar segments one at a time after cards exist, then `臨時存儲` only.

## Airport Reference Map

| Route internal | Notes file | Prices (HKD 7/10) |
| --- | --- | --- |
| `东京市区-羽田机场` / HND | `haneda-airport-live-notes.md` | 70 / 105 |
| `东京市区-成田机场(NRT)` | haneda notes pattern + NRT names | 112 / 175 |
| `大阪市区-关西机场(KIX)` | **`kansai-airport-live-notes.md`** | **99 / 133** |
| `大阪市区-大阪国际机场（伊丹机场）(ITM)` | **`itami-airport-live-notes.md`** | **77 / 105** |

## Detailed live order (Japan airport 7/10) — ITM-validated

```text
1) 產品屬性
   title/managementTitle → FIXED use-date → 運輸貨物
   → 選擇類別（主題）기사제공차량 → 已選
   → 有人數限制 是 → 最少1 最大9
   → 私人的 (mouse on visible label)
   → 進度語言 韓語 → 已選
   → 添加地區和地點 → search+Enter → airport POI → 旅遊地 → 添加
   → wait 保存然後 enabled → click

2) 產品介紹
   headline / highlight / description / checkList / usage (Korean)
   → scheduleType NONE
   → 썸네일 상품 이미지 ×3 (NOT 프로그램)
   → wait 保存然後 enabled → click

3) 產品法規
   min book day 3; qty 1–10; MANUAL confirm 3 DAYS
   → cancel 가능 + 예(수동취소) + windows.0 = 2 / 0%  (no 添加 blank row)
   → 撰写 include: TRANSPORTATION + PICK_UP Korean + exclude → 節省
   → 代表預約信息: airport required ids via mouse → 已選 → summary non-empty
   → 代金券: 예약정보로 확인 · 無需換貨
   → wait 保存然後 enabled → click (or stepper 選項管理 if URL stuck)

4) 選項管理 ×4
   註冊/添加選項 → name/desc/qty
   → 가격 타입 선택 → 기타 가격 타입
      → 名稱 Korean e.g. 7인승 가는 (NOT 7seat go) / 說明 7인승 차량
      → 1–10 + required+대표 → 완료
   → re-fill option name
   → ONE_YEAR → price once → 設定時間 → 반복 → 07:00–21:30 (never 09:30 default) → 30분 → 생성 → 節省
   → 下個 → confirm card on list
   → after four cards: 臨時存儲 optional → STOP (never 批准請求)
```

### Post-review audit notes (Disney + USJ + 东京港, 2026-08)

Reviewed drafts (regulations/options corrected on platform; skill must match):

| Product | Draft id (UNPUBLISHED at audit) |
| --- | --- |
| 东京迪斯尼接送 | `462b9cef-c378-45d7-afd5-9b44f364b378` |
| 大阪环球影城接送 | `4b49b221-a013-4420-9def-ffddfc09a310` |

Corrections applied in skill from that package:

1. FAQ mid-stop Q&A (Korean) — required for private point-to-point transfers.
2. Price-type **name** English → Korean.
3. USJ / Japan times first slot **07:00**, not 09:30.
4. Port products (e.g. 东京港): never leave 代表預約信息 empty — red block stops save; re-check regulations section completeness.

## Automation / CDP Runtime Pitfalls (Grok)

- Chrome CDP needs non-default `--user-data-dir` + `--remote-debugging-port=9222 --remote-allow-origins=*`. Launch the Chrome binary directly; `open -a Chrome --args …` often fails to bind the port.
- **One Playwright CDP session at a time.** Parallel `node` scripts on the same tab cause freezes and “stuck” UI. Kill leftover automation before continuing.
- Long multi-option scripts exceed tool timeouts and look hung — split work and log per option (or run step-by-step when the user wants a visible trail).
- After page fills, re-check `保存然後` / `臨時存儲` `disabled` before claiming progress.
- Hidden React checkboxes (私人的, reservation rows): **visible label / mouse click**, then re-read `checked` and **page summary**, not only `input.checked` mid-script.
- Image upload: **section context first**, then file input; never assume any on-page `<img>` count means 썸네일 is done.
- POI: type alone may return empty results until **Enter/search**; second-stage **旅遊地 + 添加** is required after `添加地點`.

## Product List Resume Pattern

Draft rows are clickable `div` cards (class often includes `slot___StyledContainer4`), not anchors. Click the card whose text matches the Korean product name. Confirm URL `id=` and title before editing.

## Shanghai Yu Garden Reference

When the product is Shanghai city hotel to Yu Garden, load `references/shanghai-yuyuan-transfer.md`.

## Final Check

Before saying the listing is ready, apply `references/fill-flow-checklist.md`, plus:

- [ ] Excel prices match option calendars when checked
- [ ] `私人的` selected; theme `기사제공차량`; language Korean; POI set
- [ ] 썸네일 **≥3** images under 상품 이미지 (not only under 프로그램)
- [ ] 代表預約信息 summary non-empty for airport/transfer (flights on for airports)
- [ ] Four option cards (when 7/10 go-return pattern) with `下個` each
- [ ] Stopped on **option list** (Japan runs) without clicking approval
- [ ] Explicit report: **`批准請求` was not clicked**
