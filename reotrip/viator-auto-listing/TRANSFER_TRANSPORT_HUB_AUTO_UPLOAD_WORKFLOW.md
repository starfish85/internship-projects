# 接送类-交通枢纽产品自动上架 Workflow（便携执行版）

中文文件名副本：`Viator交通枢纽接送产品自动上架Workflow.md`（内容与本文件保持同步）。

## 适用范围

适用于任一端为 **机场、火车站、邮轮港、码头** 的私人接送。两端都是酒店/景区时，改用 `Viator接送产品自动上架Workflow.md`，不要临场混用。

目标：在 Viator 完成草稿并停在 `Submit for review`，不提交审核、不付款、不发布。

本文件在 2026-08-21 复用检测中补齐：原景区 workflow 指向本文件，但仓库里此前不存在，导致机场/港口线路无法按文档切换。

## 与景区接送的强制差异

| 项 | 景区接送 | 交通枢纽接送 |
|---|---|---|
| Traveler Info 航班/车次/船舶 | 不勾选 | 机场勾选航班信息；火车站勾选火车信息；港口勾选船舶/邮轮信息 |
| 接机/接船等待 | 默认 20 或报价表酒店等待 | **以报价表为准**：国内接机常见 60 分钟；日本信达接机 90 分钟、港口 60 分钟、点对点 30 分钟 |
| Meet & Greet | 通常不含 | 报价表有举牌费用时，在 Unique / Inclusions 写清是否含举牌；日本信达举牌另计（常见 +14 USD） |
| 夜间费 | 报价表有则写入 Unique 风险点，默认不做成独立 option | 同左；国内常见 22:00-08:00 +50 HKD |
| 主题第三项 | Theme Parks / Historical 等 | 机场：`Air Tours` 若无则 `Travel`+`City`+最接近运输项；港口：`Cruise` 或 `Port Transfer`（以后台实有选项为准） |
| 时长 | 1-2 hours 灵活 | 按实际：市区机场 1 hour；港口 1 hour；跨城另计 |

其余标题结构、Categorization=`Transport`、Service type=`Car`、Languages、Booking cutoff、取消政策、Intro offer、停在 Submit for review，与景区 workflow 相同。

## 执行前预检

1. 回读 Supplier 页眉供应商名称。默认候选 `op1@yesingholidays.com`，但必须与当前登录一致。2026-08-21 本机为 `Caiyi Travel (5514894)`。
2. 只使用 Grok/Cursor Chrome 插件受控 tab。禁止 Playwright CDP、禁止端口 9222、禁止对 `supplier.viator.com` 使用 AppleScript `execute javascript`（会触发 `?logout=true`）。
3. 佣金率以当前 Pricing 页为准，写入任务清单后再算售价。
4. 图片目录使用测试包相对路径：`../接送类车型图` 与 `../测试输出/素材/目的地图`，禁止 `/Users/mac/Desktop/...`。
5. URL 含 `logout=true`、MFA、验证码、安全挑战时停止，等人工。

## 标准内容

### 1. 标题

优先与本供应商已上线枢纽产品对齐：

```text
[Hub] Private Transfer to/from [City/Hotels]
```

示例：

- `Pudong Airport (PVG) Private Transfer to/from Shanghai Hotels`
- `Wusongkou Cruise Port Private Transfer to/from Shanghai Hotels`
- `Kansai Airport (KIX) Private Transfer to/from Osaka Hotels`

若后台标题字数不够，保留两端地名与 `Private Transfer`。景区 workflow 的 `Private Transfer Between A and B` 也可用于对等两端；枢纽产品不要把机场写成普通 Hotels-to-Hotels。

### 2. Categorization 与主题

- Categorization：`Transport`
- Service type：`Car`
- 主题 3 个：`Travel`、`City`、第三项按枢纽选 `Cruise` / 最接近的 Airport 或 Family-friendly

### 3. 图片

