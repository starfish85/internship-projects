# Tokyo Disney Transfer Live Notes

Use this reference for Tokyo city hotel ↔ Tokyo Disney Resort private transfer listings, Tokyo Station/Tokyo Port/transport-hub transfers, Osaka Station/Shin-Osaka Station transfers, Osaka city hotel ↔ Universal Studios Japan transfers, and similar hotel-to-attraction or hotel-to-transport-hub products whose source notes emphasize route/time correctness, no voucher, WhatsApp/SMS driver contact, vehicle capacity, transport details, and half-hour pickup slots.

For Osaka city hotel ↔ Osaka Port, prefer `osaka-port-live-notes.md` after reading this file. That port-specific note captures the exact Osaka Port live-run product values, images, option names, ship-name/boarding copy, and time-popup repairs.

For Osaka city hotel ↔ Universal Studios Japan, prefer `osaka-universal-studios-live-notes.md` after reading this file. That USJ-specific note captures the exact live-run field values, workbook formula price derivation, supplied image list, USJ POI selection, reservation-info pitfalls, option names/prices, and final temporary-save result.

## Source Data Pattern

The live Tokyo Disney run used a spreadsheet row group like:

| Source option | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Tokyo city hotel → Tokyo Disney Resort, 7-seat | `627` |
| `10座去程` | Tokyo city hotel → Tokyo Disney Resort, 10-seat | `1020` |
| repeated `7座去程` | Tokyo Disney Resort → Tokyo city hotel, 7-seat | `627` |
| repeated `10座去程` | Tokyo Disney Resort → Tokyo city hotel, 10-seat | `1020` |

For repeated rows where direction labels are missing or duplicated, infer the second pair as return only when the product name and four-row layout clearly imply go/return. If uncertain, ask.

The live Tokyo Station run used the same four-row pattern:

| Source option | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Tokyo city hotel -> Tokyo Station, 7-seat | `784` |
| `10座去程` | Tokyo city hotel -> Tokyo Station, 10-seat | `1176` |
| repeated `7座去程` | Tokyo Station -> Tokyo city hotel, 7-seat | `784` |
| repeated `10座去程` | Tokyo Station -> Tokyo city hotel, 10-seat | `1176` |

For station/transport-hub products, replace Disney ticket wording with `열차 티켓`, and require train information in the booking wording.

The live Tokyo Port run used the same four-row pattern:

| Source option | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Tokyo city hotel -> Tokyo Port, 7-seat | `784` |
| `10座去程` | Tokyo city hotel -> Tokyo Port, 10-seat | `1176` |
| repeated `7座去程` | Tokyo Port -> Tokyo city hotel, 7-seat | `784` |
| repeated `10座去程` | Tokyo Port -> Tokyo city hotel, 10-seat | `1176` |

For port products, replace Disney ticket wording with `선박 티켓`, and require ship name plus boarding/disembarking information in the booking wording.

The live Yokohama Port run used the same four-row pattern:

| Source option | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Tokyo city hotel -> Yokohama Port, 7-seat | `112` |
| `10座去程` | Tokyo city hotel -> Yokohama Port, 10-seat | `134` |
| repeated `7座去程` | Yokohama Port -> Tokyo city hotel, 7-seat | `112` |
| repeated `10座去程` | Yokohama Port -> Tokyo city hotel, 10-seat | `134` |

For Yokohama Port, prefer `yokohama-port-live-notes.md` after reading this file. It captures the exact POI (`요코하마항 오산바시 국제여객선 터미널`), user-supplied image list, `112`/`134` HKD prices, and the price-field verification pitfall.

For Tokyo city hotel ↔ Haneda Airport (HND), prefer `haneda-airport-live-notes.md` after reading this file. It captures the `70`/`105` HKD 7/10-seat go/return mapping, flight reservation fields, Korean airport copy, CDP/Playwright fallback, option price-type checkbox DOM, double-price `7070` trap, regulations-stepper bypass via option URL, and absolute no-approval stop. Reuse that airport pattern for Narita/KIX/Itami with destination-specific names and prices.

The live Osaka Station run used the same four-row pattern (**destination = Osaka Station / `오사카역` only**):

