# 枢纽时刻查询源

查官方/准官方时刻。先用本表里的链接，查不到再换备用源。不要用路人攻略当依据。

## 接送机（航班号）

1. 内部接口（常为空，有数据就用）：`GET https://a.reotrip.com/api/flight/{航班号}/`
2. FlightAware：`https://zh.flightaware.com/live/flight/{去空格航班号}`  
   例：NH812 → `https://zh.flightaware.com/live/flight/NH812`
3. FlightRadar24：`https://www.flightradar24.com/data/flights/{小写航班号}`
4. 飞常准：`https://www.variflight.com/` 搜航班号 + 出行日

必须拿到：出发机场、到达机场、计划起飞、计划到达。能拿到实际/预计到达更好。日期按出行日选班次，红眼航班核对前一日起飞、到达日是否等于 `travel_date`。

## 接送港（船名）

| 港口 | 权威源 | 解析要点 |
|---|---|---|
| 东京港 / 晴海 | [入港予定 PowerBI](https://app.powerbi.com/view?r=eyJrIjoiZDcxNWQ1YTYtYzYyOS00ZTM3LWJhOTctMmNlZDFmY2Y2OGE2IiwidCI6ImQwMzAyZmNjLTNlODEtNDljMy04MjM1LWQzMTFhMzY4NGNmYyJ9) ；目录页 https://www.kouwan.metro.tokyo.lg.jp/kanko/cruise/nyukou/ | 船名、着岸/离岸时刻、码头（晴海 / 东京国际邮轮码头） |
| 横滨港 | https://www.city.yokohama.lg.jp/kanko-bunka/minato/kyakusen/nyuko/2026.html | 表头：月、入港（着岸）、出港（離岸）、着岸場所、船名、前港、次港。着岸場所常见 `大さん橋` / `新港` |
| 神户港 | https://www.kobe-meriken.or.jp/terminal/eta/ （市官网只是入口，旧 `index2020.html` 已 404） | 表头：船名、バース、入港日時、出港日時、前港、次港。バース：`NAKA-*`=中突堤，`S-4Q`/`4O`=神户港客运码头 |

船名做规范化后再比：全角数字、`Ⅲ/III/3`、日中英别名（`飛鳥`/`飞鸟`/`Asuka`，`にっぽん丸`/`日本丸`/`Nippon Maru`）。同一天同名船只靠一港，对上码头即可。

## 接送站（列车号）

1. 站名 + 车次 + 日期：Google / 駅探 `https://ekitan.com/` / 乗換案内 `https://www.jorudan.co.jp/`
2. 新干线车次形态：`のぞみ/ひかり/こだま/みずほ/さくら/つばめ` + 数字，或 `NOZOMI 12`
3. 必须拿到：出发站、到达站、发车、到达。区分上行列车和下行列车，避免订反。

## 订单系统

后台：https://a.reotrip.com/v/orders  
接送相关产品类型：`TRANSFER`、`TICKET_WITH_TRANSFER`。

未登录接口会 403。有 Cookie / Token 时：

```
GET https://a.reotrip.com/channel/orders/?travel_date_from=YYYY-MM-DD&product_type=TRANSFER&page_size=50
GET https://a.reotrip.com/channel/orders/?travel_date_from=YYYY-MM-DD&product_type=TICKET_WITH_TRANSFER&page_size=50
GET https://a.reotrip.com/channel/orders/{id}/
```

从订单里抽这些字段（有就用，没有就在备注/附加信息里找）：

- `id`, 渠道单号, `product_name`, `package_name`, `product_type`
- `travel_date`, `time_slot`, `is_roundtrip`, `return_trip_time`
- `start_poi_name`, `start_poi_addr`, `end_poi_name`, `end_poi_addr`
- `customer_note`, `itinerary`, 订单备注
- `booking_extra_info`, `unit_extra_info`, `contact_info`

枢纽号常藏在 `booking_extra_info` / `customer_note` / 行程 / 产品名，没有独立 `flight_number` 字段。