1. 封面：枢纽或目的地城市地标（浦东用上海天际线或机场航站楼；吴淞口用港口或上海天际线；关西用大阪城或机场）。没有枢纽实拍时用城市地标，并列入风险点。
2. 中间：`../接送类车型图` 中无水印、横向、地理场景匹配的车型图。
3. 最后：1-2 张城市地标。

不要用迪士尼角色 IP 图、网页截图、水印图。日本用 Alphard/Hiace；不要把美国机场/马来西亚酒店门头图用在中国产品。

上传：先监听 filechooser，再点 browse，分批 1→3→补齐。保存后确认 Gallery 与 Continue。

### 4. Meeting & Pickup

- How do you meet travelers：`We pick up all travelers`
- General area：搜索城市（Shanghai / Osaka）
- Pickup from：枢纽官方名称 + 酒店/市区
- Pickup radius：`8 KM`；报价表有公里包（如浦东 55 km 不含临港）必须写进 description
- Waiting time：报价表优先（见上表）
- Drop-off：提供不同于上车点的下车
- 机场/港口必须收集航班号或船名、码头、落地/靠泊时间

酒店端 description：

```text
Please provide the full hotel name in English and the complete hotel address when making your booking.
```

机场端 description 示例：

```text
Your driver will meet you at the arrivals hall. Please provide your flight number, arrival time, and terminal when booking. Free waiting time starts after the flight lands (see product details). Night surcharge and meet-and-greet may apply as listed in your option.
```

港口端 description 示例：

```text
Your driver will meet you at the cruise terminal arrival hall. Please provide ship name, docking terminal, and disembarkation time when booking. Hotels outside the stated city range (for example Disney resort hotels or airport hotels) may require a different option.
```

Pickup appearance：

```text
Your driver will contact you via WhatsApp before pickup and meet you at the agreed location. Vehicle details may be shared before your service to help you identify your ride. For airport or cruise arrivals, the driver may wait at the arrivals hall with your name if meet-and-greet is included.
```

### 5. Transportation Details / Itinerary

时长：市区机场/港口 `1 hour` 或灵活 `50 minutes to 1 hour 30 minutes`。

文案（段间空行）：

```text
Easy Reservation
Choose your transfer option, schedule, and locations. Provide your contact details (email & WhatsApp), plus flight or cruise details for airport and port pickups.

Pre-Trip Arrangement
We confirm your journey details in advance, monitor your flight or ship arrival when applicable, and keep you updated before departure.

Meet & Go
Your driver arrives at the agreed location or arrivals hall and assists you with luggage for a smooth start.

Comfortable Arrival
Travel directly in a private vehicle and reach your hotel, station, airport, or cruise terminal with ease.
```

### 6. Languages Offered

与景区 workflow 相同：Guide other than driver = Yes → `I do not have in-person guides.` → 只勾选 English written。

### 7. Inclusions / Exclusions

Inclusions：

```text
Private door-to-door transfer between your selected locations
Driver will contact you in advance to confirm all pickup details
Comfortable air-conditioned vehicle ensuring a smooth and relaxing ride
Fuel, toll, and parking fees are all included
```

若报价表举牌为「已含」，追加：

```text
Meet-and-greet at the airport or cruise arrivals hall
```

Exclusions：

```text
Tickets, meals, live guide, cruises, paid extras
Night surcharge, extra waiting beyond the included time, child seat, and meet-and-greet if not selected
```

按报价表删改：国内儿童座椅常见 70 HKD；日本信达儿童座椅/举牌常见 14 USD。

### 8. Traveler Info

- Reseller：`Independent reseller`
- Travelers can easily arrive/depart on public transportation：`Yes`
- Infants are required to sit on laps：`Yes`
- 机场：启用航班信息
- 火车站：启用火车信息
- 港口：启用船舶信息
- 电话必要时：`+86` / `13112241802`

### 9. What Makes Your Product Unique

