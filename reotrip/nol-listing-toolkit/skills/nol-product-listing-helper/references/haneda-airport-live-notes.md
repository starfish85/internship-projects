# Haneda Airport (HND) Transfer Live Notes

Use this reference for Tokyo city hotel ↔ Haneda Airport (HND) private transfer listings, and as the template for other Japanese airport transfers (Narita/NRT, Kansai/KIX, Itami/ITM) with the same 7-seat/10-seat go/return pattern.

Prefer this file after reading `tokyo-disney-transfer-live-notes.md`. Airport products differ from station/port products mainly in: flight-info reservation fields, Korean flight wording, and exclude text (`항공권` not ship/train tickets).

## Hard Safety Stops

- **Never** click `批准請求` / `提交审核` / `승인 요청` unless the user explicitly requests approval in the **same turn**.
- User may restate this as absolute policy (e.g. “坚决不允许点击批准请求”). Treat that as standing order for the whole session.
- Prefer exact text/DOM selection for bottom-bar buttons. Never coordinate-click near temp-save / approval.
- **Page gate (2026-08-05 user):** do not skip pages with raw registration URLs; wait until save-then is enabled; select **私人的**; fill **代表预约信息** before leaving regulations; after four options exist, **stop on the option list** (optional temp-save only).
- **Edit / fix this draft (2026-08 audit):** follow `nol-draft-edit-save-playbook.md`.  
  - Option edits: **`临时保存` → `下一个`** (user: 先临时保存再下一个).  
  - Leave dialog = not saved → 消除 and save, never 确定 discard.  
  - Live UI was **简体** on HND: `临时保存` / `下一个` / `修改选项` / `已选` / `选择价格类型`.  
  - Automation template: `nol-listing-automation/fix-haneda-resv-pt.mjs`.

## Post-audit fix status (2026-08)

Draft `b6e560d4-d4d3-4726-b08c-f5623499895a`:

| Item | Status after fix |
| --- | --- |
| 代表预约（含航班） | Filled; summary shows phone/email/names/flights/hotel/pickup…; red gone |
| 价格类型 | `7인승 가는` / `10인승 가는` / `7인승 오는` / `10인승 오는` (dialog value PASS) |
| 保存 | 每选项 临时保存→下一个；未点提交审核 |

## Live Source Data (Haneda 2026-08-04)

| Source row | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Tokyo city hotel → Haneda (HND), 7-seat | `70` |
| `10座去程` | Tokyo city hotel → Haneda (HND), 10-seat | `105` |
| repeated `7座去程` | Haneda (HND) → Tokyo city hotel, 7-seat | `70` |
| repeated `10座去程` | Haneda (HND) → Tokyo city hotel, 10-seat | `105` |

- Spreadsheet sheet: `日本接送产品`.
- Viator reference used in workbook: Private One-Way Transfer between Haneda Airport and Tokyo Hotel.
- Japan fleet cost is fixed → **no** Labor Day / National Day / Spring Festival holiday overrides.
- Time window from product notes: `7:00 ~ 21:30`, every 30 minutes → **30** slots.
- Cutoff: book at least **3** days ahead.
- Images: user `羽田机场1.jpg` / `羽田机场2.jpg` / `羽田机场3.jpg` (also package `upload-ready-images/haneda-airport/haneda-airport-*.jpg`).

When four rows repeat `7座去程`/`10座去程`, infer the second pair as return.

## Product Identity

- Product name: `도쿄 시내 호텔 ↔ 하네다공항(HND) 단독 차량 편도 이동 서비스`
- Partner/internal name: `东京市区-羽田机场`
- Theme: `기사제공차량` / transportation goods
- Product-level max people: `9` (largest usable capacity is 10-seat / 9 pax)
- Location/POI: real Haneda POI, live run used `하네다 국제공항`
- Draft id from live run (resume if still UNPUBLISHED): `b6e560d4-d4d3-4726-b08c-f5623499895a`

If product list already shows this Korean name, **resume** that draft. Do not create a duplicate.

## Images

```text
/Users/mac/Downloads/羽田机场1.jpg
/Users/mac/Downloads/羽田机场2.jpg
/Users/mac/Downloads/羽田机场3.jpg
```

Copy into workspace `upload-ready-images/haneda-airport/` when needed. Upload all three; set a clear destination image as representative. Do not invent substitute images when user-supplied files exist.

## Korean Copy Requirements

One-line marketing (example used live):

```text
도쿄 시내 호텔과 하네다공항(HND)을 편안하게 연결하는 단독 차량 이동 서비스입니다.
```

Three summary lines (example):

```text
도쿄 시내 호텔 ↔ 하네다공항(HND) 편도 전용 차량 이동
공항 도착/출발 시간에 맞춘 프라이빗 픽업 및 샌딩
7인승·10인승 차량 중 인원과 수하물에 맞게 선택 가능
```

High-visibility booking-field sentence (put in introduction + 一定要知道 + 如何使用):

```text
예약 시 도쿄 시내 호텔명/주소, 하네다공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
```

Required copy points:

