# Kansai Airport (KIX) Transfer Live Notes

Use this reference for Osaka city hotel ↔ Kansai Airport (KIX) private transfer listings. Pair with `haneda-airport-live-notes.md` for shared airport patterns, and with `nol-partner-browser-playbook.md` § Page Gate / User Corrections (2026-08-04~05).

## Hard Safety Stops (User Session Law)

- **Never** click `批准請求`, `승인 요청`, or approval-submission unless the user asks **in the same turn**.
- **Stop automation at the option list page** once four options exist with `판매중`. Do **not** continue into extra post-list workflows. User instruction (2026-08-05): **「以后就停在这里」** = stop on the options list (cards + `臨時存儲` / `批准請求` visible).
- Final optional action on that page: exact `臨時存儲` only. Approval remaining visible is normal.
- **Do not** invent prices, capacities, cutoffs, or holiday markups. Source = Excel `日本接送产品` only.

## Excel Source (strict)

File: `~/Downloads/NOL 待上架产品.xlsx` → sheet `日本接送产品`.

| Source row | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Osaka city hotel → Kansai (KIX), 7-seat | `99` |
| `10座去程` | Osaka city hotel → Kansai (KIX), 10-seat | `133` |
| repeated `7座去程` | Kansai (KIX) → Osaka city hotel, 7-seat | `99` |
| repeated `10座去程` | Kansai (KIX) → Osaka city hotel, 10-seat | `133` |

- Internal route name: `大阪市区-关西机场(KIX)`.
- Viator ref (workbook): Private One-Way Transfer Kansai Airport (KIX) to Osaka Hotel.
- Japan fleet: **no** holiday overrides (Labor Day / National Day / Spring Festival).
- Cutoff: book at least **3** days ahead.
- Times: `07:00`–`21:30` every 30 min → **30** slots.
- Capacity copy: 7-seat → max **4** pax + **5** bags ≤24"; 10-seat → max **9** pax + **10** bags ≤26".

## Product Identity

- Product name: `오사카 시내 호텔 ↔ 간사이공항(KIX) 단독 차량 편도 이동 서비스`
- Partner/internal: `大阪市区-关西机场(KIX)`
- Theme: `기사제공차량` / transportation
- Product max people: `9` (largest usable capacity)
- POI: real Kansai POI (e.g. search `간사이 국제공항`)
- Live draft id (resume if UNPUBLISHED): `7c220325-8783-4f58-a1dc-5fbfc4137a5e`

If the product list already shows the Korean name, **resume** that draft. Do not create a duplicate.

### Post-audit fix status (2026-08)

| Item | Status |
| --- | --- |
| 代表预约（含航班） | Already OK — no red; summary lists phone/email/names/flights/hotel… |
| 价格类型 | Was English `7seat go` / `10seat go` / `7seat rtn` / `10seat rtn` → fixed to `7인승 가는` / `10인승 가는` / `7인승 오는` / `10인승 오는` (dialog verify PASS) |
| 时段 | 30 slots each option (07:00–21:30 量级) |
| 保存 | 每选项 **临时保存 → 下一个**；未点提交审核 |
| Script | `nol-listing-automation/audit-fix-kix.mjs` |

## Images

User-supplied / Downloads:

```text
/Users/mac/Downloads/关西机场.jpg
/Users/mac/Downloads/关西机场2.jpg
/Users/mac/Downloads/关西机场3.jpg
```

Workspace copies: `upload-ready-images/kansai-airport/kansai-1.jpg` … `kansai-3.jpg`. Upload all three **into `썸네일 이미지` / `상품 이미지 등록`**, not `프로그램 이미지` (see ITM image pitfall in `itami-airport-live-notes.md` and playbook Images). Do not invent substitutes when user images exist.

## Korean Copy (airport pattern)

One-line:

```text
오사카 시내 호텔과 간사이공항(KIX)을 편안하게 연결하는 단독 차량 이동 서비스입니다.
```

Three summary lines:

```text
오사카 시내 호텔 ↔ 간사이공항(KIX) 편도 전용 차량 이동
공항 도착/출발 시간에 맞춘 프라이빗 픽업 및 샌딩
7인승·10인승 차량 중 인원과 수하물에 맞게 선택 가능
```

Booking-field sentence (intro + 一定要知道 + 如何使用):

```text
예약 시 오사카 시내 호텔명/주소, 간사이공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
```

