# Viator 包车产品自动上架 Workflow

## 1. 任务目标与停止条件

根据产品标题、出发地、目的地、时长、车型人数及报价，在 Viator Supplier 后台创建包车产品。

- 使用浏览器插件的可见页面元素操作，不使用系统屏幕坐标。
- 优先使用页面元素名称、文本框、下拉框和页面内部坐标。
- 每完成一个页面立即保存。
- 最终进入 **Submit for review** 页面，点击 **Save as draft**。
- **禁止点击 Submit，禁止支付产品提交费，禁止正式提交审核。**

## 2. 执行前输入数据

开始前必须取得以下数据：

| 字段 | 示例 |
|---|---|
| 产品标题 | Kobe Cruise Port Full-Day Private Osaka Shore Excursion - 10H |
| 出发地 | Kobe Cruise Port |
| 目的地区域 | Osaka |
| 时长 | 10 Hours |
| 上架日期 | 2026-08-12 |
| 车型与人数 | 4PAX、7PAX、3PAX＋Guide、6PAX＋Guide |
| 四个零售价 | HKD 4512.82 / 4865.38 / 5568.91 / 6323.72 |
| Tripadvisor Listing | 与出发地或产品经营区域相符的 YESing Listing |

如果标题超过 Viator 字数限制，将结尾的 `10 Hours`、`8 Hours`、`6 Hours` 分别缩写为 `10H`、`8H`、`6H`，不要删除主要出发地、目的地或 Shore Excursion 信息。

## 3. 固定页面流程

### 3.1 Creation Type

1. 新建产品后跳过 reservation system 导入。
2. 选择 **Manual Creation**。
3. 语言选择 **English**。
4. 使用自动翻译设置。
5. 填写英文产品标题并保存。

### 3.2 Categorization

- Product type：**Tour**
- Transportation：**Land Transport → Car**
- Duration：**One day or less**

### 3.3 Theme

主题类别选择 **Travel**，选择以下三个主题：

1. City
2. Cruise
3. Port Transfer

### 3.4 Photos

快速上架时只上传 **3 张合格的基础车型照片**。

- 优先上传横向、清晰、符合 Viator 尺寸要求的车辆照片。
- 上传后等待后台处理，再点击 Update/Continue。
- Viator 图片增强可能把 3 张照片重复显示成 6、9、12 张；只要页面达到最低要求并出现 Continue，即继续下一步。
- 不要为清理重复照片阻断整项任务，正式提交前再人工复核。

## 4. Product Content

### 4.1 Meeting & Pickup

#### 基础设置

- How do you meet travelers：**We pick up all travelers**
- Pickup from general areas：**Yes**
- Pickup start：**20 minutes**
- Drop-off：**Yes, same location(s) as pickup**
- Pickup type：**Car**

#### General Areas

将标题中的两个主要地点分别添加为 General Area，并都设置为 **All Locations**。

示例：

- Osaka Cruise Port → Kyoto：添加 Osaka、Kyoto
- Kobe Cruise Port → Osaka：添加 Kobe、Osaka
- Yokohama Port → Tokyo：添加 Yokohama、Tokyo

#### Specific Locations

在 **Other** 中再次添加标题涉及的两个地点。

如果出发地是港口，还应添加适合的 Port/Terminal。港口说明统一填写：

> For cruise transfers, include your ship name and terminal. We'll take care of the rest before your trip.

若系统无法找到准确港口，可把港口要求写入 Additional pickup information，不要选择明显错误的地点。

### 4.2 Tour Details

总时长按标题填写。

| 产品时长 | 推荐景点数 |
|---|---:|
| 6 小时 | 2–3 个 |
| 8 小时 | 3 个 |
| 10 小时 | 3–4 个 |

景点应联网或通过 Viator 地点联想生成，并遵守以下规则：

- 景点必须位于正确目的地区域。
- 所有景点停留时间使用同一单位，统一填写 **minutes**。
- 同一产品各景点建议统一为 **90 minutes**，方便客人理解。
- 门票未包含的收费景点选择 **No**。
- 免费街区、市场、公园选择 **N/A (Admission is free)**。
- 自动联想若返回其他国家或错误城市，立即取消并重新搜索，不得保存错误地点。