1. No separate voucher/ticket exchange.
2. Driver usually contacts one day before via WhatsApp or SMS; phone must be reachable (WhatsApp preferred).
3. Customer must verify route, places, time, address, passenger count, luggage, **flight number and arrival/departure time**.
4. Changes need at least **2 days** notice before use.
5. Not included: airline tickets, child seat, night surcharge, tips, personal expenses, extra stops.
6. Round-trip = book each direction separately.

Schedule type on introduction page: `NONE` (no separate itinerary).

## Product Rules

- Minimum reservation lead time: `3` days.
- Purchase quantity: `1 ~ 10`.
- Inventory: not managed.
- Confirmation: manual, `3` business days.
- Voucher: `예약정보로 확인` + `無需換貨` (reuse existing template such as `[5seat From Beijing Central District to Beijing Universal Studios ]` if present).
- Voucher warning `0小时` vs product `72小时` is acceptable when save remains available.
- Cancellation: cancellable, partner manual `是（手动取消）`, `2` business days before use, `0%` fee, `100%` refund; after cutoff non-refundable.
- Soft warning that lead time `3` days differs from copy mentioning `2` days for changes can be saved when allowed; meanings differ (book cutoff vs change notice).

### Include / Exclude (customer-facing Korean)

Include modal fields (live):

- `TRANSPORTATION` description: `도쿄 시내 호텔 ↔ 하네다공항(HND) 편도 전용 차량 이동 및 주차비 포함`
- `PICK_UP` description: `픽업/샌딩 서비스 및 주차비 포함`

Exclude example:

```text
항공권, 공항 이용료, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.
```

Do **not** paste Chinese include text into customer-facing fields.

### Airport reservation-info required IDs

```text
CELLPHONE-required
EMAIL-required
ENGLISH_LAST_NAME-required
ENGLISH_FIRST_NAME-required
DEPARTURE_DATE_TIME-required
ARRIVAL_FLIGHT_NUMBER-required
ARRIVAL_DATE_TIME-required
DEPARTURE_FLIGHT_NUMBER-required
HOTEL_NAME-required
HOTEL_ADDRESS-required
PICKUP_AREA-required
PICKUP_TIME-required
SENDING_AREA-required
BOOKED_TIME-required
KAKAO_TALK_ID-required
MESSAGING_APP_ID-required
NUMBER_OF_PEOPLE-required
NUMBER_OF_SUITCASES-required
```

For **airport** products, flight-related ids **should be on**. For station/port/attraction products, keep flight ids **off**.

Modal confirm control may show as `已選` (selected count), not always `節省`.

## Vehicle Capacity

- 7-seat: max **4** passengers + **5** pieces of ≤24-inch luggage.
- 10-seat: max **9** passengers + **10** pieces of ≤26-inch luggage.

Normalize source typos like `9人+9人+10个行李` → 9 pax + 10 bags.

## Options

| # | Option name | 價格類型名稱 (Korean) | 說明 | HKD |
| --- | --- | --- | --- | ---: |
| 1 | `도쿄 시내 호텔 출발 → 하네다공항(HND) 편도 이동 (7인승 차량)` | `7인승 가는` | `7인승 차량` | 70 |
| 2 | `도쿄 시내 호텔 출발 → 하네다공항(HND) 편도 이동 (10인승 차량)` | `10인승 가는` | `10인승 차량` | 105 |
| 3 | `하네다공항(HND) 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)` | `7인승 오는` | `7인승 차량` | 70 |
| 4 | `하네다공항(HND) 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)` | `10인승 오는` | `10인승 차량` | 105 |

English codes `7seat go` / `7seat rtn` are **deprecated** (2026-08 audit).

Outbound 7-seat description:

```text
도쿄 시내 호텔 출발 → 하네다공항(HND) 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)
24인치 이하 수하물 기준: 최대 5개까지 적재 가능
별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Outbound 10-seat description:

```text
도쿄 시내 호텔 출발 → 하네다공항(HND) 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)
26인치 이하 수하물 기준: 최대 10개까지 적재 가능
별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Mirror wording for return options (airport → hotel).

For every option:

1. Open with `註冊/添加選項` (new card only).
2. Fill name + description + option purchase qty `1~10`.
3. Price type: `기타 가격 타입 (직접 입력)` → **Korean** name (`7인승 가는` / `7인승 오는`) + description (`7인승 차량`) + `1~10`.
4. Tick **both** required-purchase and representative via `role=checkbox` containers:
   - `[aria-labelledby="ETC-required-label"]` (label text may show `必需品购买`)
   - `[aria-labelledby="ETC-representative-label"]` (label text `대표가`)
   - Clicking only the text node is not enough; click the `role=checkbox` parent.
5. Click price-type popup `완료`.
6. **Immediately re-fill option name** — NOL often overwrites the option name with the price-type description (e.g. `7인승 차량`).
7. Sale period: select `1年` radio (`input[value="ONE_YEAR"]`). Price field stays **disabled** until a period is chosen.
8. Fill price into `請輸入價格` once only. Double typing caused `7070` when value was already `70`.
9. Verify calendar cells show the intended price (e.g. `70` / `105`), not thousands-with-comma mistakes.
10. Time slots → then option-form `下個`.
11. Confirm new card appears with `판매중` before next option.

