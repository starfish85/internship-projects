# NOL Transfer Live Listing Workflow

Use this reference when the user asks to continue or complete a live NOL partner-center listing for Korean-facing private-car attraction transfers. For direct browser operation, also read `nol-partner-browser-playbook.md`; it contains the ready-to-use DOM, calendar, verification, and recovery logic.

## Safety Rules

- Do not click `批准請求`, `승인 요청`, or submit-for-review controls unless the user explicitly asks for submission in the current turn.
- If the user states a standing ban such as “坚决不允许点击批准请求”, obey for the entire session.
- Treat `批准請求` as a hard-stop danger button. When `臨時存儲` and `批准請求` are adjacent in the bottom bar, select the `臨時存儲` button by exact text or verified DOM candidate only; do not use broad bottom-coordinate clicks.
- Temporary save is allowed when the user asks for it or when a section needs to be preserved before moving on.
- The user's final-save instruction for this workflow is `臨時存儲`, not approval submission. End by confirming the temporary-save toast and explicitly stating that approval was not requested.
- Before entering a major section, state the exact values to be entered in Chinese. After saving, report what was saved.
- Operational narration may be Chinese, but every customer-facing free-text value typed into NOL must be Korean unless the field is explicitly internal-only. This includes option include/exclude modal descriptions.
- Preserve completed work before changing a different holiday segment. If October has just been set, click `완료` and wait for the save/return state before setting February.
- If product images are not already uploaded and the product-introduction page blocks progress, first look in the user's Downloads folder (`~/Downloads`, Finder label `下载`) for destination-matching image files. Use only files whose basename matches the Chinese scenic-spot name for the active listing, such as `天坛1.jpg`, `天坛 2.jpg`, and `天坛3.png` for a 天坛 product. Do not invent or upload unrelated images.
- If the user supplies exact image files in the prompt, use those files instead of searching for substitutes. Copy them into an upload-ready workspace folder first when needed and upload every supplied relevant image unless the user says to use only some of them.
- If a matching image file's suffix is missing or not `.jpg`, `.jpeg`, or `.png`, prepare an upload-ready copy before using it. For this NOL workflow, the platform accepts suffix-only image copies: copy the matching file, change the copy's suffix to `.jpg` or `.png`, and upload it directly. Keep the original files intact unless the user explicitly asks to rename them. Only convert formats if the upload fails.
- If fewer than three destination-matching uploadable images can be found or prepared, stop and ask the user to add the missing images to Downloads.
- Do not modify an existing product unless the user explicitly says to continue that product. For a new route, start a new draft from `新產品註冊`.
- If the active browser page contains a product ID for a different route, navigate back to product registration and create or claim the correct draft instead of repurposing that product.

## Source Data

Collect or infer these before starting:

- Internal route name, for example `北京市区酒店-北京天坛`.
- Korean city and destination names, for example `베이징` and `천단`.
- Destination ticket exclusion, for example `천단 티켓`.
- Price table by direction and vehicle:
  - `5座去程`
  - `7座去程`
  - `5座返程`
  - `7座返程`
- Three price columns:
  - normal weekday price
  - Labor/National Day price for `5.1-5.10` and `10.1-10.10`
  - Spring Festival price for `2.1-2.15`
- Sales period. Current flow uses `2026-08-01 ~ 2027-07-31` unless the user or task gives another range.
- Time slots. Current flow uses `08:00 ~ 21:30`, every `30` minutes.
- If the source table or screenshot specifies a different pickup window, override the default exactly. The Tokyo Disney Resort hotel-transfer run used `07:00 ~ 21:30`, every `30` minutes.
- Japanese station/port screenshots can show repeated `7座去程` / `10座去程` rows. When the product name and four-row layout clearly imply two directions, infer the second repeated pair as return. For Osaka city hotels ↔ **Osaka Station (`오사카역` only)**, the live prices were `784` HKD for 7-seat and `1176` HKD for 10-seat in both directions. Do not market 新大阪/`신오사카역` on the Osaka Station product (user Excel 红字 2026-08).

## Direct Execution Recipe

When the user says to continue/list the product and provides a table screenshot plus images in Downloads, follow this recipe without re-planning:

