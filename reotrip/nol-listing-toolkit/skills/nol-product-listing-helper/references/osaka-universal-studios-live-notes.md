# Osaka Universal Studios Japan Transfer Live Notes

Use this reference for Osaka city hotel ↔ Universal Studios Japan private transfer listings, especially the internal route `大阪市区酒店-大阪环球影城`. Pair it with `nol-transfer-live-listing-workflow.md`, `nol-partner-browser-playbook.md`, and `tokyo-disney-transfer-live-notes.md`.

## Live Source Data

The live Osaka USJ run used workbook `/Users/mac/Downloads/NOL 待上架产品 (3).xlsx`, sheet `日本接送产品`, rows 6-9:

| Source option | Listing meaning | Cost | Sale price HKD |
| --- | --- | ---: | ---: |
| `7座去程` | Osaka city hotel -> Universal Studios Japan, 7-seat | `439.22` | `627` |
| `10座去程` | Osaka city hotel -> Universal Studios Japan, 10-seat | `713.73` | `1020` |
| repeated `7座去程` | Universal Studios Japan -> Osaka city hotel, 7-seat | `439.22` | `627` |
| repeated `10座去程` | Universal Studios Japan -> Osaka city hotel, 10-seat | `713.73` | `1020` |

Spreadsheet pitfall:

- The sale-price column was a formula such as `=C6/0.7`; `openpyxl.load_workbook(..., data_only=True)` returned `None` because the workbook did not contain cached formula results. Use the formula or screenshot display to derive sale prices: `439.22 / 0.7 = 627`, `713.73 / 0.7 = 1020`.
- The shared note says the Japan fleet cost is fixed and there is currently no holiday markup. Do not add October/February/May overrides for this product unless the source explicitly adds them.

## Images

The user supplied three files:

```text
/Users/mac/Downloads/大阪环球影城.webp
/Users/mac/Downloads/大阪环球影城2.webp
/Users/mac/Downloads/大阪环球影城3.webp
```

Prepare upload copies without changing originals:

```text
upload-ready-images/osaka-universal-studios/大阪环球影城1.jpg
upload-ready-images/osaka-universal-studios/大阪环球影城2.jpg
upload-ready-images/osaka-universal-studios/大阪环球影城3.jpg
```

The live upload accepted suffix-only `.jpg` copies of `.webp` files. Use file chooser upload and upload all three; the first image became representative automatically.

## Product Attributes

- Product name: `오사카 시내 호텔 ↔ 유니버설 스튜디오 재팬 단독 차량 편도 이동 서비스`
- Partner/internal name: `大阪市区酒店-大阪环球影城`
- Product type/category: transportation / `運輸貨物`
- Theme: `기사제공차량`
- People limit: yes
- Travel type: private
- Product min/max people: `1 ~ 9` because the largest vehicle is 10-seat with usable max 9 passengers.
- Nationality: no restriction
- Progress language: Korean
- Location/POI: search `유니버설 스튜디오 재팬`; choose the tourist attraction result `유니버셜 스튜디오 재팬`, address `2 Chome-1-33 Sakurajima, Konohana-ku, Osaka-shi, Osaka-fu 554-0031`.

Location modal pitfall:

- After selecting the POI and clicking `添加地点`, the modal may not close. That button only expands the lower location-type form.
- Select location type `TRAVEL_PLACE` / tourist place, keep the name tag `유니버셜 스튜디오 재팬`, then click the lower final `添加`. Only after that should the dialog close and the POI appear on the attributes page.

## Product Introduction Copy

One-line promotion:

```text
오사카 시내 호텔과 유니버설 스튜디오 재팬을 전용 차량으로 편리하게 이동하세요!
```

Three-line summary:

```text
오사카 시내 호텔 ↔ 유니버설 스튜디오 재팬 편도 전용 차량 이동
대중교통 환승 없이 원하는 시간에 맞춘 프라이빗 픽업 서비스
기사님이 사전 연락 후 안전하고 편안하게 목적지까지 이동
```

Product introduction:

```text
이 상품은 오사카 시내 호텔과 유니버설 스튜디오 재팬 사이를 편도 전용 차량으로 이동하는 프라이빗 픽업/샌딩 서비스입니다.

별도의 티켓이나 교환권을 제시할 필요 없이, 예약 정보 확인 후 이용하실 수 있습니다. 기사님은 보통 이용일 전날 WhatsApp 또는 SMS로 고객님께 연락드리니, 예약 시 입력한 휴대전화 번호가 WhatsApp에 등록되어 있고 연락 가능한 상태인지 확인해 주세요.

예약 시 오사카 시내 호텔명/주소, 유니버설 스튜디오 재팬 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.

7인승 차량은 최대 4명과 24인치 이하 수하물 5개까지, 10인승 차량은 최대 9명과 26인치 이하 수하물 10개까지 이용하실 수 있습니다. 선택하신 차량 공간이 탑승 인원과 수하물에 충분한지 예약 전 확인해 주세요.

경로, 픽업 시간, 주소 등 예약 정보 변경은 이용일 최소 2일 전까지 요청해 주세요. 이후 변경은 어려울 수 있습니다. 유니버설 스튜디오 재팬 입장권, 아동용 카시트, 야간 할증, 개인 경비 및 팁은 포함되어 있지 않습니다.
```

Schedule type: `沒有单獨的时间表`.

Must-know:

```text
예약 시 선택한 이동 방향, 픽업/샌딩 장소, 이용 시간, 탑승 인원 및 수하물 수량을 반드시 확인해 주세요.
기사님은 보통 이용일 전날 WhatsApp 또는 SMS로 연락드리므로, 연락 가능한 휴대전화 번호를 정확히 입력해 주세요.
경로, 픽업 시간, 주소 등 예약 정보 변경은 이용일 최소 2일 전까지 요청해 주세요. 이후 변경은 어려울 수 있습니다.
7인승 차량은 최대 4명 및 24인치 이하 수하물 5개, 10인승 차량은 최대 9명 및 26인치 이하 수하물 10개 기준입니다.
유니버설 스튜디오 재팬 입장권, 아동용 카시트, 야간 할증, 개인 경비 및 팁은 포함되어 있지 않습니다.
```

How-to-use:

```text
1. 예약 시 오사카 시내 호텔명/주소, 유니버설 스튜디오 재팬 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 탑승 인원, 수하물 수량을 정확히 입력해 주세요.
2. 예약 접수 후 영업일 기준 3일 이내 수동으로 확정 여부를 안내드립니다.
3. 별도의 티켓이나 교환권 제시 없이 예약 정보 확인으로 이용합니다.
4. 기사님은 보통 이용일 전날 WhatsApp 또는 SMS로 연락드리며, 지정된 시간과 장소에서 고객님을 픽업합니다.
```

## Product Rules

- Minimum reservation lead time: `3` days.
- Product purchase quantity: `1 ~ 10`.
- Inventory: no inventory management.
- Include: `運輸(오사카 시내 호텔 ↔ 유니버설 스튜디오 재팬 편도 전용 차량 이동 및 주차비 포함)`.
- Exclude: `유니버설 스튜디오 재팬 입장권 / 아동용 카시트 / 야간 할증 / 개인 경비 / 팁`.
- Confirmation: manual confirmation, `3` days.
- Voucher: choose the existing no-voucher template whose method is `예약정보로 확인 / 예약정보로 확인·无需換貨`. In the live run this was the older template named like `[5seat From Beijing Central District to Beijing Universal Studios ]`.
- Voucher warning: `凭证 발급 时间[0时间]` vs product info `72时间` appeared. It is acceptable when the page allows saving; do not switch to separate-voucher issuance.
- Cancellation: cancellable; choose `예 (수동취소)`, add `2` business days before use, `0%` fee, `100%` refund, then delete the blank cancellation row NOL creates after `添加`.
- The `3 days` lead-time and `2 days` change/cancellation wording can produce a warning that values differ. Preserve it; they refer to different operational rules.

## Reservation Information

Desired required IDs for this product:

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

Airport fields must remain off:

```text
AIRLINE_CODE-required
PNR-required
DEPARTURE_FLIGHT_NUMBER-required
ARRIVAL_FLIGHT_NUMBER-required
ARRIVAL_DATE_TIME-required
```

Live pitfall:

- The translated visible row names can be misleading. In the live run, clicking by visible y-position selected `ARRIVAL_DATE_TIME-required` instead of `DEPARTURE_DATE_TIME-required`. Use checkbox IDs or map each visible label to its underlying input ID before clicking.
- The reservation-info modal uses a virtualized/scrolling list. Reopen and inspect `input[type="checkbox"]` IDs if the summary looks wrong.
- If `DEPARTURE_DATE_TIME-required` cannot be reliably selected after repair, do not substitute arrival/flight fields. Keep pickup time/booked time selected, make the use-time requirement prominent in introduction, must-know, and how-to-use, preserve the draft, and report the limitation honestly.