Sale period reality: quick `1年` on 2026-08-04 produced `2026-08-04 ~ 2027-08-04`. Report actual retained period; do not claim disabled past dates were selected.

## Time Popup Exact Sequence

Target: `07:00` through `21:30` every 30 minutes = **30** unique slots.

1. `設定時間`
2. `반복 시간 추가`
3. First start: `07:00` (hour list then minute list; do not click global `00` which can reset hour)
4. Last start: `21:30`
5. Interval: `分鐘` → `30` (if picker auto-closes, do **not** click stale `確定`)
6. `생성` / generate — **required** before save
7. Verify unique times start `07:00`, end `21:30`, count 30 (raw match may be 60 due to nested DOM text; count unique)
8. Popup `節省`
9. Option form `下個`

If generate list never appears, time is **unverified** until repaired.

## Sales Calendar

- Japan fixed pricing: **do not** set October / February / May holiday overrides.
- After save, list cards do not show prices. Reopen calendar or option edit; calendar cells are source of truth.
- Reopened `請輸入價格` may be disabled and blank while cells still show correct prices — do not treat blank disabled input as missing price.

## Regulations Page Pitfalls

- Stepper `選項管理` may stay `aria-disabled=true` while `保存然後` is disabled — almost always because a **required field is still empty** (私人的 on attributes, 代表預約信息, voucher, blank cancel row), not because of soft warnings alone.
- Prefer fixing fields until `保存然後` enables, then click it or the enabled stepper. Direct option URL is **last resort only** after the page is truly complete (user forbids routine URL skip).
- `minimumPurchaseDay` may show `aria-invalid=true` because intro copy mentions 2-day change notice vs 3-day book cutoff. Soft warning; do not flip cutoff to 2 just to silence it.
- After temporary save of rules, reservation-info summary can appear empty until re-opened; re-check required ids if summary is blank.
- Include descriptions live in `#inclusions_TRANSPORTATION_description` and `#inclusions_PICK_UP_description` after checking those inclusion boxes.
- For KIX live data and page-gate details, load `kansai-airport-live-notes.md`.

## Browser / Runtime Pitfalls (Grok / non-Codex)

- Codex `browser-client` privileged pipe may be unavailable outside Codex (`browser-client is not trusted`).
- Working fallback used on 2026-08-04:
  1. Chrome remote debugging requires a **non-default** `--user-data-dir` (default profile rejects CDP).
  2. Copy profile essentials into e.g. `/tmp/chrome-nol-debug-profile` (rsync Default excluding heavy caches).
  3. Launch Chrome with `--remote-debugging-port=9222 --remote-allow-origins=*`.
  4. Playwright `chromium.connectOverCDP('http://127.0.0.1:9222')`.
- `open -a "Google Chrome" --args --remote-debugging-port=9222` alone often fails (flag present but port not listening). Prefer direct binary launch with explicit user-data-dir.
- AppleScript JS injection may be disabled in Chrome; do not rely on it.
- Session name recommendation when using any automation: `NOL上架-不提交审核`.

## Product List Resume Pattern

Draft cards are clickable `div` containers (not anchors). Click the card container matching the Korean product name (class often includes `slot___StyledContainer4`), or the first `修復` for that row. Confirm URL contains the expected product `id` and Korean title before editing.

## Final Verification Checklist

Before reporting completion:

- [ ] Four option cards visible with exact go/return + 7/10 seat names
- [ ] Prices 70 / 105 / 70 / 105 verified from calendar cells
- [ ] Each option time line shows `07:00 · … · 21:30` (30 slots)
- [ ] All three Haneda images present on introduction
- [ ] Flight-related reservation fields required for airport product
- [ ] Include/exclude Korean; no Chinese include snippets
- [ ] No holiday overrides for Japan fixed-price fleet
- [ ] `臨時存儲` clicked and toast observed
- [ ] **`批准請求` was not clicked** (state explicitly in final report)

## Reuse For Other Airports

Replace destination Korean name, internal Chinese name, POI, prices, images, and booking-field airport code:

| Route internal | Korean destination sketch | Notes |
| --- | --- | --- |
| `东京市区-成田机场(NRT)` | `나리타공항(NRT)` | Prices **112 / 175** HKD; draft `60557c54-6c11-4b0e-9e04-df85c0d3e78b`; 2026-08 audit: resv OK (flights); PT fixed to Korean via `audit-fix-narita.mjs` |
| `大阪市区-关西机场(KIX)` | `간사이공항(KIX)` | **Use `kansai-airport-live-notes.md`** — live prices **99 / 133** HKD |
| `大阪市区-大阪国际机场（伊丹机场）(ITM)` | `이타미공항(ITM)` | Osaka city hotel wording |

Keep: 3-day cutoff, 07:00–21:30 × 30 min, no Japan holiday markup, no-voucher + WhatsApp copy, stop on option list + temp-save only (never approval).