1. Identify the active product from the screenshot/table:
   - Chinese route/internal name, for example `北京市区酒店-北京圆明园`.
   - Destination Chinese scenic-spot name, for example `圆明园`.
   - Korean destination name, for example `위안밍위안`.
   - Four rows: `5座去程`, `7座去程`, `5座返程`, `7座返程`.
   - Three price columns: normal, Labor/National Day, Spring Festival.
2. Prepare images before or during the product-introduction page:
   - Search `~/Downloads` for files whose basename contains the Chinese scenic-spot name or an obvious variant.
   - Choose three best matches, usually numbered `1`, `2`, `3`.
   - Copy them to the listing workspace or `upload-ready-images/`.
   - Rename only the copies to `.jpg` or `.png` suffixes. This is enough for the current NOL platform; no content conversion is required unless upload fails.
   - Upload the three copied files and set the first/clearest destination image as representative.
3. Create or resume the correct NOL draft:
   - If the page is an existing product and the product name/internal name matches the active route, resume it.
   - Otherwise start `新產品註冊`, enter the Korean product name, select transportation, and begin product creation.
4. Fill product attributes, introduction, product rules, and reservation information using the templates below.
5. Create four options in order. Save each option card before creating the next.
6. In every option form, set the full normal sales period and normal price before saving the option.
7. After all four option cards are visible, set holiday calendar overrides from the saved cards only. Save each holiday segment separately.
8. Click exact `臨時存儲` and stop. Do not click `批准請求`.

For the Beijing price table style shown in recent tasks, map prices by row:

| Row | Option | Normal | Labor/National Day | Spring Festival |
| --- | --- | ---: | ---: | ---: |
| `5座去程` | `5seat go` | source row col 1 | source row col 2 | source row col 3 |
| `7座去程` | `7seat go` | source row col 1 | source row col 2 | source row col 3 |
| `5座返程` | `5seat return` | source row col 1 | source row col 2 | source row col 3 |
| `7座返程` | `7seat return` | source row col 1 | source row col 2 | source row col 3 |

If the screenshot is the common Beijing template values, use:

| Vehicle | Normal | Labor/National Day | Spring Festival |
| --- | ---: | ---: | ---: |
| 5-seat | `219` | `313` | `438` |
| 7-seat | `313` | `446` | `625` |

## Beijing Attraction Template

For a Beijing city-hotel attraction transfer, use these patterns:

- Product name: `베이징 시내 호텔 ↔ {destination_ko} 단독 차량 편도 이동 서비스`
- Partner/internal name: `{Chinese route name}`, for example `北京市区酒店-北京天坛`
- One-line marketing copy: `베이징 시내 ↔ {destination_ko} 편도 전용 차량으로 가족과 함께 여유로운 이동을 즐기세요!`
- Three summary lines:

```text
베이징 시내 호텔에서 {destination_ko}까지 단독 차량으로 편안하게 이동
대중교통 환승 없이 빠르고 쾌적한 전용 픽업 서비스
숙련된 기사님의 안전하고 친절한 응대
```

- Product introduction:

```text
이 서비스는 베이징 시내 호텔에서 {destination_ko}까지의 편도 전용 차량 이동 서비스입니다.
편안하고 프라이빗한 차량과 숙련된 기사님이 함께하여, 지하철 환승이나 택시 이용 없이 목적지까지 빠르고 쾌적하게 이동하실 수 있습니다.

포함 사항:
- 베이징 시내 호텔 출발 → {destination_ko} 도착 편도 전용 차량 서비스 1회
- 차량 및 기사 요금 포함으로, 별도 추가 요금 없음

예약 시간에 맞춰 고객님 숙소 앞에서 직접 픽업
숙련된 전문 기사님의 안전하고 친절한 서비스 제공

이 서비스는 가족, 커플, 소규모 그룹 등 {destination_ko}을 방문하시는 모든 분들께 적합하며,
출발 순간부터 여유롭고 편안한 여행을 시작할 수 있도록 도와드립니다.
지금 바로 예약하고, 복잡한 교통 걱정 없이 {destination_ko}에서의 하루를 즐겨보세요!
```

