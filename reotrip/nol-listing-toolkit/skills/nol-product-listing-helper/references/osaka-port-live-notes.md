# Osaka Port Transfer Live Notes

Use this reference for Osaka city hotel ↔ Osaka Port private transfer listings, especially when the source table shows repeated `7座去程` / `10座去程` rows and the user supplies Osaka Port images.

## Live Source Data

The Osaka Port live run used:

| Source row | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Osaka city hotel -> Osaka Port, 7-seat | `784` |
| `10座去程` | Osaka city hotel -> Osaka Port, 10-seat | `1176` |
| repeated `7座去程` | Osaka Port -> Osaka city hotel, 7-seat | `784` |
| repeated `10座去程` | Osaka Port -> Osaka city hotel, 10-seat | `1176` |

When the product name and four-row layout clearly imply two directions, infer the second repeated pair as return. If the table has only two rows or the route scope is ambiguous, ask before creating return options.

## Product Identity

- Product name: `오사카 시내 호텔 ↔ 오사카항 단독 차량 편도 이동 서비스`
- Partner/internal name: `大阪市区酒店-大阪港`
- Theme: driver-provided vehicle / `기사제공차량`.
- Product-level max people: `9`, because the largest option is the 10-seat vehicle with maximum 9 usable passenger seats.
- Location/POI: use a real Osaka Port POI. In the live run, `오사카 국제 페리 터미널` was selected.
- Product sale period: prefer `2026-08-01 ~ 2027-07-31` when the source expects the annual period. On `2026-08-03`, the first two dates were already disabled, so quick `1年` retained `2026-08-03 ~ 2027-08-03`. Report the actual visible retained period honestly.

## Images

The user supplied these Osaka Port files and all were uploaded:

```text
/Users/mac/Downloads/大阪港1.jpg
/Users/mac/Downloads/大阪港2.jpg
/Users/mac/Downloads/大阪港3.jpg
/Users/mac/Downloads/大阪港4.jpg
/Users/mac/Downloads/大阪港5.jpg
/Users/mac/Downloads/大阪港6.jpg
/Users/mac/Downloads/大阪港7.jpg
/Users/mac/Downloads/大阪港8.jpg
/Users/mac/Downloads/大阪港9.jpg
```

Copy supplied images into a workspace upload-ready folder first, for example `upload-ready-images/osaka-port/`, and upload every supplied relevant file unless the user asks for a smaller set. Do not search for substitute images when the user provided exact files.

If direct `setInputFiles()` is unavailable in the browser runtime, use file chooser flow: start `waitForEvent('filechooser')`, click the upload button, then `chooser.setFiles(paths)`.

## Korean Copy Blocks

One-line marketing copy:

```text
오사카 시내 호텔 ↔ 오사카항 편도 전용 차량으로 편안하고 여유롭게 이동하세요!
```

Three summary lines:

```text
오사카 시내 호텔과 오사카항 사이를 단독 차량으로 편안하게 이동
대중교통 환승 없이 예약 시간에 맞춘 전용 픽업/샌딩 서비스
차량별 수하물 기준과 항만 승하선 정보를 확인해 안심하고 이용
```

High-visibility booking-field sentence:

```text
예약 시 오사카 시내 호텔명/주소, 오사카항 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 선박명 및 승하선 정보를 정확히 입력해 주세요.
```

Required copy points:

- No separate ticket, voucher, or exchange document is needed.
- The driver normally contacts the customer one day before use via WhatsApp or SMS.
- The customer must enter a reachable mobile number, and WhatsApp should be available when possible.
- The customer must verify route, pickup/drop-off place, pickup time, address, passenger count, luggage count, ship name, and boarding/disembarking information.
- Route, pickup time, address, or reservation-info changes must be requested at least 2 days before use.
- Ship tickets, child seats, night surcharge, personal expenses, guides, tips, and add-on services are not included unless explicitly supplied.

FAQ topics used in the live run:

1. No separate ticket/voucher needs to be shown.
2. Vehicle luggage capacity.
3. Driver contact timing/channel.
4. How to request pickup-time/place changes.

## Product Rules

- Minimum reservation lead time: `3` days.
- Product purchase quantity: `1 ~ 10`.
- Inventory: no inventory management.
- Confirmation: manual confirmation, `3` business days.
- Voucher: reservation information confirmation / no exchange. In the live run, an older template named like `[5seat From Beijing Central District to Beijing Universal Studios ]` was acceptable because its method was no-voucher/reservation-information confirmation.
- Cancellation: cancellable, partner manual cancellation `是（手动取消）`, `2` business days before use, `0%` fee, `100%` refund; after cutoff non-refundable.
- Include: `運輸(오사카 시내 호텔 ↔ 오사카항 편도 전용 차량 이동 및 주차비 포함)` and, if `其他` is needed, `其他(픽업/샌딩 서비스 및 주차비 포함)`.
- Exclude: `선박 티켓 / 아동용 카시트 / 야간 할증 / 개인 경비 / 가이드 / 팁 / 기타 추가 서비스`.
- A warning that reservation lead time `3` days differs from copy mentioning `2` days for changes can be saved if the page allows it; the two meanings are different.

Required reservation-info ids used in the live run:

```text
CELLPHONE-required
EMAIL-required
ENGLISH_LAST_NAME-required
ENGLISH_FIRST_NAME-required
DEPARTURE_DATE_TIME-required
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

Clear airport-specific fields such as PNR, flight number, airline code, and arrival flight date/time unless the product is actually an airport transfer. If the translated summary looks odd after save, rely on checkbox ids and make the ship-name/boarding requirement visible in Korean copy.

## Vehicle Capacity

- 7-seat option: maximum 4 passengers plus 5 pieces of 24-inch luggage.
- 10-seat option: maximum 9 passengers plus 10 pieces of 26-inch luggage.

Normalize typo-like source text such as `10座：9人+9人+10个行李` to maximum 9 passengers plus 10 luggage pieces.

## Options

Create four option cards:

1. `오사카 시내 호텔 출발 → 오사카항 편도 이동 (7인승 차량)` / price type name `7인승 가는` / desc `7인승 차량` / HKD `784`.
2. `오사카 시내 호텔 출발 → 오사카항 편도 이동 (10인승 차량)` / `10인승 가는` / `10인승 차량` / HKD `1176`.
3. `오사카항 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / `7인승 차량` / HKD `784`.
4. `오사카항 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / `10인승 차량` / HKD `1176`.

English `7seat go` / `7seat rtn` names are **deprecated** (2026-08 audit: use Korean 價格類型名稱).

Outbound 7-seat description:

```text
오사카 시내 호텔 출발 → 오사카항 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)
24인치 이하 수하물 기준: 최대 5개까지 적재 가능
별도 선박 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Outbound 10-seat description:

```text
오사카 시내 호텔 출발 → 오사카항 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)
26인치 이하 수하물 기준: 최대 10개까지 적재 가능
별도 선박 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Return 7-seat description:

```text
오사카항 출발 → 오사카 시내 호텔 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)
24인치 이하 수하물 기준: 최대 5개까지 적재 가능
별도 선박 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Return 10-seat description:

```text
오사카항 출발 → 오사카 시내 호텔 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)
26인치 이하 수하물 기준: 최대 10개까지 적재 가능
별도 선박 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

For every option:

- Use `注册/添加选项` for a new card; do not use option edit unless intentionally repairing.
- Use custom/other price type, not age-based.
- Min/max purchase quantity: `1 ~ 10`.
- Required-purchase and representative-price switches must be visibly selected for the single price type.
- Keep sale switch on.
- Fill the sale period first, then price, then time slots.
- Save the option with the option-form `下個`, then verify the new card appears before creating the next one.

## Time Popup Exact Behavior

Use `07:00` through `21:30` every 30 minutes for every option. Expected 30 slots:

```text
07:00 · 07:30 · 08:00 · 08:30 · 09:00 · 09:30 · 10:00 · 10:30 · 11:00 · 11:30 · 12:00 · 12:30 · 13:00 · 13:30 · 14:00 · 14:30 · 15:00 · 15:30 · 16:00 · 16:30 · 17:00 · 17:30 · 18:00 · 18:30 · 19:00 · 19:30 · 20:00 · 20:30 · 21:00 · 21:30
```

Recommended live sequence:

1. Open `设定时间`.
2. If the popup shows only an individual `选择` row, click `旅游产品后台字段：添加重复次数`.
3. Set first start time to `07:00`.
4. Set last start time to `21:30`.
5. Click `分鐘`, choose `30`, and confirm only if a visible picker `確定` button remains.
6. Click `旅游产品后台字段：创建`.
7. Verify the generated list contains exactly 30 unique `HH:MM` values, starts at `07:00`, and ends at `21:30`.
8. Click popup-level `節省`.
9. Click option-form `下個`.

Critical pitfalls:

- After selecting end time `21:30` or interval `30`, the picker may close automatically. If it closes, do not click the stale `確定` coordinate. In live use, that can hit the modal save/form area and close the time popup before generation.
- Setting start/end/interval is not enough. The generated list must be visible before `節省`.
- The individual blank `选择` row can remain before generation. After `创建`, verify there are 30 generated times; if a blank row remains or the count is 31, delete the blank row before saving.
- If the time popup closes before the generated list is visible, treat time as unverified and repair the option before final temporary save.

## Browser Operation Notes From Osaka Port

- If the active tab already has the correct product id, resume it. If it is a different draft, create or claim the correct route rather than repurposing it.
- The browser runtime may not support in-page `el.click()` from `evaluate()` for React elements. Prefer Playwright locators by button index/text, DOM enumeration, and visible coordinates only as a last resort.
- Enumerate buttons before clicking bottom controls. The page can show both global `临时存储`/`批准请求` and option-form `临时存储`/`下個`. Use exact text plus size/position filters; never approximate-click the approval area.
- In the time popup, repeated-use helper code should target the currently visible button indexes after each popup transition. Button indexes change after generation.
- After every option save, wait for the list refresh and verify the exact Korean option name appears.
- The option list does not display prices. Verify price propagation inside the calendar before saving the option.
- The final action is exact `临时存储`. The visible message `您的更改已暂时保存。如需最终反映，请点击“请求批准”按钮。` means temporary save succeeded; it is not an instruction to click approval.

## Final Verification

Before reporting completion:

- Four option cards are visible with the exact route names above.
- Prices were entered as HKD `784`, `1176`, `784`, `1176`.
- Each option time list was generated and verified as 30 slots from `07:00` through `21:30`.
- All supplied Osaka Port images were uploaded.
- Product copy includes no-voucher, WhatsApp/SMS contact, 2-day change notice, luggage capacity, and ship-name/boarding information.
- `临时存储` was clicked and the temporary-save message was observed.
- `批准请求` was not clicked.