## Options

Create exactly four options. **Price-type name = Korean** (audit 2026-08: do not use English `7seat go`):

1. `오사카 시내 호텔 출발 → 유니버설 스튜디오 재팬 편도 이동 (7인승 차량)` / name `7인승 가는` / desc `7인승 차량` / HKD `627`.
2. `오사카 시내 호텔 출발 → 유니버설 스튜디오 재팬 편도 이동 (10인승 차량)` / `10인승 가는` / `10인승 차량` / HKD `1020`.
3. `유니버설 스튜디오 재팬 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)` / `7인승 오는` / `7인승 차량` / HKD `627`.
4. `유니버설 스튜디오 재팬 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)` / `10인승 오는` / `10인승 차량` / HKD `1020`.

Option descriptions:

```text
오사카 시내 호텔 출발 → 유니버설 스튜디오 재팬 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)
24인치 이하 수하물 기준: 최대 5개까지 적재 가능
유니버설 스튜디오 재팬 입장권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

```text
오사카 시내 호텔 출발 → 유니버설 스튜디오 재팬 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)
26인치 이하 수하물 기준: 최대 10개까지 적재 가능
유니버설 스튜디오 재팬 입장권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.
```

Mirror the descriptions for return options with `유니버설 스튜디오 재팬 출발 → 오사카 시내 호텔 도착`.

Option setup:

- Use `其他价格类型（手动输入）`.
- Fill price-type name and description by placeholders, not labels: `輸入的名稱將顯示在銷售渠道上。` and `例) 滿 19 歲以上`.
- Tick both `必需品购买` and `代表价`. The live coordinates after scrolling the price-type modal were near the actual square boxes, not the text labels; verify the option form shows both `代表价` and `必需品购买`.
- Price-type min/max and option min/max: `1 ~ 10`.
- If the price-type popup changes the option name, refill the full option name before setting sales/time and again before saving the option.
- After clicking option-form `下個`, the card can appear in the list while the edit dialog still appears in the snapshot for a few seconds. Wait and resnapshot before assuming the option failed.

## Sales Period And Time Slots

- Use quick `1年` when exact date fields resist editing or when `2026-08-01` / `2026-08-02` are disabled because they are in the past.
- On the live run dated `2026-08-03`, `1年` produced visible period `2026-08-03 ~ 2027-08-03`. Report this actual period honestly.
- No holiday override calendar work was needed because the source says no Japan holiday markup.
- For each option, set time slots to **`07:00 ~ 21:30` every `30` minutes** (30 slots).
- **Audit correction:** USJ must **not** start at `09:30`. User found 09:30 start on this product and corrected it to **07:00**; skill default is always 07:00 unless Excel says otherwise.
- Required sequence: open `设定时间`, click `반복 时间添加`, set first start **`07:00`**, set last start `21:30`, set interval `30 分鐘`, click `생성`, verify the generated list starts at `07:00`, ends at `21:30`, and contains 30 unique slots, then click popup-level `節省`.
- Snapshot text may show each time twice because the button and inner generic both contain the same time. Count unique `HH:MM` values, not raw regex matches.
- After generation, an extra blank `选择` row may remain after the 30 valid slots. The time list is acceptable when the 30 valid generated slots are visible and saved.

## FAQ (required)

```text
Q: 중간에 다른 장소에서 승하차할 수 있나요?
A: 본 서비스는 출발지에서 목적지까지 바로 이동하는 지점 간 전용 차량 서비스입니다. 중간 경유지 추가 또는 중간 승하차는 제공되지 않습니다.
```

Audited draft id: `4b49b221-a013-4420-9def-ffddfc09a310`.

## Final Stop

- After four option cards are visible and toggled to selling, click exact `临时存储`.
- Confirm the green toast: `변경사항이 임시저장되었어요. 최종 반영을 위해 ‘승인 요청’ 버튼을 눌러주세요.`
- Do not click `批准请求`.

Final report should include:

- Four options and prices.
- Actual visible sale period, especially if `1年` retained `2026-08-03 ~ 2027-08-03`.
- Time slots verified as 30 unique values from `07:00` through `21:30`.
- Images uploaded and representative selected.
- Any reservation-info limitation, especially if `DEPARTURE_DATE_TIME-required` could not be selected.
- `临时存储` succeeded and `批准请求` was not clicked.
