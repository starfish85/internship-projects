# 接送类-景区接送产品自动上架 Workflow（便携执行版）

## 适用范围

适用于城市酒店/市区地址与景区、乐园、地标、郊区景点之间的私人接送产品。

如产品任一端为机场、火车站、邮轮港、码头等交通枢纽，切换到同目录 `TRANSFER_TRANSPORT_HUB_AUTO_UPLOAD_WORKFLOW.md`（中文副本：`Viator交通枢纽接送产品自动上架Workflow.md`），不要临场混用景区接送规则。

目标：在 Viator 完成草稿上架并停在 `Submit for review` 页面，不提交审核、不付款、不发布。

## 执行前预检

- 本测试包锁定账号：`Caiyi Travel (5514894)`。开始前必须回读 Supplier 页眉，名称不一致则停止。不要改用 `op1@yesingholidays.com`，除非用户另行指定。
- 开始或恢复任务时，先打开目标 product code 当前页面，读取 URL 和页面文本，确认只操作目标 code。
- 如用户给出多个产品，先建立任务清单；每完成一个 code 只标记该项完成，继续下一个，直到全部草稿停在 `Submit for review`。
- 浏览器操作优先使用 **Grok / Cursor Chrome 插件的受控 tab**。禁止 Playwright CDP、禁止远程调试端口 9222、禁止对 `supplier.viator.com` 使用 AppleScript `execute javascript`：2026-08-21 实测会触发 `?logout=true` 强制登出。
- 页面内部坐标只用于 Viator 自定义控件、日历、地图、文件上传等 DOM 不稳定场景。
- Viator **普通超时登出**时按自动登录流程恢复；URL 含 `logout=true`、MFA、验证码、安全挑战、账号异常或 3 次自动登录失败，记录断点并等待人工，不得继续填表。
- 售价计算前必须取得当前页面 **Viator 佣金率**。门票 workflow 示例为 22%。报价表不含佣金率，禁止臆造后直接上架。

## 标准内容

### 1. 标题

统一格式：

```text
Private Transfer Between A and B
```

示例：

```text
Private Transfer Between Shanghai Disney and Hotels
```

规则：

- A/B 使用真实两端，例如景点名与 `Hotels` / `City Hotels`。
- 标题超长时优先保留 `Private Transfer Between ... and ...` 结构，压缩景点或酒店端名称。

### 2. Categorization 与主题

- Categorization：选择 `Transport`。
- Service type：只选择 `Car`。
- 主题选择 3 个：
  - `Travel`
  - `City`
  - 按景区属性选择 `Family-friendly`、`Theme Parks`、`Nature`、`Historical`、`Shopping` 等最接近项。

### 3. 图片

标准结构：

- 第 1 张：景区或目的地标志性图片作为封面。优先用本测试包 `测试输出/素材/目的地图` 或 `Viator产品图片.zip` 对应城市文件夹；可联网搜索真实标志性图，但不得使用带明显水印、截图 UI、或迪士尼角色 IP 未授权图作为正式封面（人工复核）。
- 中间：上传本测试包 `接送类车型图`（相对路径：`../接送类车型图`）。**禁止写死** `/Users/mac/Desktop/接送类车型图` 或其他本机绝对路径。
- 最后：可补 1-2 张景区、城市地标或目的地代表性图片。

执行规则：

- 上传前确认文件夹名称是 `接送类车型图`，不要误用 `Viator产品图片` 或旧产品目录。
- 车型图选用：弃用带 `tcar.tw` 等水印的图、竖图、以及明显非本线路国家场景的图（如马来西亚酒店门头、美国机场标牌）。日本线路优先 Alphard / Hiace 实拍。
- 上传后确认无重复图、无错误车型图。
- 如弹出 `Allow upload to https://supplier.viator.com/...`，只对 Viator 域名选择 `始终允许`。
- 稳定上传路径：先监听 `filechooser`，再点击页面内 `browse`，用 `chooser.setFiles(files, {timeoutMs: ...})` 设置本地绝对路径。
- 若一次上传多张导致卡住，分批上传：1 张验证权限，3 张满足最低门槛，再补齐目标数量。
- 图片上传完成后等 `Update` 保存完成，确认 `Continue` 可点击后再进入下一步；不要直接跳到报价。

### 4. Meeting & Pickup

景区接送默认从城市酒店/市区地址与景点之间接送。

填写规则：

- `Define the general area you pick up from`：直接搜索城市，例如 `Shanghai`。
- `Pick up from`：城市酒店/市区地址或景区端点。
- Pickup radius：`8 KM`。若报价表「包含公里数」另有值（例如浦东 55 km），在 description 写清范围，radius 仍先填 `8 KM` 并列入人工复核。
- Pickup waiting time：报价表有供应商等待时长时，**以报价表为准**（景区/酒店点对点常见 30 分钟）。仅当报价表为空时用 `20 minutes`。
- Drop-off：选择提供不同于上车点的下车服务。
- Drop-off waiting time：与 Pickup waiting time 相同规则。

城市酒店/市区地址 description：

```text
Please provide the full hotel name in English and the complete hotel address when making your booking.
```