| Source option | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Osaka city hotel -> Osaka Station, 7-seat | `784` |
| `10座去程` | Osaka city hotel -> Osaka Station, 10-seat | `1176` |
| repeated `7座去程` | Osaka Station -> Osaka city hotel, 7-seat | `784` |
| repeated `10座去程` | Osaka Station -> Osaka city hotel, 10-seat | `1176` |

For **Osaka Station** products, replace Disney ticket wording with `열차 티켓`, and require train information in the booking wording.

**User correction (2026-08 Excel 红字):** 大阪站 and 新大阪站 are **different stations**. Listing copy must target **`오사카역` only**.  
Do **not** use combined `오사카역/신오사카역` or `오사카역 또는 신오사카역` in product name, option names, intro, booking sentence, or include text unless the user explicitly asks for a dual-station product.

The live Osaka Universal Studios Japan run used the same four-row pattern:

| Source option | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Osaka city hotel -> Universal Studios Japan, 7-seat | `627` |
| `10座去程` | Osaka city hotel -> Universal Studios Japan, 10-seat | `1020` |
| repeated `7座去程` | Universal Studios Japan -> Osaka city hotel, 7-seat | `627` |
| repeated `10座去程` | Universal Studios Japan -> Osaka city hotel, 10-seat | `1020` |

For Osaka Universal Studios Japan products, replace Disney ticket wording with `유니버설 스튜디오 재팬 입장권`. No train/ship/flight information is needed; instead require hotel name/address, USJ pickup/drop-off or pickup place, use time, reachable WhatsApp/SMS mobile, passenger count, and luggage count.

## Required Copy Points

Reflect these in the Korean product introduction and the required-use/notice sections:

- No separate ticket, voucher, or exchange document needs to be shown.
- The driver usually contacts the customer one day before use via WhatsApp or SMS.
- The phone number entered at booking must be registered with WhatsApp and reachable.
- The customer must verify the selected route, pickup/drop-off places, pickup time, address, passenger count, and luggage count.
- Changes to route, pickup time, address, or other reservation information must be requested at least 2 days before use; late changes may not be possible.
- Child seats, night surcharges, tickets, personal expenses, tips, and other add-on services are not included unless explicitly supplied.
- **No mid-route stops / intermediate pickups.** Point-to-point only (post-review FAQ 2026-08).
- Introduce the transfer route normally; for this product, describe both Tokyo city hotels and Tokyo Disney Resort pickup/drop-off scope.
- Add booking-field wording when the source note asks to provide transport details:
  `예약 시 도쿄 시내 호텔명/주소, 도쿄 디즈니리조트 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호를 정확히 입력해 주세요.`
- For Tokyo Station, use:
  `예약 시 도쿄 시내 호텔명/주소, 도쿄역 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 열차 정보를 정확히 입력해 주세요.`
- For Tokyo Port, use:
  `예약 시 도쿄 시내 호텔명/주소, 도쿄항 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 선박명 및 승하선 정보를 정확히 입력해 주세요.`
- For Yokohama Port, use:
  `예약 시 도쿄 시내 호텔명/주소, 요코하마항 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 선박명 및 승하선 정보를 정확히 입력해 주세요.`
- For Haneda Airport (HND), use:
  `예약 시 도쿄 시내 호텔명/주소, 하네다공항 터미널, 항공편명, 도착 또는 출발 시간, 픽업 장소, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.`
- For Osaka Station (**오사카역 only** — user 2026-08), use:
  `예약 시 오사카 시내 호텔명/주소, 오사카역 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 열차 정보를 정확히 입력해 주세요.`  
  Deprecated dual wording: `오사카역 또는 신오사카역…` (do not use unless user requests dual-station).
- For Osaka Universal Studios Japan, use:
  `예약 시 오사카 시내 호텔명/주소, 유니버설 스튜디오 재팬 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.`

Place the booking-field wording in at least one high-visibility customer-facing field. In the live run it was added to all three:

- Product introduction body.
- `一定要知道`.
- `如何使用` first step.

## Standard FAQ (required — audit 2026-08)

Add this FAQ on Disney, USJ, port, station, and other private one-way transfers:

```text
Q: 중간에 다른 장소에서 승하차할 수 있나요?
A: 본 서비스는 출발지에서 목적지까지 바로 이동하는 지점 간 전용 차량 서비스입니다. 중간 경유지 추가 또는 중간 승하차는 제공되지 않습니다.
```

## Vehicle Capacity

Use the source capacity exactly when supplied. For the Tokyo Disney, Tokyo Station, Tokyo Port, and Osaka Station runs:

- 7-seat option: maximum 4 passengers plus 5 pieces of 24-inch luggage.
- 10-seat option: maximum 9 passengers plus 10 pieces of 26-inch luggage.

Do not copy the typo-like source text `10座：9人+9人+10个行李`; normalize it to `10座最多9人+10件26寸行李` / Korean equivalent.

Recommended Korean option-description snippets:

```text
도쿄 시내 호텔 출발 → 도쿄 디즈니리조트 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)
24인치 이하 수하물 기준: 최대 5개까지 적재 가능
별도 입장권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

```text
도쿄 시내 호텔 출발 → 도쿄 디즈니리조트 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)
26인치 이하 수하물 기준: 최대 10개까지 적재 가능
별도 입장권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Mirror the wording for return options.

## Options

**Price-type name rule (audit 2026-08):** use **Korean** names only.  
Do **not** fill 價格類型名稱 with English `5seat go` / `7seat go` / `7seat rtn` / `10seat return` (user: 英文车型描述统一改为韩文).  
Canonical pattern:

| Direction | 價格類型名稱 | 價格類型說明 |
| --- | --- | --- |
| Outbound | `{N}인승 가는` | `{N}인승 차량` |
| Return | `{N}인승 오는` | `{N}인승 차량` |

Examples: `5인승 가는`, `7인승 가는`, `10인승 오는`. Keep within the name-field length limit (~10).

Create four options:

1. `도쿄 시내 호텔 출발 → 도쿄 디즈니리조트 편도 이동 (7인승 차량)` / price type name `7인승 가는` / desc `7인승 차량` / HKD `627`.
2. `도쿄 시내 호텔 출발 → 도쿄 디즈니리조트 편도 이동 (10인승 차량)` / `10인승 가는` / `10인승 차량` / HKD `1020`.
3. `도쿄 디즈니리조트 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / `7인승 차량` / HKD `627`.
4. `도쿄 디즈니리조트 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / `10인승 차량` / HKD `1020`.

For Tokyo Station, create:

1. `도쿄 시내 호텔 출발 → 도쿄역 편도 이동 (7인승 차량)` / `7인승 가는` / HKD `784`.
2. `도쿄 시내 호텔 출발 → 도쿄역 편도 이동 (10인승 차량)` / `10인승 가는` / HKD `1176`.
3. `도쿄역 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / HKD `784`.
4. `도쿄역 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / HKD `1176`.

For Tokyo Port, create:

1. `도쿄 시내 호텔 출발 → 도쿄항 편도 이동 (7인승 차량)` / `7인승 가는` / HKD `784`.
2. `도쿄 시내 호텔 출발 → 도쿄항 편도 이동 (10인승 차량)` / `10인승 가는` / HKD `1176`.
3. `도쿄항 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / HKD `784`.
4. `도쿄항 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / HKD `1176`.

For Yokohama Port, create:

1. `도쿄 시내 호텔 출발 → 요코하마항 편도 이동 (7인승 차량)` / `7인승 가는` / HKD `112`.
2. `도쿄 시내 호텔 출발 → 요코하마항 편도 이동 (10인승 차량)` / `10인승 가는` / HKD `134`.
3. `요코하마항 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / HKD `112`.
4. `요코하마항 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / HKD `134`.

For Osaka Station (**`오사카역` only**), create:

1. `오사카 시내 호텔 출발 → 오사카역 편도 이동 (7인승 차량)` / `7인승 가는` / HKD `784`.
2. `오사카 시내 호텔 출발 → 오사카역 편도 이동 (10인승 차량)` / `10인승 가는` / HKD `1176`.
3. `오사카역 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / HKD `784`.
4. `오사카역 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / HKD `1176`.

Product name: `오사카 시내 호텔 ↔ 오사카역 단독 차량 편도 이동 서비스` (no `신오사카역`).

For Osaka Universal Studios Japan, create:

1. `오사카 시내 호텔 출발 → 유니버설 스튜디오 재팬 편도 이동 (7인승 차량)` / `7인승 가는` / HKD `627`.
2. `오사카 시내 호텔 출발 → 유니버설 스튜디오 재팬 편도 이동 (10인승 차량)` / `10인승 가는` / HKD `1020`.
3. `유니버설 스튜디오 재팬 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / HKD `627`.
4. `유니버설 스튜디오 재팬 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / HKD `1020`.

Use `1 ~ 10` purchase quantity and keep the sale switch enabled unless instructed otherwise.

## Product Settings

- Minimum reservation cutoff: `3` days.
- Confirmation: manual confirmation, `3` business days unless the supplier says otherwise.
- Cancellation: manual partner cancellation, `2` business days before use, `0%` fee, `100%` refund; after cutoff non-refundable.
- Reservation information should include phone, email, English surname/name, departure date/time, hotel address, pickup point, pickup time, drop-off point, messenger/Kakao/WhatsApp contact where available, passenger count, and luggage count.
- Include/exclude should make clear the transfer/vehicle/driver service and parking fee are included, and Tokyo Disney Resort ticket/station ticket/ship ticket, child seat, night surcharge, personal expenses, and tips are excluded as applicable.
- Customer-facing typed fields must be Korean. Do not use Chinese snippets such as `1. 接送服务 2. 停车费` in option include popups for these Japanese transport-hub products. Use Korean text like `도쿄 시내 호텔 ↔ 도쿄항 편도 전용 차량 이동 및 주차비 포함` and, if `其他` is needed to make the row save, `픽업/샌딩 서비스 및 주차비 포함`.
- For transport hubs, include train information either as a standard field if available or in the customer-facing copy/additional request. The important visible requirement is hotel name/address, station pickup/drop-off point, use time, reachable mobile/WhatsApp, passenger count, luggage count, and train information.
- For Osaka Station option/rule includes, use Korean such as `오사카 시내 호텔 ↔ 오사카역 편도 전용 차량 이동 및 주차비 포함` (**no** 신오사카); if selecting only `運輸` does not persist, select both `運輸` and `其他`, with `其他(픽업/샌딩 서비스 및 주차비 포함)`.

If an older draft shows translated Chinese include text such as `其他（1.接送服务2.回程接送）`, treat it as a stale value to audit. For Japanese transport-hub listings, reopen the include popup and replace customer-facing include text with Korean.

## Tokyo Station Live Run Pitfalls

- Representative reservation-info dialog can show misleading translated summaries after save. Inspect checkbox `id`s in the dialog: correct required ids include `CELLPHONE-required`, `EMAIL-required`, `ENGLISH_LAST_NAME-required`, `ENGLISH_FIRST_NAME-required`, `HOTEL_NAME-required`, `HOTEL_ADDRESS-required`, `PICKUP_AREA-required`, `PICKUP_TIME-required`, `SENDING_AREA-required`, `BOOKED_TIME-required`, `MESSAGING_APP_ID-required`, `NUMBER_OF_PEOPLE-required`, and `NUMBER_OF_SUITCASES-required`. Wrong flight-related ids such as `PNR-required`, `DEPARTURE_FLIGHT_NUMBER-required`, `ARRIVAL_FLIGHT_NUMBER-required`, and `ARRIVAL_DATE_TIME-required` should be off unless the product is an airport transfer.
- If the visible summary still mistranslates some ids after saving, rely on the checkbox ids and add the station/train requirements into high-visibility Korean copy. Do not keep real airport-flight fields selected for a station product just because the Chinese summary looks useful.
- The cancellation rule row must be added, then the new blank rule row must be deleted. Leaving the empty row visible keeps `保存然后` disabled.
- Selecting the reservation-info voucher template may show a warning like voucher issue time `0小时` vs product information `72小时`. This is acceptable if `保存然后` remains enabled; do not change no-voucher logic to silence the warning.
- In the option form, saving the custom price-type popup can overwrite the option name field with the price-type description, for example `7인승 차량`. After closing the price-type popup and again after saving the time popup, refill the option name with the full route before clicking option-form `下個`.
- The quick `1年` period can resolve to the current date through next year, e.g. `2026-08-03 ~ 2027-08-03` on 2026-08-03. Direct date inputs may reject edits. Try exact dates once; if the UI refuses and the user did not insist, continue with the retained one-year period and report it honestly.

