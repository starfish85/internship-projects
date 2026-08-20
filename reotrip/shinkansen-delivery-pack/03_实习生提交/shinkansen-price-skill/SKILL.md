---
name: shinkansen-price-skill
description: Extract Japan Shinkansen ticket requests from text or screenshots and query public Trip.com or Klook pages for purchasable trains with displayed USD/HKD seat prices. Use for Japan rail fare quote requests, Shinkansen price checks, route/date/passenger extraction, and unsold-date reference-price handling without booking, locking seats, or payment.
---

# 新干线车票价格查询

## Core Rules

Use this skill only for read-only Japan Shinkansen fare checks.

- Query only public Trip.com or Klook train search/result pages.
- Prefer USD prices. If USD is not available, use HKD.
- Before every Trip.com search, explicitly set or verify the top-right currency selector as USD. If USD is unavailable, try HKD; stop instead of writing results when neither USD nor HKD is visibly available.
- Never convert currencies, infer fares, estimate prices, or calculate per-person prices from totals unless the page explicitly shows that value.
- Show only trains and seat classes that the page presents as purchasable or available.
- If the public result list shows a price but does not expose a specific seat class, record the category as `Trip.com 公开列表显示价格（坐席类别未暴露）`; do not invent Non-reserved, Reserved, or Green Car prices.
- Do not log in, add to cart, click Book now into a booking/seat-lock/order flow, fill passenger details, submit an order, enter payment, bypass verification, or make high-frequency requests.
- If seeing a price requires entering booking, seat-lock, checkout, or passenger-information steps, stop and report that the public result page did not expose a compliant price.

## Request Extraction

For text input, read the message and extract:

- Travel date, normalized as `YYYY-MM-DD` when possible.
- Origin, such as `东京站`, `Tokyo Station`, `新大阪`, or `Shin-Osaka`.
- Destination, such as `大阪`, `京都`, `金泽`, `Osaka`, `Kyoto`, or `Kanazawa`.
- Preferred departure time or period, such as `10:00 左右`, `下午`, `早上`, or `无特别要求`.
- Passenger count by type when stated, such as `2 成人`, `2 成人 1 儿童`, or `4 成人`.

For screenshot input, inspect the image first, transcribe the relevant message, then extract the same fields. If date, origin, or destination is missing, ask for clarification before searching. If only time is missing, continue without a time filter.

The bundled HTML workbench can accept a text request or an uploaded screenshot. Start it with `scripts/request_workbench_server.cjs`, then open `http://127.0.0.1:8787/`. The workbench uses the same extraction/query script and writes JSON/HTML outputs under `examples/workbench-runs/`. Screenshot OCR is best-effort through local `tesseract.js`; if OCR does not produce readable request text, stop and ask for text instead of guessing.

## Station Normalization

Use the booking site's actual station names in the final result. Use these mappings only to search and disambiguate:

| User wording | Search candidates |
| --- | --- |
| 东京、东京站、Tokyo | Tokyo Station |
| 大阪、新大阪、Osaka | Shin-Osaka or Osaka, preferring Shin-Osaka for Shinkansen |
| 京都、京都站、Kyoto | Kyoto |
| 金泽、金泽站、Kanazawa | Kanazawa |

If the site asks for a city instead of a station, choose the site suggestion that matches the Shinkansen route, then keep the site's displayed station names in the output.

## Query Workflow

1. Record the extracted request before opening a site.
2. Open Trip.com first when possible. Use USD currency first, then HKD if USD is unavailable. The bundled `scripts/tripcom_select_request.cjs` is the current stable automation path for Trip.com. Use `scripts/open_klook_public_page.cjs` to open the supplied public Klook rail URL without interactions; Klook form selection and result extraction remain a later implementation step.
3. Enter or adjust origin, destination, travel date, passengers, and preferred time on the public search page.
4. Wait for the result list. Do not proceed into any flow that creates an order, locks inventory, or requests passenger details.
5. If the page shows train cards with prices, collect the displayed train type/name, departure time, arrival time, station names, seat categories when exposed, and exact price strings. If only one public list price is exposed, keep it as a real displayed price and explicitly mark that the seat class is not exposed.
6. If the page shows prices only after expanding a public train card or seat panel, expansion is allowed only when it does not start booking, lock seats, or ask for passenger data.
7. Exclude sold-out, unavailable, waitlist-only, or non-bookable results.
8. If the preferred time is present, choose available options at or after that time or closest to that period. If no preferred time is present, choose a concise set of representative available options from the search result.
9. When using the automation script, write both JSON and HTML outputs when practical; the HTML should show `需求识别`, `查询结果`, `坐席价格`, and `说明`.

For an operator-facing page, use `assets/request-workbench.html` through the local server rather than opening the HTML file directly. A file URL cannot run the backend query or OCR flow.

## Unsold-Date Handling

If the target date is unavailable or not yet released, do not estimate the fare.

1. State that the target date is not on sale or could not be priced from the public page.
2. Search within the future 2-month released inventory window for the same route.
3. Prefer a relevant high-demand reference date when the request mentions a season or known demand driver, such as cherry blossom season, a holiday, a weekend, or a special event.
4. Otherwise choose a released date with the same weekday as the target date.
5. Use only prices displayed on Trip.com or Klook for that reference date.
6. Clearly label the result as a reference quote for the reference date, not as the target date's actual fare.

## Output Format

Return results in Chinese using this structure:

```text
需求识别：
日期：YYYY-MM-DD
出发地：...
目的地：...
期望时间：...
乘客人数：...

查询结果：
1. 车次或列车类型：以网站展示为准
   出发：HH:MM，出发站
   到达：HH:MM，到达站
   坐席价格：
   - 坐席类别 A：USD xx.xx 或 HKD xx.xx
   - 坐席类别 B：USD xx.xx 或 HKD xx.xx
   - 坐席类别 C：USD xx.xx 或 HKD xx.xx

说明：
目标日期是否已开售；如未开售，说明使用的参考日期和参考原因。
```

Do not highlight the source site, query date, or query time as primary fields in the customer-facing result. Keep them in a short internal note or process record when useful for verification.

## Failure Responses

Use a clear explanation instead of guessing:

- If no USD or HKD price is displayed: `本次未能取得符合 USD/HKD 币种要求的真实展示价格，未进行换算或估价。`
- If the route cannot be recognized: ask for the exact station or city name.
- If public search results do not expose prices without entering booking: state the stopping point and do not continue.
- If all matching trains are unavailable: state that no purchasable matching train was found and do not show unavailable train prices.

## Final Checklist

Before returning an answer, verify:

- Text or screenshot fields were extracted.
- Date, route, time preference, and passenger count are stated.
- Prices are copied from the public page exactly as displayed.
- Public-list prices without seat-class detail are labeled as seat class not exposed, not expanded into inferred seat categories.
- USD was attempted before HKD.
- Trip.com top-right currency selector was set to or visibly confirmed as USD before search.
- No conversion, estimation, checkout, booking, seat lock, passenger form, payment, or access-control bypass occurred.
- Unsold dates are labeled as reference-date quotes.
