# Yokohama Port Transfer Live Notes

Use this reference for Tokyo city hotel ↔ Yokohama Port private transfer listings, especially when the source table shows repeated `7座去程` / `10座去程` rows and the user supplies Yokohama Port images.

## Live Source Data

The Yokohama Port live run used:

| Source row | Listing meaning | Sale price HKD |
| --- | --- | ---: |
| `7座去程` | Tokyo city hotel -> Yokohama Port, 7-seat | `112` |
| `10座去程` | Tokyo city hotel -> Yokohama Port, 10-seat | `134` |
| repeated `7座去程` | Yokohama Port -> Tokyo city hotel, 7-seat | `112` |
| repeated `10座去程` | Yokohama Port -> Tokyo city hotel, 10-seat | `134` |

When the product name and four-row layout clearly imply two directions, infer the second repeated pair as return. If the table has only two rows or route scope is ambiguous, ask before creating return options.

## Product Identity

- Product name: `도쿄 시내 호텔 ↔ 요코하마항 단독 차량 편도 이동 서비스`
- Partner/internal name: `东京市区-横滨港`
- Theme: driver-provided vehicle / `기사제공차량`.
- Product-level max people: `9`, because the largest option is the 10-seat vehicle with maximum 9 usable passenger seats.
- Location/POI: use a real Yokohama Port POI. In the live run, `요코하마항 오산바시 국제여객선 터미널` was selected.
- Product sale period: prefer the source operating year if selectable. If past dates are disabled, quick `1年` may retain `2026-08-03 ~ 2027-08-03`; report the actual visible retained period honestly.

## Images

The user supplied these Yokohama Port files and all four were uploaded:

```text
/Users/mac/Downloads/横滨港2.jpg
/Users/mac/Downloads/横滨港3.jpg
/Users/mac/Downloads/横滨港4.jpg
/Users/mac/Downloads/横滨港5.jpg
```

Copy supplied images into a workspace upload-ready folder first, for example `upload-ready-images/yokohama-port/`, and upload every supplied relevant file unless the user asks for a smaller set. Do not search for substitute images when the user provided exact files.

## Korean Copy Requirements

One-line marketing copy:

```text
도쿄 시내 호텔과 요코하마항을 편안하게 연결하는 전용 차량 이동 서비스입니다.
```

Three summary lines:

```text
도쿄 시내 호텔 ↔ 요코하마항 단독 편도 차량 이동
7인승/10인승 차량으로 인원과 수하물에 맞춘 편안한 이동
WhatsApp 또는 SMS로 사전 연락 후 지정 장소에서 픽업
```

High-visibility booking-field sentence:

```text
예약 시 도쿄 시내 호텔명/주소, 요코하마항 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 선박명 및 승하선 정보를 정확히 입력해 주세요.
```

Required copy points:

- No separate ticket, voucher, or exchange document is needed.
- The driver normally contacts the customer one day before use via WhatsApp or SMS.
- The customer must enter a reachable mobile number, and WhatsApp should be available when possible.
- The customer must verify route, pickup/drop-off place, pickup time, address, passenger count, luggage count, ship name, and boarding/disembarking information.
- Route, pickup time, address, or reservation-info changes must be requested at least 2 days before use.
- Ship tickets, child seats, night surcharge, personal expenses, guides, tips, and add-on services are not included unless explicitly supplied.

## Product Rules

- Minimum reservation lead time: `3` days.
- Product purchase quantity: `1 ~ 10`.
- Inventory: no inventory management.
- Confirmation: manual confirmation, `3` business days.
- Voucher: reservation information confirmation / no exchange.
- Cancellation: cancellable, partner manual cancellation `是（手动取消）`, `2` business days before use, `0%` fee, `100%` refund; after cutoff non-refundable.
- Include: `運輸(도쿄 시내 호텔 ↔ 요코하마항 편도 전용 차량 이동 및 주차비 포함)`.
- Exclude: `선박 티켓 / 아동용 카시트 / 야간 할증 / 개인 경비 / 팁 / 기타 추가 서비스`.
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

Clear airport-specific fields such as PNR, flight number, airline code, and arrival flight date/time unless the product is actually an airport transfer. If the translated summary looks odd after save, rely on checkbox ids and keep the ship-name/boarding requirement visible in Korean copy.

## Vehicle Capacity

- 7-seat option: maximum 4 passengers plus 5 pieces of 24-inch luggage.
- 10-seat option: maximum 9 passengers plus 10 pieces of 26-inch luggage.

Normalize typo-like source text such as `10座：9人+9人+10个行李` to maximum 9 passengers plus 10 luggage pieces.

## Options

Create four option cards:

1. `도쿄 시내 호텔 출발 → 요코하마항 편도 이동 (7인승 차량)` / price type name `7인승 가는` / desc `7인승 차량` / HKD `112`.
2. `도쿄 시내 호텔 출발 → 요코하마항 편도 이동 (10인승 차량)` / `10인승 가는` / `10인승 차량` / HKD `134`.
3. `요코하마항 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / `7인승 차량` / HKD `112`.
4. `요코하마항 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / `10인승 차량` / HKD `134`.

English price-type codes are **deprecated**; use Korean names (2026-08 audit).

Outbound 7-seat description:

```text
도쿄 시내 호텔 출발 → 요코하마항 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)
24인치 이하 수하물 기준: 최대 5개까지 적재 가능
별도 선박 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Outbound 10-seat description:

```text
도쿄 시내 호텔 출발 → 요코하마항 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)
26인치 이하 수하물 기준: 최대 10개까지 적재 가능
별도 선박 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Return 7-seat description:

```text
요코하마항 출발 → 도쿄 시내 호텔 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)
24인치 이하 수하물 기준: 최대 5개까지 적재 가능
별도 선박 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Return 10-seat description:

```text
요코하마항 출발 → 도쿄 시내 호텔 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)
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
2. If the popup shows only an individual `选择` row, click `반복 时间添加`.
3. Set first start time to `07:00`.
4. Set last start time to `21:30`.
5. Click `分鐘`, choose `30`, and confirm only if a visible picker `確定` button remains.
6. Click `생성`.
7. Verify the generated list contains exactly 30 unique `HH:MM` values, starts at `07:00`, and ends at `21:30`.
8. If a blank individual `选择` row remains and the popup shows 31 delete buttons, delete the final blank row.
9. Click popup-level `節省`.
10. Click option-form `下個`.

Critical pitfalls:

- Setting start/end/interval is not enough. The generated list must be visible before `節省`.
- When choosing the start time, use the hour list for `07` and the minute list for `00`. A global `option "00"` click can hit the hour list and reset the first start time to `00:00`.
- After selecting end time `21:30` or interval `30`, the picker may close automatically. If it closes, do not click the stale `確定` coordinate. That can hit the modal save/form area and close the time popup before generation.
- The raw snapshot can show duplicated `HH:MM` matches because each time appears in nested text. Count unique time values; the target is 30 unique slots from `07:00` through `21:30`.
- If the time popup closes before the generated list is visible, treat time as unverified and repair the option before final temporary save.

## Sales Calendar And Price Verification

- Japan fleet-cost notes can say the cost is fixed and no holiday markup applies. In that case, do not add October/February/May holiday overrides.
- Use the visible sale period that NOL accepts. On the live Yokohama run, quick `1年` retained `2026-08-03 ~ 2027-08-03`.
- Enter the option price into the sale price field and verify visible calendar cells show the same price before saving the option.
- After an option is saved and reopened, the `請輸入價格` textbox can be disabled and visually blank. Do not treat that blank disabled input as missing price. Verify price by reading the visible calendar cells such as `3 134`, `4 134`, etc., or by opening `销售日历管理`.
- The option list does not display prices. Use option edit/calendar views to verify prices, not the list cards.

## Browser Operation Notes From Yokohama Port

- After clicking an option-form `下個`, the option card may appear while the edit dialog remains in the DOM. Wait, resnapshot, and verify the card count before creating the next option. If the dialog remains, use the form `下個` to save/exit rather than clicking approval-area controls.
- The page can show both global `临时存储`/`批准请求` and option-form `临时存储`/`下個`. Enumerate buttons or scope to the active dialog; never click by approximate coordinates.
- If the user says "价格怎么没输入", first explain that list cards do not show prices and the saved disabled price input may look blank. Then immediately open the relevant option/calendar and verify visible calendar-cell prices. If calendar cells are blank, repair the price and temporary-save.
- The final action is exact `临时存储`. The message `您的更改已暂时保存。如需最终反映，请点击“请求批准”按钮。` means temporary save succeeded; it is not an instruction to click approval.

## Final Verification

Before reporting completion:

- Four option cards are visible with the exact route names above.
- Prices were entered as HKD `112`, `134`, `112`, `134`, verified from visible calendar cells, not inferred from a disabled blank input.
- Each option time list was generated and verified as 30 slots from `07:00` through `21:30`.
- All supplied Yokohama Port images were uploaded.
- Product copy includes no-voucher, WhatsApp/SMS contact, 2-day change notice, luggage capacity, and ship-name/boarding information.
- No holiday overrides were added when the Japan fleet cost is fixed/no holiday markup.
- `临时存储` was clicked and the temporary-save message was observed.
- `批准请求` was not clicked.
