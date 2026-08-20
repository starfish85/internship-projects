# Itami Airport (ITM) Transfer Live Notes

Use this reference for Osaka city hotel ↔ Osaka International Airport / Itami (ITM) private transfer listings. Pair with `haneda-airport-live-notes.md` (shared airport patterns) and `kansai-airport-live-notes.md` (Osaka hotel pattern). Apply all page-gate rules in `nol-partner-browser-playbook.md`.

## Hard Safety Stops

- **Never** click `批准請求` / `승인 요청` unless the user asks **in the same turn**.
- **Stop on the option list** once four cards exist (`판매중` / `可供出售`). User: **「以后就停在这里」**.
- Optional exact `臨時存儲` only after the list looks complete.
- Prices only from Excel `日本接送产品` — never invent HKD.

## Excel Source (strict)

File: `~/Downloads/NOL 待上架产品.xlsx` → sheet `日本接送产品`.

| Meaning | Sale price HKD |
| --- | ---: |
| Osaka city hotel → ITM, 7-seat | **77** |
| Osaka city hotel → ITM, 10-seat | **105** |
| ITM → Osaka city hotel, 7-seat | **77** |
| ITM → Osaka city hotel, 10-seat | **105** |

- Internal route name: `大阪市区-大阪国际机场（伊丹机场）(ITM)`.
- Japan fleet: **no** holiday overrides.
- Cutoff: book at least **3** days ahead.
- Times: `07:00`–`21:30` every 30 min → **30** slots.
- Capacity copy: 7-seat → max **4** pax + **5** bags ≤24"; 10-seat → max **9** pax + **10** bags ≤26".
- Product-level max people: **9**.

## Product Identity

- Product name: `오사카 시내 호텔 ↔ 이타미공항(ITM) 단독 차량 편도 이동 서비스`
- Partner/internal: `大阪市区-大阪国际机场（伊丹机场）(ITM)`
- Theme: `기사제공차량`
- Progress language: `韓語` / `한국어`
- POI: search **`이타미 공항`** (or similar) → pick **관광지 `오사카 국제공항`** (not nearby hotels) → type **`旅遊地` / `TRAVEL_PLACE`** → final **`添加`**
- Live draft id (2026-08-05 resume): `88b3861b-e907-487b-bacb-5abcfc1a7988`

If the list already shows the Korean name as UNPUBLISHED, **resume** that draft.

### Post-audit fix status (2026-08)

| Item | Status |
| --- | --- |
| 代表预约（含航班） | Already OK — no red; summary has phone/email/names/flights/hotel… |
| 价格类型 | English `7seat go`/`10seat go`/`7seat rtn`/`10seat rtn` → `7인승 가는`/`10인승 가는`/`7인승 오는`/`10인승 오는` (dialog PASS) |
| 时段 | ~30 slots each (07:00–21:30) |
| 保存 | 每选项 **临时保存 → 下一个**；未点提交审核 |
| Script | `nol-listing-automation/audit-fix-itm.mjs` |

## Images (critical — user correction 2026-08-05)

Workspace copies:

```text
/Users/mac/nol/upload-ready-images/itami-airport/itami-1.jpg
/Users/mac/nol/upload-ready-images/itami-airport/itami-2.jpg
/Users/mac/nol/upload-ready-images/itami-airport/itami-3.jpg
```

### Two different upload zones

| Zone (Korean UI) | Meaning | Required? |
| --- | --- | --- |
| **`썸네일 이미지` → `상품 이미지 등록(3개 이상)`** | Product thumbnails / listing images | **Yes — at least 3** |
| **`프로그램 이미지`** | Program / description images | Optional; **do not** put product photos here by mistake |

### Pitfall that blocked the ITM run

1. Using `input[type=file].last()` or a generic `上傳圖片` / second `이미지 등록` can hit **프로그램 이미지**.
2. Page may still show large previews lower on the form while **썸네일** stays empty with red **`必須至少註冊 3 個縮略圖。`**
3. User correction: *「上传错地方了，应该上传在这里」* (screenshot of empty 썸네일 상품 이미지 등록).
4. User correction: *「这里三张图要删掉」* under **프로그램 이미지** — delete mistaken program images with the red **×** on each card; **keep** the three 썸네일 images.

### Correct upload sequence

1. Scroll to heading **`썸네일 이미지`**.
2. Use the **first** `input[type=file][accept*="image"]` whose ancestor context includes `상품 이미지 등록(3개 이상)` (or the first `이미지 등록` button under that heading).
3. Prefer `setInputFiles([img1, img2, img3])` on that input once (multi=true).
4. Wait until three thumbs exist **in that section** (CDN `media.triple.guide/...` or visible strip under 상품 이미지).
5. Confirm red thumbnail error is gone and `保存然後` can enable after other intro fields are filled.
6. If program images were polluted, delete them; do not leave duplicate sets.

## Korean Copy (ITM)

One-line:

```text
오사카 시내 호텔과 이타미공항(ITM)을 편안하게 연결하는 단독 차량 이동 서비스입니다.
```

