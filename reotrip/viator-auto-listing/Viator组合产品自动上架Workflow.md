# Viator 组合产品自动上架 Workflow（便携执行版）

> 用途：在其他设备或新任务中直接读取本文件后，自动创建/修改 Viator 组合产品草稿。
>
> 最终边界：完成所有字段，修复提交页错误，保存草稿并停在 `Submit for review` 页面；不得提交审核、付款、发布或接受法律/保险声明。

## 1. 适用范围与优先级

适用于：

- 门票 + 接送
- 门票 + 餐食
- 门票 + 观光车/游船/演出/体验
- 门票 + 速通或 Early Entry
- 两种门票或其他可独立组合的项目

信息冲突时按以下优先级执行：

1. 用户本次明确指令
2. 用户提供的报价截图、产品清单和指定场次
3. 供应商目标日期、人数、套餐的实际结算页
4. 供应商详情页
5. 本 Workflow 默认值

不得用供应商列表页的 `from` 价格、缓存价格或其他日期价格替代目标套餐的实际价格。

## 2. 执行前预检

1. 默认 Viator Supplier 账号为 `op1@yesingholidays.com`；不得在文件、日志或回复中保存/输出密码。
2. 整理本批任务清单：产品序号、名称、供应端链接、截图价格、目标城市、组合结构、目标/新建 code、状态、风险点。
3. 明确每个产品：
   - 组合的两个或多个组成部分；
   - 成人/儿童年龄及是否只卖成人；
   - 可售日期、不可售日和具体时间场次；
   - 各 Option 成本/指定售价；
   - 最大人数、车辆容量或套餐限购数；
   - 是否含接送、餐食、M&G、行李或其他附加项。
4. 开始或恢复时先读取当前 URL、product code 和已保存页面内容，确认目标正确后再继续。
5. 多产品任务必须逐项完成；单个 code 完成后继续下一个，不能把单项完成当成整批完成。

## 3. 浏览器与交互规则

- 使用浏览器/Chrome 插件自身的可见页面操作。
- 优先使用语义定位、可见文本、按钮、输入框和文件选择器。
- DOM 不稳定时可用插件提供的**页面内部坐标**；禁止使用系统桌面坐标，避免其他窗口影响。
- 点击后回读字段、页面文本或截图，不能只依据“点击动作已发出”判断成功。
- 受控路径正常但应用无响应时，可重连浏览器、重新认领目标 tab 或重启相关应用后继续。
- 普通超时登出按第 14 节自动恢复；MFA、验证码和安全挑战不得绕过。

## 4. 产品结构与命名

标题清楚表达核心门票和附加项目，例如：

```text
Tokyo Bay Night Dinner Cruise with TeamLab Planets Ticket
Shanghai Disney 1-Day Ticket with Optional Private Transfer
Hong Kong Disneyland Ticket with Premier Access Options
```

Option 按用户实际售卖组合拆分，例如：

- `Ticket Only`
- `Ticket + One-Way Private Transfer`
- `Ticket + Round-Trip Private Transfer`
- `1-Day Bus Ticket + Attraction Ticket`
- `Ticket + Lunch and Snack Voucher`
- `Ticket + Dinner Cruise`
- `Ticket + 3/6/8 Premier Access Passes`

规则：

- 每个 Option 必须能让旅客清楚区分包含内容、方向、车型、天数、餐食或速通数量。
- 不建立用户未要求的套餐。
- 供应商打包产品与用户指定拆分不一致时，按用户指定结构重新组合成本和售价。
- 克隆产品必须清除旧城市、旧 POI、旧图片、旧 Option、旧时间、旧价格及旧接送信息。

## 5. 产品内容

### 5.1 Overview 与 Inclusions

Overview 简要说明：核心体验、组合价值、凭证/入场方式和适用旅客。

Inclusions 必须按 Option 实际内容填写：

- 对应门票或活动票；
- 餐食、观光车、游船、演出、速通或 Early Entry；
- 若含接送，写明单程/往返、路线及车辆服务。

含接送但不含 M&G：

```text
Private door-to-door transfer between your selected locations
Driver will contact you in advance to confirm all pickup details
Comfortable air-conditioned vehicle ensuring a smooth and relaxing ride
Fuel, toll, and parking fees are all included
```

只有报价截图/报价表明确写明 `M&G`、`Meet & Greet`、举牌服务或举牌价格时，才加入：

```text
Meet & Greet service with a personalized name sign at the pickup point
```

Exclusions 仅列出真正未包含的内容。不得把 Option 已包含的接送、餐食或门票再次写入 Exclusions。

### 5.2 What Makes Your Product Unique

至少包含：

- 一句与真实城市/景点相关的 `Local Highlight`；
- 门票与附加项目组合后的便利性；
- 含接送时说明 private transfer 的价值；
- 日本接送时加入第 9 节车型信息；
- 明确含 M&G 时加入举牌识别卖点。

不得保留模板占位符、错误城市或与产品无关的通用卖点。

## 6. Meeting & Pickup（仅含接送时）

不含接送的门票 + 餐食/观光车/游船/演出/速通产品，按门票逻辑设置集合点或直接入场，不创建酒店接送。