常用景点组合：

#### Osaka

- Osaka Castle — 90 minutes — Admission not included
- Dotonbori — 90 minutes — Admission is free
- Kuromon Market — 90 minutes — Admission is free
- Shinsekai — 90 minutes — Admission is free

#### Kyoto

- Fushimi Inari-taisha Shrine — 90 minutes — Admission is free
- Kiyomizu-dera Temple — 90 minutes — Admission not included
- Gion — 90 minutes — Admission is free
- Arashiyama Bamboo Forest — 90 minutes — Admission is free

### 4.3 Languages Offered

1. Do you offer in-person, audio or written guides：**Yes**
2. 选择 **I do not have in-person guides**。
3. 添加 **English — Written**。

### 4.4 Inclusions & Exclusions

#### Included

必须添加以下四项；根据实际时长和目的地替换方括号内容：

1. `[X]-Hour Private Charter Service`
2. `Private Air-Conditioned Vehicle`
3. `Optional English-Speaking Guide (Only if the guided option is selected)`
4. `Visit [N] [Destination] Highlights (Customizable within the tour duration)`

示例：

`Visit 4 Osaka Highlights (Customizable within the tour duration)`

#### Excluded

添加一项：

`Tickets, meals, and personal expenses`

- Is this an additional cost travelers have to pay：**No**
- 勾选页面底部信息确认框。

### 4.5 What Makes Your Product Unique

按以下模板填写；根据时长和目的地替换内容：

```text
Private Shore Excursion – Enjoy a dedicated [X]-hour tour exclusively for your group.

[Destination] Highlights – Discover [N] of [Destination]'s most popular landmarks in one trip. Admission tickets to attractions are not included.

Cruise-Friendly Service – Pickup and return are arranged to match your cruise schedule.

Optional English Guide – Learn more about [Destination] with a professional English-speaking guide.

Comfortable Travel – Relax in a private air-conditioned vehicle throughout your journey.
```

设置：

- Is this a private tour：**Yes**
- Can travelers customize this tour：**Yes**
- 如果页面要求最大参加人数，填写该产品全部 Option 中的最大人数，通常为 **7**。

### 4.6 Information Travelers Need From You

- Reseller type：**Independent reseller**
- Wheelchair accessible：No
- Stroller accessible：No
- Service animals allowed：No
- Easily arrive/depart by public transportation：**Yes**
- Infants required to sit on laps：No
- Infant seats available：No
- Health restrictions：全部不勾选
- Physical difficulty：**Easy**
- Phone country code：**+86**
- Phone：`13112241802`

## 5. Schedules & Pricing

### 5.1 Pricing Type

- Pricing：**Per vehicle/group**
- Group type：**Group**
- Currency：**HKD**

### 5.2 默认 Schedule

- Start date：使用任务给定的上架日期
- End date：不填
- Timing：**Start times**
- Days：**Select all**（Sun–Sat）
- Times：从 **7:30am** 到 **3:00pm**，每 **30 minutes** 一个时段

### 5.3 四个固定 Option

必须创建以下四个 Option，标题不得自行改写：

| Option 标题 | Max travelers | 价格 |
|---|---:|---|
| 4PAX Private Tour(Driver Only) | 4 | 使用任务中的 4PAX HKD 价格 |
| 7PAX Private Tour(Driver Only) | 7 | 使用任务中的 7PAX HKD 价格 |
| 3PAX Tour + English Guide | 3 | 使用任务中的 3PAX＋Guide HKD 价格 |
| 6PAX Tour + English Guide | 6 | 使用任务中的 6PAX＋Guide HKD 价格 |

创建流程：

1. 先创建默认 Pricing Schedule。
2. 将 DEFAULT 标题改为 `4PAX Private Tour(Driver Only)`。
3. 依次 Add option 创建其余三个 Option。
4. 每个 Option 使用相同日期、全周和 7:30am–3:00pm 时段。
5. 分别填写最大人数和对应零售价。
6. 保存后核对四个标题、价格、人数和时段是否都显示。

如果 Viator 提示 Option 重复：

- 先确认四个标题、最大人数和价格确实不同。
- 必要时在 Option details 的 **Other** 中添加简短区分说明。
- 不得通过错误时间或错误地点强行制造差异。