## Tokyo Port Live Run Pitfalls

- If a draft already exists for `도쿄 시내 호텔 ↔ 도쿄항 단독 차량 편도 이동 서비스`, resume and repair it instead of creating a duplicate. In the live run the draft already had the two outbound options; the missing return options were added with `注册/添加选项`.
- **Regulations / 代表預約信息 must not be empty.** Post-review screenshot showed both 代表預約信息 and 按數量 empty with red `您必須輸入代表預訂信息或按數量輸入預訂信息。` — fill airport-off transfer reservation ids and verify summary before options or final report. Re-check part 4 (產品法規) on any port draft that looks “almost done”.
- Product introduction can already contain all 13 Tokyo Port images. Verify thumbnails and representative image before uploading duplicates.
- Since `2026-08-01` and `2026-08-02` were in the past on 2026-08-03, the calendar disabled them. Use the first selectable date, e.g. `2026-08-03`, as the sale start, keep end `2027-07-31`, and report the retained period honestly.
- The option include/exclude modal may fail to write back when saved by locator or on first save. If the form still says the include/exclude item is required, reopen the modal and save using the visible `節省` button coordinates after verifying the checkbox is purple/checked and the text is visible.
- For Tokyo Port option includes, selecting only `運輸` sometimes did not write back. If needed, select both `運輸` and `其他`, but keep both typed values Korean: `도쿄 시내 호텔 ↔ 도쿄항 편도 전용 차량 이동 및 주차비 포함` and `픽업/샌딩 서비스 및 주차비 포함`.
- When the user says all filled content must be Korean, audit already-saved options too. In the live run, the third option still showed `其他(1. 接送服务 2. 停车费)` and had to be edited to Korean, while the first two needed `주차비 포함` added to the `運輸` text.
- The option list does not display prices. Reopen option forms or verify before saving; for Tokyo Port the correct prices are `784` for 7-seat and `1176` for 10-seat in both directions.
- Yokohama Port exposed a stronger version of the same price-display trap: after save, the reopened option's `請輸入價格` input can be disabled and visually blank while the calendar cells show the correct price. Treat visible calendar-cell values as the verification source, and repair only if those cells are blank or wrong.

## Osaka Station Live Run Pitfalls

- If the active browser tab is a different draft such as Tokyo Port, go back to the product list/registration entry and create or claim the Osaka draft. Do not repurpose the visible unrelated product id.
- For the live Osaka run, a transportation draft was created/resumed. **Canonical product name (user 2026-08):** `오사카 시내 호텔 ↔ 오사카역 단독 차량 편도 이동 서비스`; internal name `大阪市区酒店-大阪站`. Older dual-station title with `신오사카역` must be renamed to 오사카역 only.
- Product-level max people was set to `9` because the largest option was the 10-seat vehicle with usable maximum 9 passengers.
- Area search used `오사카역`; select the actual `오사카 역` POI, not a hotel annex or **Shin-Osaka** result.
- **Time repair (简体 UI, 2026-08):** if only `21:00` shows, open via ⋯`더 보기`→编辑, delete rows, `重复 小时 添加`, 07:00–21:30, click **生成** (may show as **一代**), then 保存 + 临时保存→下一个. Never save without generate. Script: `nol-listing-automation/fix-osaka-station-times.mjs`. Draft id example: `c36c1517-89cc-4524-bfdb-fce8df1c2e5c`.
- The user supplied 11 files, `大阪站1.jpg` through `大阪站11.jpg`. Copy them to an upload-ready workspace folder and upload all 11. In the browser runtime, direct locator `.setInputFiles()` may be unavailable; use a file chooser (`waitForEvent('filechooser')` then `chooser.setFiles(paths)`).
- Required reservation-info ids for the Osaka Station run included `CELLPHONE-required`, `EMAIL-required`, `ENGLISH_LAST_NAME-required`, `ENGLISH_FIRST_NAME-required`, `DEPARTURE_DATE_TIME-required`, `HOTEL_NAME-required`, `HOTEL_ADDRESS-required`, `PICKUP_AREA-required`, `PICKUP_TIME-required`, `SENDING_AREA-required`, `BOOKED_TIME-required`, `KAKAO_TALK_ID-required`, `MESSAGING_APP_ID-required`, `NUMBER_OF_PEOPLE-required`, and `NUMBER_OF_SUITCASES-required`. Clear airport fields such as `PNR-*`, flight number, airline code, and arrival date/time unless the product is actually an airport transfer.
- The no-voucher template was selected from an older row named like `[5seat From Beijing Central District to Beijing Universal Studios ]`. Full exact-text matching can fail because of hidden spaces; enumerate visible cards and click the first card whose method means reservation-information confirmation/no exchange.
- After adding the manual cancellation rule, NOL may create a blank extra row. Delete the last visible `刪除` row before saving rules.
- The desired period `2026-08-01 ~ 2027-07-31` had past disabled start dates on 2026-08-03. The accepted quick `1年` period became `2026-08-03 ~ 2027-08-03`. Report the actual visible retained period honestly.
- In the price-type popup, the visible text `其他价格类型（手动输入）` may not match role text because of punctuation/translation. Enumerate buttons and choose the one containing the intended custom/other type. To tick `必需品购买` and `代表价`, click their exact container rows and verify the selected class/visual state, not just adjacent text.
- The repeated time popup was the main unresolved live pitfall: selecting `07:00` worked, but selecting `21:30` sometimes closed the modal before generated slots appeared. If no generated list is visible, do not claim time slots are set. Reopen option edit and repair before final if possible; if the draft is saved anyway, report time slots as unverified/incomplete.