Pickup appearance：

```text
Your driver will contact you via WhatsApp before pickup and meet you at the agreed location. Vehicle details may be shared before your service to help you identify your ride.
```

地图规则：

- 城市级结果不稳定时，用截图或前端文本验证。
- 如必须用城市中心代表点作为锚点，在 description 写清真实服务范围，并列入人工复核风险点。

### 5. Transportation Details / Itinerary

旅途时间设置为灵活 `1-2 hours`，按实际距离可微调。

`Describe each step of the transport service from booking to drop-off`：

```text
Easy Reservation
Choose your transfer option, schedule, and locations. Provide your contact details (email & WhatsApp) for smooth communication.

Pre-Trip Arrangement
We confirm your journey details in advance and keep you updated before departure.

Meet & Go
Your driver arrives at the agreed location on time and assists you with a smooth start.

Comfortable Arrival
Travel directly in a private vehicle and reach your hotel, attraction, or destination with ease.
```

注意：每段之间保留空行。

### 6. Languages Offered

接送类产品不要选成 `No`。

路径：

- `Do you provide a guide other than the driver?` 选择 `Yes`。
- `Are your in-person guides official or independent?` 选择：

```text
I do not have in-person guides.
```

- 语言只勾选 1 个英文书写选项：`English` written/writer。
- 不选择 in-person guide、audio guide、official guide、independent guide 或其他语言。

### 7. Inclusions / Exclusions

Inclusions：

```text
Private door-to-door transfer between your selected locations
Driver will contact you in advance to confirm all pickup details
Comfortable air-conditioned vehicle ensuring a smooth and relaxing ride
Fuel, toll, and parking fees are all included
```

Exclusions：

```text
Tickets, meals, live guide, cruises, paid extras
```

### 8. Traveler Info

Reseller：

```text
Independent reseller
```

仅保留以下适用项：

- Travelers can easily arrive/depart on public transportation：`Yes`
- Infants are required to sit on laps：`Yes`

默认不启用 wheelchair、stroller、service animals、infant seats，除非产品资料明确支持。

如 Viator 强制要求电话号码：

- Country code：`+86`
- Phone number：`13112241802`

普通景区接送不额外勾选航班、船舶、火车信息；若出现交通枢纽端点，改用交通枢纽 workflow。

### 9. What Makes Your Product Unique

替换 `[pick-up location]` 和 `[destination]`：

```text
Direct & Private - Enjoy a private transfer between [pick-up location] and [destination] with no shared rides, extra stops, or transfers.

Flexible Pickup - Choose a departure time that fits your plan, with pick-up and drop-off arranged based on your booking details.

Comfortable Ride - Travel in a clean, air-conditioned vehicle with space for passengers and luggage.

Reliable Support - We confirm your trip details in advance and provide WhatsApp support for timing, meeting point, or route questions.

Local Highlight - Arrive relaxed and ready to enjoy [destination], from its attractions and dining areas to nearby shopping, waterfront, theme park, historic, or hotel districts.
```

日本地区景区接送额外加入：

```text
Premium Vehicles
- 7-Seater (Toyota Alphard): Up to 4 Pax + 5 x 24" Luggage
- 10-Seater (Toyota Hiace): Up to 7 Pax + 7 x 24" Luggage
```

`Can travelers customize this service?` 统一选择 `No`。

### 10. Pricing

#### 国内景区接送

默认 4 个 option：

- `3Pax Hotel to [Attraction]`
- `5Pax Hotel to [Attraction]`
- `3Pax [Attraction] to Hotel`
- `5Pax [Attraction] to Hotel`

车型人数：

- 5 座车：最多 `3 pax`
- 7 座车：最多 `5 pax`

每个 option：

- Pricing type：`Per vehicle/group`
- 不使用 per person。
- Max travelers 分别设为 `3` 或 `5`。
- 用 customization 区分 option：
  - `Route of tour`：完整路线，例如 `Shanghai Hotels to Shanghai Disney`
  - `Vehicle type`：例如 `3Pax Private Vehicle` / `5Pax Private Vehicle`
  - 如需表达行李或车型容量，增加 `Other`

国内 2026-2027 标准 schedule：

| 日期段 | 价格逻辑 |
|---|---|
| 产品可售起始日 - `2026-09-30` | `成本 / 0.8 / (1 - Viator佣金率)` |
| `2026-10-01` - `2026-10-07` | `成本 / 0.8 / (1 - Viator佣金率) / 0.7` |
| `2026-10-08` - `2027-02-03` | `成本 / 0.8 / (1 - Viator佣金率)` |
| `2027-02-04` - `2027-02-15` | `成本 / 0.8 / (1 - Viator佣金率) / 0.5` |

如果用户截图给出不同春节结束日或指定价格，以截图为准。

金额按账户币种向上取整，避免低于目标毛利。国内报价表为 HKD；日本报价表多为 USD。上架前核对 Supplier 账户结算币种，必要时换算，禁止把 USD 成本直接填进 HKD 账户。

售价公式中的佣金率必须来自当前 Pricing 页回读，例如 22% 则分母为 `0.78`。换设备复用时不得沿用上次佣金率。