Three summary lines:

```text
오사카 시내 호텔 ↔ 이타미공항(ITM) 편도 전용 차량 이동
공항 도착/출발 시간에 맞춘 프라이빗 픽업 및 샌딩
7인승·10인승 차량 중 인원과 수하물에 맞게 선택 가능
```

Include / exclude:

- TRANSPORTATION: `오사카 시내 호텔 ↔ 이타미공항(ITM) 편도 전용 차량 이동 및 주차비 포함`
- PICK_UP: `픽업/샌딩 서비스 및 주차비 포함`
- Exclude: `항공권, 공항 이용료, 가이드, 팁, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.`

Schedule on introduction: `NONE`.

## Options

| # | Option name | 價格類型名稱 (Korean) | 說明 | HKD |
| --- | --- | --- | --- | ---: |
| 1 | `오사카 시내 호텔 출발 → 이타미공항(ITM) 편도 이동 (7인승 차량)` | `7인승 가는` | `7인승 차량` | 77 |
| 2 | `오사카 시내 호텔 출발 → 이타미공항(ITM) 편도 이동 (10인승 차량)` | `10인승 가는` | `10인승 차량` | 105 |
| 3 | `이타미공항(ITM) 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)` | `7인승 오는` | `7인승 차량` | 77 |
| 4 | `이타미공항(ITM) 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)` | `10인승 오는` | `10인승 차량` | 105 |

Do **not** use English price-type names (`7seat go` / `10seat rtn`). Each option: price type `기타…` → `1年` → price **once** → times `07:00–21:30` `생성` (30 slots) → form **`下個`**.

## Airport reservation required IDs

Same as Haneda/KIX (all **required** under 代表預約信息):

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

Confirm with **`已選`**. Summary must list fields (電話/航班/飯店…). Setting `input.checked = true` only may look “on” then clear after `已選` — use **mouse click on the visible label / checkbox row**, then re-verify summary.

## Live Pitfalls Specific To ITM Run (2026-08-05)

### Attributes

1. **Theme:** open `選擇類別（主題）` → `기사제공차량` → `已選`. Red `請選擇類別（主題）。` blocks save.
2. **私人的:** hidden checkbox often at `x: -9999`. `getByText('私人的', { exact: true })` may timeout. **Mouse-click the visible label** whose text starts with `私人的` / `繼續保留方`. Verify `input[name=tourTypes][value="0"].checked === true`.
3. **People:** min `1`, max `9` (`#requiredNumberOfPeople` / `#availableNumberOfPeople`). Empty `0` shows `1부터 입력가능합니다.`.
4. **Language:** `選擇你的语言` → **`韓語`** → `已選` (modal title may mistranslate to 選擇論文語言).
5. **POI search:** typing alone is not enough — click search / press **Enter**. Prefer 관광지 airport POI over 숙소 hotels matching “이타미”. After card select: **`添加地點`** then second dialog **旅遊地** + **`添加`** (upper add alone does not finish).

### Introduction

6. **Thumbnail vs program image** — see Images section above. User-visible red error is the source of truth for 썸네일, not “any img on page count”.
7. Soft intro helper texts (`請填寫…`) may remain after fields are filled; gate is still **`保存然後` enabled**.

### Regulations

8. Going back to intro to fix images **before** regs `保存然後` can leave regulations empty when you return — re-fill numbers/cancel if values reset.
9. Reservation: first bulk `checked=true` can report 18/18 on then still red after `已選`. Re-open modal, **mouse-click each required id**, confirm summary, only then close.
10. Voucher: card with `예약정보로 확인` + `無需換貨` (template name may be another product).
11. Cancel: `예 (수동취소)`, `windows.0.deadline=2`, `windows.0.penalty=0`. Soft `aria-invalid` on `minimumPurchaseDay` can remain while buttons enable — do not change 3-day book rule to silence soft invalid alone.
12. Do not click cancel `添加` (blank `windows.1`).

### Options / automation

13. One CDP Playwright process at a time.
14. After `下個`, form may linger briefly; card text can appear behind dialog. Escape / wait; do not double-create.
15. Nested divs inflate `판매중|可供出售` match counts — verify **four distinct option names**, not raw string count.

## Step-By-Step Operator Mode (user request)

When the user asks to operate **like a real mouse / 边操作边展示**:

1. **Announce** the next single action before clicking.
2. Perform **one** logical step (one field group or one modal).
3. **Report** result (enabled buttons, red errors, URL, counts).
4. Do **not** batch attributes + intro + regs + four options in one silent script unless the user says to run autonomously.

## Final Stop Checklist (ITM)

- [ ] Four option names present (go/return × 7/10)
- [ ] Prices 77 / 105 / 77 / 105 (Excel)
- [ ] Times 07:00–21:30 × 30 per option when completed
- [ ] 썸네일 3 images; 프로그램 not wrongly filled
- [ ] 私人的 + 대표预约 (with flights) + voucher
- [ ] On **option list**; `臨時存儲` optional
- [ ] **`批准請求` not clicked**
- [ ] Automation **stopped**