含接送时：

`Do you offer drop-off?`

```text
Yes, different locations than pickup.
```

`Describe the pickup's appearance (optional)`：

```text
Your driver will contact you via WhatsApp before pickup and meet you at the agreed location. Vehicle details may be shared before your service to help you identify your ride.
```

按端点组合填写预订信息：

```text
酒店/市区：Please provide the full hotel name in English and the complete hotel address when making your booking.
机场：Please provide the flight number when making your booking.
港口/码头：Please provide the full ship name when making your booking.
火车站：Please provide your train number and scheduled arrival/departure time when making your booking.
```

如路线包含两个不同端点，必须组合填写两端要求，不能只写一端。

Transportation Details 默认文案：

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

明确含 M&G 时，在 `Pre-Trip Arrangement` 后增加：

```text
Meet & Greet
Your driver will welcome you with a name sign at the agreed meeting point, making pickup quick and hassle-free.
```

## 7. Languages、Accessibility 与 Traveler Details

### 7.1 Languages

含接送：

- `Do you provide a guide other than the driver?`：`Yes`
- `Are your in-person guides official or independent?`：`I do not have in-person guides.`
- 只选择一个 `English` written/writer。
- 不选择 in-person guide、audio guide、official/independent guide 或额外语言。

不含接送：按门票/项目实际服务设置；没有导游时不要虚构导览语言。

### 7.2 Accessibility

- `Can travelers easily arrive/depart on public transportation?`：`Yes`
- Accessibility 页面内其他所有项目：`No`

### 7.3 票种与人数

- 用户明确只售成人票：只开启 `Adult`，不得添加 Child/Infant/Youth/Senior。
- 用户提供成人和儿童票：按真实年龄段设置，不自行推断。
- 普通含成人/儿童的组合阶梯：Adult 最多 5；Child 最多 4，且儿童至少跟随 1 位成人。
- 单人票不应误设成 group product；车辆接送则按车辆/组报价。
- 最大人数必须同时满足 Viator 设置、供应端限购数和车辆/项目容量，取最小值。

## 8. 图片

- 优先使用供应商、用户或官方提供的景点/项目/游船/观光车相关图片。
- 含接送时可补车型图；交通枢纽接送仍优先展示目的地或核心体验，不强制上传机场/港口实景。
- 不生成图片，除非用户明确要求。
- 上传后核对数量、清晰度、重复图、封面和内容相关性。
- 若照片上传卡住，可按用户授权先上传超过最低合格数量的可用车型图，保存后继续；必须列为复核风险点。
- 稳定上传：监听 `filechooser` → 点击页面内 `browse` → 使用文件选择器设置本地绝对路径。
- 批量上传失败时按 `1 张验证 → 满足最低数量 → 补充目标数量` 分批执行。
- 等 `Update` 保存完成且 `Continue` 恢复可用后再继续。

## 9. 日本接送车型

日本门票 + 接送产品统一使用：

```text
7-Seater Toyota Alphard: up to 4 pax + 5 × 24" luggage
10-Seater Toyota Hiace: up to 7 pax + 7 × 24" luggage
```

- 1–4 人：可使用 7 座 Toyota Alphard。
- 超过 4 人：必须使用 10 座 Toyota Hiace。
- 不再使用旧的“7座最多5人”规则。
- 车型 Option 应用 `4Pax` / `7Pax` 清楚区分。
- Customizations：
  - `Route of tour`：完整路线；
  - `Vehicle type`：Toyota Alphard / Toyota Hiace；
  - `Other`：对应人数与行李说明。

## 10. Pricing、库存与 Schedule

### 10.1 价格来源

- 用户给定 Viator 售价：直接使用。
- 未给售价时：

```text
Suggested retail price = 总成本 / 0.8 / (1 - Viator 佣金率)
```

- 总成本必须与 Option、日期、人数、车型和场次匹配。
- 接送按人分摊时，先计算该人数档的车辆人均成本，再与单张门票成本相加。
- 保存前核对 Suggested retail price、Commission 和 Amount you will get paid。

### 10.2 库存日期

- 后台价格排期有效期不等于前端实际库存。
- 供应端动态库存必须按目标日期/场次实际查询；前端只有实际返回对应 Option 与可预订报价时才算可售。
- 48 小时 booking cut-off 导致的近期不可订日期不得写成可售。
- 用户截图与供应端库存冲突时，按用户指令上架并列为风险点。

### 10.3 日期与星期

- 同价同时间覆盖周一至周日时，合并为：

```text
Sun, Mon, Tue, Wed, Thu, Fri, Sat
```

- 不得留下某星期 `No prices added`。
- 不同日期、节假日、工作日/周末或库存价格必须拆成独立 schedule。

### 10.4 具体时间场次（强制）

- Pricing schedule 选择 `Start times`。
- 按用户截图或供应商实际场次逐个添加具体时间。
- **禁止使用 `Add at regular intervals`。**
- 不得把固定场次改成宽泛营业时间或 coordinated start window。
- 第一个 Option 逐个建立时间；后续 Option 可使用已有时间点的 `Select all`，但仍不得生成 regular intervals。
- Viator 只支持特定分钟粒度时，选择最接近可保存时间，同时在 Option 名称/说明保留真实时间并列为风险点。