## Osaka Universal Studios Japan Live Run Pitfalls

- Read the dedicated `osaka-universal-studios-live-notes.md` for the full field set and copy blocks.
- `openpyxl` may return `None` for formula sale prices in the source workbook; derive visible prices from `cost / 0.7` or from the screenshot. The live values were `627` for 7-seat and `1020` for 10-seat.
- The user supplied three `.webp` images. Copy them into `upload-ready-images/osaka-universal-studios/` with `.jpg` suffixes and upload through the file chooser. The platform accepted suffix-only copies.
- Product-level max people is `9`.
- Area search should use `유니버설 스튜디오 재팬`; choose the tourist attraction result `유니버셜 스튜디오 재팬`. After clicking `添加地点`, select the lower `TRAVEL_PLACE` location type and click the lower final `添加`; the first add button alone does not close the modal.
- In reservation-info selection, do not click rows by translated text/visual y-position alone. In the live run that selected `ARRIVAL_DATE_TIME-required` accidentally. Use checkbox IDs and keep flight/airport ids off.
- The option time popup worked when the sequence was: `반복 时间添加`, `07:00`, `21:30`, `30 分鐘`, `생성`, verify 30 unique times, then `節省`.
- The raw snapshot can show 60 `HH:MM` matches because each time appears in both a button and nested text. Verify 30 unique values from `07:00` to `21:30`.
- After saving an option, the card may appear in the list while the edit dialog still appears in the snapshot for a few seconds. Wait and resnapshot before creating the next option.

## Time Slots

For **all** Japan private transfer products covered by this note (Disney, station, port, USJ, etc.), use **`07:00` through `21:30` every 30 minutes**. Expected **30** slots:

```text
07:00 · 07:30 · 08:00 · 08:30 · 09:00 · 09:30 · 10:00 · 10:30 · 11:00 · 11:30 · 12:00 · 12:30 · 13:00 · 13:30 · 14:00 · 14:30 · 15:00 · 15:30 · 16:00 · 16:30 · 17:00 · 17:30 · 18:00 · 18:30 · 19:00 · 19:30 · 20:00 · 20:30 · 21:00 · 21:30
```

**Do not** start at `09:30`. User audit (大阪环球影城): slots had been set from 09:30 and were corrected to start at **07:00**. USJ uses the same 07:00–21:30 grid as Disney/port/station unless Excel explicitly states otherwise.

NOL time-popup sequence (韩/繁新建):