替换地点：

```text
Direct & Private - Enjoy a private transfer between [pick-up location] and [destination] with no shared rides, extra stops, or transfers.

Flexible Pickup - Choose a departure time that fits your plan, with pick-up and drop-off arranged based on your booking details.

Comfortable Ride - Travel in a clean, air-conditioned vehicle with space for passengers and luggage.

Reliable Support - We confirm your trip details in advance and provide WhatsApp support for timing, meeting point, or route questions.

Flight or Ship Monitoring - For airport and cruise pickups, we use the arrival information you provide so the driver can adjust to delays within the included waiting time.

Local Highlight - Arrive relaxed and ready to enjoy [destination], from its attractions and dining areas to nearby shopping, waterfront, theme park, historic, or hotel districts.
```

日本额外加入 Alphard / Hiace 容量说明。`Can travelers customize this service?` = `No`。

### 10. Pricing

#### 国内枢纽

默认 4 个 option（双向 × 两车型）：

- `3Pax [Hub] to Hotel`
- `5Pax [Hub] to Hotel`
- `3Pax Hotel to [Hub]`
- `5Pax Hotel to [Hub]`

5 座最多 3 pax；7 座最多 5 pax。Pricing type：`Per vehicle/group`。

Customization：`Route of tour`、`Vehicle type`，行李写入 `Other`。

日期段与景区相同（2026 国庆、2027 春节加价）。售价：

```text
ceil(成本 / 0.8 / (1 - 当前Viator佣金率) / 节假日系数)
```

节假日系数：平时 1；国庆 `/0.7`；春节 `/0.5`。按账户币种向上取整。

#### 日本枢纽

不设国庆/春节加价。报价表 7 座常写 5 人、10 座常写 9 人；景区/日本标准文案写 Alphard 4 pax、Hiace 7 pax。**2026-08-21 用户确认：对外 Max travelers 跟文案 4 / 7，不按报价表 5 / 9 卖。** 账户币种为 HKD 时，USD 成本先乘 7.80 再套售价公式。

option：`4Pax`/`7Pax` 或按报价表 `5Pax`/`9Pax`（需用户确认）× 双向。

必须 3 个 customization：Route / Vehicle type / Other 行李。

#### Start times

与景区 workflow 相同：7:30am 至 8:30pm 每 30 分钟。机场产品不要误设成 Coordinated start times。

### 11. Booking & Tickets

- Cutoff：`48 hours before start time`（若要贴近竞品 24h，需用户确认后改）
- Instant confirmation
- Standard 24-hour full refund
- Mobile or paper ticket；One per booking；Separate entry ticket = No

Ticket redemption 与景区相同，并追加航班/船名填写提示。

### 12. Finish

Intro offer：`No thanks, skip`。Tripadvisor listing 选枢纽所在城市。停在 Submit for review，不点 Submit。

## 标准执行路径

1. 读 Excel：国家、城市、场景、两端、车型、人数、行李、币种、成本、举牌、等待、夜间、供应商、备注。
2. 判定枢纽类型（机场/火车站/港口）并确认佣金率、账户币种、供应商页眉。
3. 新建或打开 product，确认 code。
4. 标题、分类、主题、图片。
5. Meeting & Pickup（含航班/车次/船舶）、Itinerary、Languages、Inclusions、Unique、Traveler Info。
6. 按车型+方向建 option 与 schedule。
7. Booking & Tickets → Finish → Save as draft。
8. 输出 code、标题、风险点。

## 禁止事项

- 不提交审核、不付款、不接受法律/保险声明
- 不在 `about:blank` 或错误 code 上继续
- 不把景区 20 分钟等待硬套到接机
- 不对 supplier.viator.com 注入页面 JS / CDP

## 完成后输出

Product code、标题、人工复核风险点（价格与日期、人数行李、图片地理/版权、接送范围、等待时长、举牌/夜间费、listing、账号是否正确）。