## 6. Booking & Tickets

### 6.1 Booking Process

- Cut-off type：**Relative to start time**
- Booking cut-off：**48 hours**
- Confirmation：**Instant confirmation**

### 6.2 Cancellation Policy

- 选择 **Standard**。
- 不勾选额外天气或最低成团人数条款，除非产品数据另有要求。

### 6.3 Traveler Required Information

保留默认必要信息，无额外要求时直接保存继续。

### 6.4 Ticket Builder

- Ticket type：**Mobile or paper ticket accepted**
- Tickets per booking：**One per booking**

### 6.5 Ticket Redemption

- Separate entry ticket：**No, this is a direct entry ticket**
- Redemption instructions：

```text
Please provide your email address and WhatsApp number so our customer service team can confirm your pick-up location and time. The driver will contact you via WhatsApp one day before your scheduled departure.
Admission tickets to attractions are not included.
```

## 7. Finish

### 7.1 Intro Offer

选择：**No thanks, skip**。

### 7.2 Tripadvisor Listing

- 选择与产品出发地或主要经营区域匹配的 YESing Tripadvisor Listing。
- 不要选择明显不相关城市的 Listing。
- 如果系统允许跳过但无法确认正确 Listing，保存草稿并列入复核项。

### 7.3 Submit for Review

1. 确认页面进度达到 100%。
2. 若页面列出错误，逐项返回修复。
3. 到达包含 Product Submission Fee/Card Details 的页面后停止。
4. 点击 **Save as draft**。
5. **不得点击 Submit。**

## 8. 异常恢复规则

### 8.1 插件或标签页断开

1. 重新读取已打开的 Chrome 标签页。
2. 重新接管当前 Viator Product Builder 页面。
3. 若插件无标签页，重启 Chrome/相关插件后再次连接。
4. 不要切换到系统坐标或其他不可复现的自动化方式。

### 8.2 Viator 超时登出

1. 使用指定账号重新登录，默认账号为 **op1**。
2. 若出现邮箱身份验证，暂停并要求人工完成验证。
3. 登录后返回当前产品 Code 对应页面。
4. 先核对上一个页面的数据是否保存，再继续。

### 8.3 保存按钮暂时禁用

- 点击 Save & continue 后等待后台处理。
- 按钮恢复可用时再点击一次。
- 不要连续快速点击，避免重复照片、重复 Option 或重复记录。

### 8.4 页面内容丢失

- 重新登录或刷新后，必须核对当前页面是否仍有已填内容。
- 如果 Tour details、价格或 Option 为空，应在继续下一步前重新填写。

## 9. 完成后的输出格式

每个产品完成后输出：

```text
Product code:
Product title:
Draft status: Saved / Not saved
Submit status: Not submitted
Options:
- 4PAX Private Tour(Driver Only): HKD ...
- 7PAX Private Tour(Driver Only): HKD ...
- 3PAX Tour + English Guide: HKD ...
- 6PAX Tour + English Guide: HKD ...
Items requiring review:
- ...
```

## 10. 最终复核清单

- [ ] 标题中的出发地、目的地和时长正确
- [ ] Tour → Car → One day or less
- [ ] City、Cruise、Port Transfer 三个主题
- [ ] 至少 3 张合格照片
- [ ] 两个 General Area 均为 All Locations
- [ ] 港口说明包含船名和码头要求
- [ ] 景点数量符合时长，全部使用 minutes 且时长一致
- [ ] English Written，且无 in-person guide
- [ ] 4 项 Included、1 项 Excluded
- [ ] Private tour 与 Customizable 均为 Yes
- [ ] Independent reseller；仅公共交通为 Yes
- [ ] 四个 Option 标题、人数、价格正确
- [ ] 全周，7:30am–3:00pm，每 30 分钟
- [ ] 48 小时截止期、Instant confirmation、Standard cancellation
- [ ] Mobile or paper、One per booking
- [ ] Redemption 文案完整
- [ ] Intro offer 已跳过
- [ ] 已到 Submit for review 页面
- [ ] 已点击 Save as draft
- [ ] 未点击 Submit，未支付提交费