1. Open `设定时间` / `設定時間`.
2. Click `반복 시간 추가` / 添加重复时间.
3. Set first start time to **`07:00`** (not 09:30).
4. Set last start time to `21:30`.
5. Set interval to `30 分鐘`.
6. Click `생성`/`生成`.
7. Verify the generated visible list starts at `07:00`, ends at `21:30`, and contains 30 slots.
8. Click popup-level `節省`.
9. Save the option form with `下個` / (edit: **临时保存 → 下一个**).

**简体 UI · 已有错误时段（大阪站 2026-08）：**

1. ⋯ `더 보기` on 时间段 row → menu **编辑** (not only click `21:00` text).
2. Delete existing wrong rows.
3. **重复 小时 添加**.
4. Start `07:00`, end `21:30`, **分钟** `30`.
5. Click **生成** (extension may show **一代**) — **required**.
6. Modal **保存** (not 关闭).
7. Confirm form line `07:00 · … · 21:30` (30).
8. **临时保存 → 下一个**.

**Do not** modal-save without generate — result is a single leftover `21:00` (user rejected).

Live pitfall: after selecting end time `21:30`, the time picker may close automatically. Do not click the old picker confirm coordinates if no picker is visible; that can close the time modal or hit the form save before generation. Use DOM selectors for `생성` and `節省` whenever available.

Hard verification rule: only the **时间段** compact line counts. Do not use whole-page `HH:MM` first/last (false `10:00`). If the popup closes before the generated slot list is visible, time is unverified until repaired.

## Post-review products (2026-08 package)

Platform-audited drafts (skill values must match):

- 东京迪斯尼: `id=462b9cef-c378-45d7-afd5-9b44f364b378`
- 大阪环球影城: `id=4b49b221-a013-4420-9def-ffddfc09a310`

Corrections: Korean price-type names, FAQ mid-stop, USJ times from 07:00.

## Browser Recovery Notes

- If `tab.playwright.url()` fails, use `await tab.url()`; the browser plugin exposes tab URL/title methods on `tab`, not always on `tab.playwright`.
- `tab.playwright.goto()` may be unavailable; use `await tab.goto(url)`. A new tab opened with `browser.tabs.new(url)` can remain `about:blank`, so create the tab and then call `await tab.goto(url)`.
- Use `await tab.playwright.domSnapshot()` for visible state; `tab.content.snapshot()` is not available in this browser runtime.
- Avoid declaring reusable `const snap` in repeated Node REPL calls. Use `var` or unique names; otherwise later calls can fail with `Identifier 'snap' has already been declared`.
- `tab.playwright.mouse`, direct keyboard helpers, in-page `window.location.href` assignment, `window.location.assign`, DOM `el.click()`, and synthetic `MouseEvent` clicks can fail or be unavailable in this runtime. Prefer visible locators, role/text selectors, DOM enumeration, and `tab.goto`.
- Node `eval` is disallowed. Keep helper code explicit and use reusable `var` bindings.
- For file uploads, prefer the file chooser flow when direct input upload APIs are missing.
- If a locator reports zero immediately after a save, wait and resnapshot. The list can be visible while React is still refreshing.
- When closing an option edit modal after reading it, a generic unsaved-change warning may appear even if the option was already saved. If only inspecting and no new changes are intended, confirm leave; otherwise use the form `下個` button to save and return.
- Always temporary-save by exact text `临时存储`; never click the neighboring `批准请求`.

## Sales Period Caveat

Preferred period for most one-year transfer listings is `2026-08-01 ~ 2027-07-31` when the source expects the next operating year. In the Tokyo Disney live run, the quick `1年` radio produced `2026-07-31 ~ 2027-07-31`, and direct date inputs resisted editing. If exact start date matters:

1. Try direct date fields only if they visibly retain values.
2. If typing fails, use the calendar picker to select `2026-08-01` and `2027-07-31`.
3. If the target start date is in the past and disabled, select the first available date instead and report it honestly.
4. If the UI still refuses and the user did not insist, report the retained visible period honestly instead of claiming it was changed.

## Final Report

For this product type, final response should state:

- Four options and prices.
- Time slots were set to `07:00 ~ 21:30` every 30 minutes, or explicitly say they are unverified/incomplete if no generated slot list was observed.
- The booking-field sentence was included if requested by review.
- Images uploaded and representative selected.
- `临时存储` succeeded.
- `批准请求` was not clicked.