For destinations where the Korean object particle should be `를` instead of `을`, adjust the sentence naturally, for example `{destination_ko}를 방문하시는`.

## Product Attributes Page

Fill or select:

- Product name: Korean route-specific product name.
- Partner/internal name: Chinese route name.
- Subtitle: blank unless instructed.
- Usage type: date specified at booking.
- Product category: transportation goods / `運輸貨物`.
- Theme: `기사제공차량`.
- Travel type: private.
- People limit: yes.
- Min/max participants: min `1`, max `6` for the product-level Beijing transfer workflow. Vehicle-specific capacity appears in each option description.
- Nationality: no restriction.
- Progress language: Korean.
- Location/POI: destination POI, not a coordinate-less manual entry.

Save/move next only after these are visible.

## Product Introduction Page

Fill:

- Product images: at least 3 uploaded images, representative selected. When the page has no images yet, search `~/Downloads` for three Chinese destination-name matches before asking the user; for example, for `{destination_ko}=천단` and Chinese destination `天坛`, upload `天坛1.jpg`, `天坛2.jpg`, and `天坛3.jpg` if present.
- For the Tian Tan live draft, the known authorized files were `/Users/mac/Downloads/天坛1.jpg`, `/Users/mac/Downloads/天坛2.jpg`, and `/Users/mac/Downloads/天坛3.jpg`. For a different destination, replace only the basename with that destination's Chinese scenic-spot name and keep the same three-image rule.
- If files are in another suffix such as `.avif`, `.webp`, no suffix, or an unsupported suffix, copy them and change the copy suffix to `.jpg` or `.png`; upload those copies. Example used successfully: `/Users/mac/Downloads/圆明园 1.avif` copied to the workspace as `圆明园1.png` and uploaded without content conversion.
- One-line marketing copy.
- Exactly 3 summary lines.
- Product introduction body.
- Schedule type: no separate schedule.
- Must-know and how-to-use can follow the common templates if fields are on this page in the current UI.
- If the source notes include no-voucher, WhatsApp/SMS, route/time/address change notice, no child seat/night surcharge, vehicle capacity, or transport-detail requirements, reflect them in Korean customer-facing copy. For Tokyo Disney Resort-style transfers, add a booking-field sentence telling customers to enter the Tokyo city hotel name/address, Disney Resort pickup/drop-off or pickup place, use time, and reachable mobile phone number.

If image upload is still needed after checking Downloads and preparing suffix-correct upload copies, stop and ask for upload.

## Product Rules Page

Use the current transfer flow:

- Minimum reservation lead time: `3` days.
- Product purchase quantity: min `1`, max `10`.
- Inventory: no inventory management.
- Include: use Korean customer-facing text. For Japanese transport-hub transfer options, `運輸(도쿄 시내 호텔 ↔ 도쿄항 편도 전용 차량 이동 및 주차비 포함)` and, if `其他` is needed, `其他(픽업/샌딩 서비스 및 주차비 포함)` are acceptable. Do not paste Chinese include text such as `1. 接送服务 2. 停车费` into customer-facing fields.
- Exclude: `가이드 / 팁 / {destination_ko} 티켓`.
- Representative reservation information required:
  - `電話號碼`
  - `電子信箱`
  - `英文名字`
  - `出發日期及時間`
  - `飯店地址`
  - `上車地點`
  - `接駁時間`
  - `下車地點`
  - `Kakaotalk ID`
  - `人數`
  - `手提箱數量`
- Confirmation: manual confirmation, `3` business days.
- Voucher: reservation information confirmation / no exchange.
- Cancellation: cancellable, select partner confirmation `是（手动取消）`, `2` business days before use, `0%` fee, `100%` refund; after cutoff non-refundable. Do not select `否（自动取消）`.

If the voucher issue time warning appears because the voucher time differs from 72 hours, it can be saved when the page allows saving; report the warning.

## Option Creation

Create exactly 4 options:

1. `베이징 시내 출발 → {destination_ko} 편도 이동 (5인승 차량)`
2. `베이징 시내 출발 → {destination_ko} 편도 이동 (7인승 차량)`
3. `{destination_ko} 출발 → 베이징 시내 편도 이동 (5인승 차량)`
4. `{destination_ko} 출발 → 베이징 시내 편도 이동 (7인승 차량)`