Include / exclude (customer Korean):

- TRANSPORTATION: `오사카 시내 호텔 ↔ 간사이공항(KIX) 편도 전용 차량 이동 및 주차비 포함`
- PICK_UP: `픽업/샌딩 서비스 및 주차비 포함`
- Exclude: `항공권, 공항 이용료, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.`

Schedule type on introduction: `NONE`.

## Options

| # | Option name | 價格類型名稱 (Korean) | 說明 | HKD |
| --- | --- | --- | --- | ---: |
| 1 | `오사카 시내 호텔 출발 → 간사이공항(KIX) 편도 이동 (7인승 차량)` | `7인승 가는` | `7인승 차량` | 99 |
| 2 | `오사카 시내 호텔 출발 → 간사이공항(KIX) 편도 이동 (10인승 차량)` | `10인승 가는` | `10인승 차량` | 133 |
| 3 | `간사이공항(KIX) 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)` | `7인승 오는` | `7인승 차량` | 99 |
| 4 | `간사이공항(KIX) 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)` | `10인승 오는` | `10인승 차량` | 133 |

English codes `7seat go` / `10seat rtn` are **deprecated** (2026-08 audit: price-type name must be Korean). After each option form is filled (price type, `1年`, price once, times `07:00–21:30` `생성` + 30 slots): click form **`下個`** to persist the card.

## Airport reservation required IDs

Same as Haneda. All must be **required** under 代表預約信息:

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

Confirm modal with **`已選`** (not always `節省`). Red text `您必須輸入代表預訂信息…` means reservation is **not** saved — `保存然後` stays disabled.

## Page Gate (user corrections — mandatory)

See playbook for full text. Short form:

1. **Strict Excel** — never invent row prices.
2. **No URL skip** — do not `goto` later registration steps to bypass incomplete pages. Advance only via **`保存然後`** when it is **enabled**, or via enabled stepper.
3. **Wait for `保存然後` enabled** before treating a page as complete. Filling fields while `保存然後` is grey is incomplete.
4. **Attributes: select 私人的** under 團體/私人 (`tourTypes` value `0`). Missing selection → red `請選擇旅遊類型` and blocked save.
5. **Regulations: 代表預約信息 must be filled** (and voucher + include Korean + cancel 2 days / 0% / 手动取消).
6. **Option form: click `下個`** to save each option card.
7. **Stop on option list** after four selling cards; optional `臨時存儲`; never approval.

## Live Pitfalls Specific To KIX Run (2026-08-04~05)

1. Draft resume: list `修復` is often **label text**, not a button. Click `div[class*="slot___StyledContainer4"]` containing `간사이공항(KIX)`.
2. Concurrent Playwright CDP sessions freeze the page — run **one** automation process at a time; kill previous before starting next.
3. Setting `input.checked = true` alone may not update React for reservation checkboxes. Prefer row `[role=checkbox]` click + verify summary shows 電話/航班/飯店 etc. after `已選`.
4. Clicking cancel policy `添加` can create a **blank** `windows.1` row → `aria-invalid` on empty deadline/penalty and blocks save. Delete blank row or do not click `添加` if `windows.0` already holds `2` / `0`.
5. Soft warning: min book day `3` vs intro copy `2` days change notice — leave as-is; do not change cutoff to 2.
6. Soft voucher `0小时` vs product `72小时` — OK if save works.
7. Opening option form may show `서비스 이용이 원활하지 않습니다` — 돌아가기, retry once; often regulations were incomplete when form opened mid-error.
8. After `保存然後` on regulations, URL may stay on regulations even when OK — then click enabled stepper `選項管理` (not raw URL).
9. Time slots: must click `생성` / generate; unique count 30 for 07:00–21:30.
10. Long multi-option scripts exceed tool timeouts and look “stuck” — prefer one option per step with progress logs.

## Final Stop Checklist (KIX)

- [ ] Four option cards: go/return × 7/10 with correct Korean names
- [ ] Prices 99 / 133 / 99 / 133 (calendar cells when verified)
- [ ] Times generated 07:00–21:30 × 30 on each option when completed
- [ ] Images uploaded; airport reservation fields required
- [ ] Include/exclude Korean
- [ ] On **option list page**
- [ ] `臨時存儲` only if preserving; **`批准請求` not clicked**
- [ ] Automation **stopped** (user: 停在选项列表)