示例：

```text
10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
```

### 10.5 Pricing type

- 门票、餐食、游船、观光车、速通：通常 `Per person`。
- 纯车辆费用或以整车销售的接送 Option：`Per vehicle/group`。
- 门票 + 接送按每位成人销售且用户给出人数阶梯时，可用 per-person tier，但必须保证不同人数档总收入覆盖门票 + 车辆总成本。

### 10.6 国内接送节假日（仅适用时）

- 国庆 `10/1–10/7`：仅接送成本加价 30%。
- 春节 `2/4–2/15`：仅接送成本加价 50%。
- 门票成本不随接送节假日加价，除非票价本身变化。
- 日本产品不套用国内节假日规则。

## 11. Booking process 与取消政策

Booking cut-off time：

```text
48 hours
```

所有含门票的组合产品统一：

```text
All sales final / non-refundable
```

门票优先级高于接送、餐食或其他项目的标准退款规则，不得设置 Standard 24-hour cancellation。

## 12. 标准执行路径

1. 建立批量任务清单并完成输入预检。
2. 打开/新建目标产品，确认 code、城市和模板来源。
3. 完成标题、分类、主题、描述、Inclusions/Exclusions、Unique。
4. 完成 Meeting & Pickup、Transportation Details、Languages、Accessibility、Traveler Details。
5. 上传并保存图片。
6. 按实际组合建立所有 Option；逐项核对名称、包含内容、路线、车型、最大人数。
7. 按日期、星期、人数和具体场次建立 Pricing schedules；禁止 regular intervals。
8. 设置 48 小时最晚预订期和不可取消政策。
9. 完成 Booking details、Tickets、Translations 等剩余必填项。
10. 进入 Finish；Intro offer 默认选择 `No thanks, skip`。
11. Tripadvisor listing 选择真实主要城市/景点；无法完全匹配时继续保存并列风险点。
12. 打开 `Submit for review` 页面，逐项修复 `Please fix these errors before publishing`。
13. 确认无阻塞错误后保存草稿，停留在提交审核页；不点击最终 Submit。
14. 更新任务清单：`draft saved at Submit for review`，然后继续下一产品。

## 13. 每个产品的强制验收

- Product code、城市、标题和核心 POI 正确。
- 所有 Option 均存在且命名可区分。
- 成人/儿童开关、年龄和最大人数正确；成人限定产品只有 Adult。
- 日本超过 4 人使用 10 座车。
- 每个 schedule 的日期、星期、具体时间、人数 tier 和港币售价正确。
- 未使用 `Add at regular intervals`；没有 `No prices added`。
- Meeting & Pickup 的 drop-off、pickup appearance 和端点说明正确。
- Accessibility 除公共交通项外全部为 No。
- Booking cut-off 为 48 小时；取消政策为不可取消。
- 图片数量达到 Viator 门槛，封面和内容可接受。
- Submit 页无未修复错误，草稿已保存，未提交审核。

## 14. 自动恢复与阻塞处理

### 14.1 普通登出

1. 记录 code、中断 URL、页面和未完成步骤。
2. 确认域名为 `supplier.viator.com`。
3. 使用默认账号和浏览器已保存凭据自动登录；不得读取或输出密码。
4. 返回中断 URL，回读 code 和保存状态。
5. Pricing 中断时先读 summary，确认已落盘的 Option/schedule 后继续。

连续 3 次登录失败，或出现 MFA、验证码、安全挑战、账号异常时停止并报告。

### 14.2 页面/插件故障

按顺序尝试：

1. 重新读取页面、等待当前保存完成；
2. 重新认领包含目标 code 的 tab；
3. 刷新或重新打开中断 URL；
4. 重连/重启相关应用后恢复；
5. 从已保存 summary 继续，避免重复创建 Option 或 schedule。

### 14.3 可绕过卡点

- 图片卡住：按第 8 节使用合格备用图先达到门槛。
- 单个产品暂时无法继续：记录 code、页面、原因和断点，先处理批量清单下一项，最后回补。
- Trace error：最多重试一次；仍失败则关闭弹层，从干净 summary 重建当前 schedule/Option。

### 14.4 必须人工介入

- MFA、验证码或安全挑战；
- 账号/权限异常；
- 需要付款、购票或外部真实下单；
- 保险、法律或合规声明；
- 最终 Submit、发布或其他不可逆动作；
- 关键价格、产品组成或用户选择无法从资料判断。

## 15. 最终输出格式

仅在清单内全部产品完成后报告整批完成。输出：

```text
Product name | Product code | Status
```

并列出需要人工复核的内容，例如：

- 截图价与供应商实际价不一致；
- 供应端库存/场次需要提交前再次核验；
- 使用了备用图片；
- POI 或 Tripadvisor listing 非完全匹配；
- Viator 时间粒度与真实场次不一致；
- 最大人数、车型容量、年龄段或某个 schedule 需复核。

除非用户明确要求，不输出冗长的逐页操作日志。