Descriptions:

```text
{route option name without vehicle parenthetical} (5인승 차량, 4인 탑승 가능)
24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내
5인승 차량: 최대 2개까지 적재 가능
```

```text
{route option name without vehicle parenthetical} (7인승 차량, 6인 탑승 가능)
24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내
7인승 차량: 최대 3개까지 적재 가능
```

Price types:

- Option 1: `5seat go` / display description `5인승 차량`
- Option 2: `7seat go` / display description `7인승 차량`
- Option 3: `5seat return` / display description `5인승 차량`
- Option 4: `7seat return` / display description `7인승 차량`

For every price type:

- Use other/custom price type, not age-based.
- Check both `必需品购买` and `대표가`.
- Click the actual square checkboxes, not only the adjacent text. Verify both boxes show selected/blue check state before clicking the popup `완료`.
- Min/max purchase quantity in the price type: `1 ~ 10`.
- Confirm the option row visibly shows the representative and required-purchase labels. If the labels are absent, reopen the price type popup and check them again.
- The live UI may show a length warning such as `(12/10)` for `5seat return` or `7seat return`; it accepted and saved these names in the Tian Tan run. If a future UI blocks saving, shorten consistently to `5seat rtn` or `7seat rtn`.
- Option min/max purchase quantity: `1 ~ 10`.
- Option sale switch: on.

### New-Option Rule

- `註冊/添加選項` creates a new option form. It does not overwrite already saved option cards.
- Use `註冊/添加選項` for the second, third, and fourth options.
- Do not click `옵션 수정하기` unless editing a specific existing option is the task.
- After filling one option, click the option-form `下個` button to save that option card, then verify the card appears before creating the next option.
- Because bottom page buttons can overlap the option-form footer in the viewport, never click `下個`, `臨時存儲`, or `批准請求` by approximate coordinates. Prefer exact text/DOM selection and verify the button is the intended one.

## Time Slots

For each option, open `設定時間`:

1. Choose `반복 시간 추가`.
2. Set first start time to `08:00`.
3. Set last start time to `21:30`.
4. Set interval to `30 分鐘`.
5. Click `生成`.
6. Expected valid slots: 28.
7. If there are 29 delete buttons, delete the extra blank `选择` row, then verify 28 valid times remain.
8. Click the popup-level `節省`/save button.

Hard rule:

- The time setting does not take effect merely by setting start/end/interval. Click `生成` first, verify the list has exactly 28 generated times, and only then click `節省`. If you click save before generate, the option may keep an empty or stale time list.
- After selecting interval `30`, the dropdown may close automatically. If it closes, do not click the old dropdown-confirm position because that can hit the modal save button too early. Go directly to `生成`. If the dropdown remains open, click its `確定`, then click `生成`.
- If the UI is stubborn, set start time by opening the first time field, pressing ArrowDown eight times to reach `08:00`, pressing Enter, and confirming the dropdown; set last time to hour `21`, minute `30`, confirm, then generate.
- If the source uses `07:00`, set the first time to `07:00` and verify 30 generated slots through `21:30`.
- If selecting `21:30` or interval `30` closes the dropdown automatically, do not click the old dropdown `確定` position. In live use this can hit the modal save/form area and close the popup before generation.
- If the time modal closes before the generated list is visible, treat time slots as not verified. Reopen the option edit/time modal and repair before final temporary save when possible. If you preserve the draft anyway, explicitly report that time slots remain unverified/incomplete.

The valid slot list is:

```text
08:00 · 08:30 · 09:00 · 09:30 · 10:00 · 10:30 · 11:00 · 11:30 · 12:00 · 12:30 · 13:00 · 13:30 · 14:00 · 14:30 · 15:00 · 15:30 · 16:00 · 16:30 · 17:00 · 17:30 · 18:00 · 18:30 · 19:00 · 19:30 · 20:00 · 20:30 · 21:00 · 21:30
```

## Sales Calendar

For each option, first set the full normal sales period and normal price inside the option form:

- Sales period: `2026-08-01 ~ 2027-07-31` unless instructed otherwise.
- Normal price:
  - 5-seat options use the 5-seat normal price.
  - 7-seat options use the 7-seat normal price.
- Confirm the calendar cells show the normal price across the sales period before saving the option.
- Use the UI calendar range picker when direct date fields resist typing. From `7月 2026`, move to `8月 2026` and select `1` as the start date; then move to `7月 2027` and select `31` as the end date. If selecting `31` resets the range because of stale state, reselect `2026-08-01` and then `2027-07-31`.
- After the range is selected, scroll to the normal-price field, replace the value with the option's normal price, and verify visible cells show the price before saving the option form with `下個`.

Then use `판매 캘린더 관리` on the saved option card for holiday overrides.

When operating the browser directly, use the helper sequence and recovery rules in `nol-partner-browser-playbook.md` for this section.

### Critical Calendar Rule

Set and save one holiday segment at a time:

1. Open `판매 캘린더 관리`.
2. Switch to `단일 날짜 선택 (다중 선택 가능)` for override work.
3. Navigate to the target month.
4. Select only the target holiday dates.
5. Enter the override price.
6. Verify the visible date cells changed to that price.
7. Click `완료`.
8. Wait for the temporary-save confirmation or return to the option list.
9. Reopen the calendar for the next holiday segment.

Do not set October, February, and May in one unsaved popup. In live use, selecting February after October caused October dates to inherit the February price. If this happens, immediately reselect only the wrong dates in single-date mode, enter the correct price, verify visible cells, and save before continuing.

If the user reminds `先保存再设置2月的`, the correct action is: finish the current October popup with `완료`, wait until the option list/calendar closes or save state settles, then reopen `판매 캘린더 관리` for February.

Holiday windows for the current one-year period:

- `2026-10-01 ~ 2026-10-10`: Labor/National Day price.
- `2027-02-01 ~ 2027-02-15`: Spring Festival price.
- `2027-05-01 ~ 2027-05-10`: Labor/National Day price.

For price tables matching the Beijing attraction transfer pattern:

- 5-seat options:
  - normal: `219`
  - Labor/National Day: `313`
  - Spring Festival: `438`
- 7-seat options:
  - normal: `313`
  - Labor/National Day: `446`
  - Spring Festival: `625`

Always use the user's current screenshot or source table when it differs from these values.

## Route-Specific Live Notes

- For Tokyo city hotel ↔ Tokyo Disney Resort, Tokyo Station, Tokyo Port, or similar 7-seat/10-seat transfer listings, load `tokyo-disney-transfer-live-notes.md` before filling copy/options. It includes the no-voucher/WhatsApp wording, booking-field sentence, 7-seat and 10-seat luggage capacities, `07:00 ~ 21:30` time-slot rule, prices/patterns for station/port examples, and browser recovery notes from the live runs.
- For Osaka city hotel ↔ Osaka Port, load `osaka-port-live-notes.md` before filling copy/options. It contains the exact Osaka Port field values, user-supplied image list, ship-name/boarding wording, `784`/`1176` HKD prices, return-row inference, 30-slot time-popup verification, and final temporary-save checklist.
- For Tokyo city hotel ↔ Haneda Airport (HND) or other Japanese airport transfers, load `haneda-airport-live-notes.md`. It contains `70`/`105` HKD pricing for Haneda, flight reservation ids, Korean airport copy, Japan no-holiday-markup rule, option price-type checkbox selectors, `7070` double-fill trap, regulations-stepper bypass via option URL, CDP/Playwright fallback when Codex browser is unavailable, and absolute no-approval stop.

## Save And Final Stop

- After all options and sales calendars are complete, click `臨時存儲`.
- Confirm the green temporary-save message appears. A message saying final reflection/review requires approval is acceptable; it means temporary save succeeded, not that approval was clicked.
- Do not click `批准請求`. If the cursor or focus is near the approval button, stop and reselect `臨時存儲` by exact text/DOM before clicking anything.
- Final report should state:
  - Product/route completed.
  - Four option names completed.
  - Normal sales period and prices.
  - Holiday override windows and prices.
  - Time slots.
  - `臨時存儲` status.
  - `批准請求` was not clicked.