#### 日本景区接送

日本产品目前不设置国庆/春节加价。

标准车型：

- 7 座车：`Toyota Alphard`，最多 `4 pax`
- 10 座车：`Toyota Hiace`，最多 `7 pax`

option 命名：

- `4Pax A to B`
- `7Pax A to B`
- 如需双向，再新增 `4Pax B to A`、`7Pax B to A`

日本 option 必须有 3 个 customization：

- `Route of tour`：完整路线
- `Vehicle type`：`Toyota Alphard` 或 `Toyota Hiace`
- `Other`：
  - `7-Seater: 4Pax+5Luggage(24'')`
  - `10-Seater: 7Pax+7Luggage(24'')`

日本价格逻辑：

```text
成本 / 0.8 / (1 - Viator佣金率)
```

#### Start Times

- 选择 `Start times`，不要选择 `Coordinated start times`。
- 不使用 `Add at regular intervals`。
- 首个 schedule 逐个选择：

```text
7:30am, 8:00am, 8:30am, 9:00am, 9:30am, 10:00am, 10:30am,
11:00am, 11:30am, 12:00pm, 12:30pm, 1:00pm, 1:30pm,
2:00pm, 2:30pm, 3:00pm, 3:30pm, 4:00pm, 4:30pm, 5:00pm,
5:30pm, 6:00pm, 6:30pm, 7:00pm, 7:30pm, 8:00pm, 8:30pm
```

- 后续 schedule / option 可用已有时间点的 `Select all`。
- 保存前回读：日期段、全周、全部 start times、Max travelers、Suggested retail price、Amount you will get paid、Commission。

### 11. Booking & Tickets

- Booking cutoff：`48 hours before start time`
- Confirmation：Instant confirmation，除非供应链要求人工确认。
- Cancellation：
  - 纯接送/包车：Standard 24-hour full refund。
  - 任何含门票、入园票、组合票、日游门票内容：All sales final / non-refundable，并切换到对应含门票 workflow。
- Ticket type：Mobile or paper ticket accepted。
- Tickets per booking：One per booking。
- Separate entry ticket：No。

Ticket redemption instructions：

```text
Stay Connected
· Add your email and WhatsApp details when booking for smooth communication.
· Receive pick-up confirmation and trip updates before your transfer.
· Your driver will contact you via WhatsApp one day before departure.
```

### 12. Finish 与 Tripadvisor Listing

- Intro offer：选择 `No thanks, skip`。
- Tripadvisor listing：优先选择产品主要服务城市或景区所在城市。
- listing 非完全匹配时继续保存草稿，并列入人工复核风险点。
- 最终停在 `Submit for review` 页面，不点击提交。

## 标准执行路径

1. 读取 Excel / 截图，提取城市、景点、车型、成本、佣金率、节假日价格、供应商、目标 code。
2. 打开或新建 Viator product，确认目标 code。
3. 填标题、Categorization、Service type、主题。
4. 上传图片并确认 `Gallery x/50` 正常。
5. 按顺序完成 Product content：Meeting & Pickup、Transportation Details、Languages、Inclusions/Exclusions、Unique、Traveler Info。
6. Pricing：按车型 + 方向建 option，并为每个 option 建对应 schedule。
7. Booking & Tickets：设置 cutoff、取消政策、ticket redemption。
8. Finish：跳过 intro offer，选择 Tripadvisor listing。
9. 停在 `Submit for review` 页面保存草稿，不提交。
10. 输出 code、标题和人工复核风险点。

## 异常恢复

- 断线、刷新、登出后，先回到目标 code 页面读取当前状态，不凭记忆继续。
- 图片重复或上传错误：删除错误图片，保存，再从正确路径重新上传。
- Pricing 弹层报错：取消弹层，回到 summary 确认已保存内容，再重建该 schedule；同一脏弹层内不连续硬试。
- 页面字段与底层值疑似不一致：以保存后的 summary 文本为最终确认。
- Duplicate option warning：若方向和车型确实不同，保留 option，并列入人工复核风险点；不要为了消除 warning 删除双向 option。

## 自动登录

普通 session 过期时：

1. 记录目标 code、当前 URL、当前步骤。
2. 认领包含目标 code 的 Chrome tab；不要在 `about:blank` 或错误 code 上继续。
3. 在 `supplier.viator.com` 登录页输入 `op1@yesingholidays.com`。
4. 密码只允许由 Chrome 已保存凭据自动填入；不读取、不输出、不记录密码。
5. 登录后重新打开中断 URL。
6. 回到 builder 后先回读页面和目标 code，再继续。

停止条件：

- MFA
- 验证码
- 安全挑战
- 账号异常
- Chrome 无保存凭据
- 自动登录连续 3 次失败
- 跳转到非 `supplier.viator.com` 域名

## 完成后输出

每个产品只输出：

- Product code
- 标题
- 人工复核风险点

风险点优先覆盖：

- 价格与日期
- 车型/人数/行李
- 图片准确性
- 接送范围或地图锚点
- 景区特殊运营限制
- Viator duplicate warning / Trace error
- listing 非完全匹配
- 付款、保险、提交审核等人工边界
