# Viator 门票类产品自动上架 Workflow

版本：2026-08-17（精简执行版）  
适用：单景点门票、展览票、演出票、游船票及不含接送的门票组合。  
默认账号：Viator `op1@yesingholidays.com`。  
完成边界：创建或修改产品草稿，保存并停在 `Submit for review`；**不得提交审核、付款、发布或在供应端下单**。

---

## 1. 执行原则

1. 标题与目标产品以用户截图/任务表中的产品名称为准；供应端链接用于采集内容、规则与价格。
2. 一个供应端页面有多个套餐时，必须用截图名称定位对应套餐，不选默认项、首项、最低价或相邻产品。
3. 所有字段只使用当前产品的供应端证据，不复制其他景点草稿中的营业时间、限制、分类或核销文案。
4. 页面操作使用浏览器插件的可见页面和 DOM 控件，不使用系统屏幕坐标。
5. 每完成一个页面立即保存并回读；不能把“点击保存”当成“保存成功”。
6. 多产品任务必须维护清单并逐项执行；单个产品完成不代表批次完成。
7. 普通登录过期时自动使用 Chrome 保存的 op1 凭据登录并返回断点。遇到 MFA、验证码、安全挑战、付款或正式提交时停止。

---

## 2. 批量任务清单

开始前建立并持续更新：

| 序号 | 截图产品名 | 供应端链接/套餐 | Viator code | 状态 | 断点/复核项 |
| --- | --- | --- | --- | --- | --- |
| 1 |  |  |  | pending |  |

状态仅使用：`pending`、`in progress`、`draft saved at Submit for review`、`blocked`。最终回复前逐行确认；只要仍有未完成项，不得报告整批完成。

---

## 3. 供应端采集与映射

### 3.1 强制采集

- 截图目标名称、供应端实际套餐名、产品/资源 ID；
- 景点名称、地址、集合点或入口；
- 票种、年龄/身高/国籍/证件限制；
- 可售日期、星期、营业时间、最晚入场时间；
- 固定场次、预约时间窗或每半小时/每小时的入场时刻；
- 建议游玩时长或演出时长；
- 包含与不包含项目；
- 核销方式、票券发送方式、换票地点、同行入园要求；
- 游客信息要求；
- 供应端拟下单价格、币种、日期和票种；
- 图片来源。

价格以用户截图为准；用户未给出明确报价时，进入供应端具体日期/票种的拟下单页核实。列表页 `From price` 只能作线索。

### 3.2 字段映射

| 供应端证据 | Viator 字段 |
| --- | --- |
| 截图名称、套餐名 | Title、Option name/description |
| 景点类型与体验 | Categorization、3 个 Themes、Unique selling points |
| 地址、入口、集合点 | Meeting & pickup、Ticket details |
| 营业时间、最晚入场 | Schedule、Know before you go、Redemption instructions |
| 固定场次/时间窗 | Option、Start times、Option description |
| 游玩/演出时长 | Ticket details duration |
| 年龄、身高、证件限制 | Traveler details、Required information、Know before you go |
| 扫码/换票/另发票 | Ticket redemption |
| 包含/不包含项目 | Inclusions / Exclusions |
| 最终成本 | Suggested retail price |

停止入场时间必须明确告诉游客，例如：`The attraction closes at 10:00 PM. Last admission is at 9:30 PM.`

---

## 4. 图片准备与质检

1. 优先使用供应端或官方授权的景点图片，建议准备 6 张以上。
2. 只下载静态图片；排除视频、播放器封面、黑帧、占位图、截图和无关车型图。
3. 上传前逐张检查：可解码、非纯黑、主体属于目标景点、无明显水印/大段文字、清晰度和横向比例合格。
4. 上传后检查 Viator Gallery 的真实缩略图：数量、重复、黑屏、景点匹配。
5. 失败时换另一张合格景点图或分批上传；不得用无关图片凑数量。
6. 记录图片来源与版权待复核项。

---

## 5. Viator 填写路径

### 5.1 Basics

- Creation type：`Manual Creation`。
- Product type：`Ticket or pass`。
- Subtype/Categorization：按实际产品选择 Museum、Attraction、Theme Park、Observation Deck、Show、Cruise 等，不选无关分类。
- Title：以截图产品名为准，做必要英文语序优化，但不得改变景点、楼层、区域、船型、座位等级、套餐或场次。
- Themes：选满 **3 个与产品实际内容直接相关**的主题；保存后回读确认。
- Photos：上传合格景点图片并完成 Gallery 复核。

### 5.2 Meeting & Pickup

- 游客自行到景点入口：`Travelers go directly to the location`；填写供应端确认的景点/入口地址。
- 产品有指定集合点：`We meet all travelers at a meeting point`；按供应端填写 meeting point、地址和集合说明。
- 只有明确含接送时才选择 pickup；普通门票不得设置接送。

保存前核对地图结果与文字地址均指向目标景点或真实集合点。

### 5.3 Ticket Details

- 选择正确 POI/attraction。
- Duration 必须取自供应端：明确时长按其设置；明确自由参观才用 flexible duration；无法精确表达时使用不夸大的范围并列为复核项。
- Description 写游客体验，并补充必要的身高、证件、国籍、指定入口等限制。
- 营业时间与最晚入场提示放入 `Know before you go`；有季节/日期变化时写清日期范围。

### 5.4 Languages Offered

- `Do you offer in-person, audio or written guides?` → `Yes`
- `Are your in-person guides official or independent?` → `I do not have in-person guides`
- 只保留 `Written` → `English`

除非供应端明确包含其他语言服务，否则不增加 in-person 或 audio guide。

### 5.5 Inclusions & Exclusions

- Inclusions：只写当前票价明确包含的门票、区域、座席或项目。
- Exclusions：交通、餐食、个人消费、未包含升级项等。
- 页面追问 excluded item 是否可额外购买时，默认选 `No`；只有本产品明确提供加购时才选 `Yes`。

### 5.6 What Makes Your Product Unique

写 4–6 条英文卖点，每条采用 `Short Heading – Explanation`，**每条之间空一行**。只写供应端可支持的景点特色、核心体验、便利性和游览价值。

```text
Immersive Experience – Explore a distinctive attraction through memorable visual and sensory experiences.

Iconic Destination – Visit one of the city's best-known attractions and discover its signature highlights.

Flexible Exploration – Enjoy the attraction at your own pace within the permitted admission period.

Convenient Entry – Use the ticket and redemption method provided for straightforward admission.

Memorable Visit – Create lasting memories at a must-see destination.
```

不得写未经证实的 `skip-the-line`、`official ticket`、VIP 权益或保证性宣传。

### 5.7 Traveler Information

- Reseller status：`Independent reseller`，除非有官方授权证据。
- Accessibility、公共交通、难度仅按实际情况填写。
- Day-of-travel phone：`+86 13112241802`。
- 实名、身高、证件、同订单同行入园等规则写入 Know before you go。

---

## 6. Schedules & Pricing

### 6.1 结构判断

| 供应端差异 | Viator 建模方式 |
| --- | --- |
| 套餐内容、区域、座位等级、核销资源不同 | 不同 Option |
| 内容相同，仅日期/星期/旺淡季价格不同 | 同一 Option 下不同 Schedule |
| 同票种同价格，有明确固定入场时刻 | 同一 Schedule 下多个 Start times |
| 连续时段内可任意入场 | Opening hours |
| 预约时间窗，如 09:30–12:00 | 独立 Option 或可表达的时段结构，并保留完整起止时间 |
| 成人/儿童等同一产品的人群价 | Age bands；资格无法表达时拆 Option 并写限制 |

营业时间不是 Option；不得把上午/下午拆分为 Option，除非供应端确实销售不同场次或用户明确要求。

### 6.2 Traveler Details

- Pricing type：通常为 `Per person`；多人套票/包组产品才用 group/vehicle。
- Age bands：只开启实际销售的人群。用户要求仅售成人票时，必须同时：
  1. 在所有 pricing schedules 中取消 Child/Youth/Infant/Senior 报价；
  2. 回到 Traveler Details 关闭相应年龄段；
  3. 最终 summary 只显示 Adult。
- 年龄或身高边界必须来自供应端；Viator 无法准确表达身高票时，在游客提示中写清。
- `Max travelers per booking` 是单次订单可预订人数，不等于库存。按供应端限购、实际履约能力及 Viator 可选上限设置；不得把库存数量误作成多人套票容量。

### 6.3 Option

- 每个 Option 使用清晰名称，不保留 `DEFAULT (TG1)`。
- 无场次可用 `Standard Admission Ticket` 或 `Adult Admission Ticket`。
- 有真实场次可用 `Morning Admission`、`Afternoon Admission`、具体座位/套餐名称。
- 编辑后回到 Pricing summary，核对名称、TG、时间、日期、年龄段和价格。

### 6.4 Pricing Schedule

1. 货币选择 `HKD`。
2. 按供应端设置可售日期、星期和时间。
3. 连续营业时间用 Opening hours；固定入场时刻用 Start times。
4. 开放时间若有两段，必须建立两段可用时间，不得合并或漏掉第二段。
5. 闭馆时间和最晚入场时间不能混淆；Schedule 以可入场时间为准，游客提示同时写明闭馆与停止入场。
6. 按真实日期/票种填写价格。

若用户截图已给出 Viator 售价，直接按截图填写。否则默认：

```text
Suggested retail price = 供应端拟下单成本 / 0.8 / (1 - Viator佣金率)
```

- 佣金率以 Viator 当前页面为准，例如 22% 使用 `0.78`。
- `Amount you will get paid` 由 Viator 自动计算，不手动覆盖。
- 若需取整，向上取整，确保不低于公式结果。

每个 Schedule 保存后核对：日期、星期、Opening hours/Start times、年龄段、售价、佣金和净收款。出现 Trace error 最多重试一次，仍失败则退出弹窗，从 Pricing summary 核查真实落盘状态后重建。

---

## 7. Booking & Tickets

### 7.1 Booking Process

- Confirmation：`Instant confirmation`，除非供应端需要人工确认。
- Booking cut-off：统一 `48 hours`；若页面不能保存，使用最接近且更保守的值并记录。

### 7.2 Cancellation

- 普通门票及不含交通的园内组合：`Standard cancellation policy`。
- 门票 + 接送/包车/班车等交通履约组合：`All sales final / non-refundable`。

### 7.3 Traveler Required Information

- 实名制：收集 Full Names。
- 明确要求护照：收集 Passport Details。
- 其他身份证件要求无法对应时，选最接近字段并在 Know before you go 和报告中提示。
- 不臆测证件要求；必须检查供应端规则和拟下单游客字段。

### 7.4 Ticket Builder

- Mobile or printed ticket：按供应端可接受方式选择。
- 供应端每人独立二维码：`One per traveler`。
- 供应端一单一张且同行入园：`One per booking`。

### 7.5 Ticket Redemption

必须按当前供应端规则选择并写明：

- 电子票/二维码直接入园 → direct-entry ticket；
- 窗口、游客中心或机器换票 → ticket exchange；
- 预订后另发可入园票 → separate entry ticket，并说明 Viator voucher 不能直接入园；
- 所需证件、订单号、手机号、实名、指定入口；
- 同订单是否必须同时入园；
- 营业时间和最晚入场时间。

通用骨架（须替换方括号内容）：

```text
Use the [direct-entry e-ticket / QR code / exchanged ticket] at [attraction and entrance]. The Viator voucher alone [is / is not] valid for admission.

Opening hours: [hours]. Last admission: [time]. Please arrive before the last-admission time.

[Bring the original valid ID/passport used for booking.] [All travelers in the same booking must enter together.]
```

保存前与供应端 `How to use / Redemption / Admission / Ticket collection` 逐条核对。

---

## 8. Finish 与停止边界

- Intro offer：默认跳过。
- Tripadvisor listing：选择与实际城市/景点最匹配的 Yesing listing；没有精确项时记录人工复核，不乱选其他城市。
- 打开 `Submit for review`：
  - 如有 `Please fix these errors before publishing`，逐项修正并重新检查；
  - 只保存草稿；
  - 不勾选保险/合规声明；
  - 不点击 Submit；
  - 不支付 Product Submission Fee；
  - 不发布。

页面无字段错误且只剩正式提交/付款动作时，状态记为 `draft saved at Submit for review`。

---

## 9. 中断与自动恢复

### 9.1 普通登录过期

1. 记录 product code、当前 URL、页面步骤和未确认保存的内容。
2. 确认域名为 `supplier.viator.com`。
3. 用 Chrome 保存凭据选择 `op1@yesingholidays.com`；不得读取或记录密码明文。
4. 登录后重新打开中断 URL。
5. 先读取真实页面状态；Pricing 中断必须先回 Pricing summary 核对落盘内容。

出现 MFA、验证码、安全挑战、账号异常或连续 3 次登录失败时才标记 `blocked` 并请求人工处理。

### 9.2 页面/插件异常

- 插件失联：重新列出 Chrome tabs，认领包含目标 code 的 Product Builder 页面；必要时重启插件/Chrome 后继续。
- 页面卡住：刷新或重新打开当前 code 的断点 URL，回读已保存状态。
- 图片上传失败：用合格图片小批量重试，检查 Gallery 后继续。
- 某产品暂时不可恢复：记录 code、页面、原因和下一步，先执行批次中其他产品，末尾再回头处理。

恢复原则：**先核对真实已保存状态，再继续；不依赖中断前记忆。**

---

## 10. 完成前 QA

- [ ] Title 与截图目标和供应端套餐一致。
- [ ] Categorization 正确，Themes 为 3 个相关主题。
- [ ] 图片非黑屏、非视频、非占位、无明显重复且属于目标景点。
- [ ] Meeting/Pickup 与供应端一致，meeting point/入口地址正确。
- [ ] POI、开放时间、最晚入场、时长、限制均有供应端证据。
- [ ] Languages 为 `Yes → no in-person guides → Written English`。
- [ ] Unique selling points 为英文分点，每条之间空一行。
- [ ] Option 数量、名称、套餐和场次没有串位。
- [ ] 双时段营业时间完整保留；Opening hours 与固定 Start times 未混淆。
- [ ] Age bands 与实际售卖人群一致；仅售成人时 summary 只显示 Adult。
- [ ] 售价、佣金、净收款、日期、星期和时间正确。
- [ ] Confirmation、48H cut-off、Cancellation 正确。
- [ ] Required information 与供应端要求一致。
- [ ] Ticket Builder 和 Redemption 与真实票券交付/核销方式一致。
- [ ] Tripadvisor listing 城市/景点匹配。
- [ ] Submit for review 页面无待修字段；草稿已保存，未提交、未付款。

---

## 11. 最终输出模板

```markdown
## 执行结果

| Code | Title | 状态 | Option / 时间 | 售价 HKD | 需人工复核 |
| --- | --- | --- | --- | --- | --- |
| 5651502PXXX | Product title | Draft saved at Submit for review | Standard Admission / 09:00–18:00 | Adult 000 | None |

### 关键设置
- Categorization / Themes：...
- Age bands / Max travelers：...
- Supplier cost / Viator retail / Commission / Net payout：...
- Opening hours / Last admission / Duration：...
- Ticket delivery / Redemption：...
- Images：数量、来源、版权复核状态。

### 复核项
- 仅列出证据不足、Viator 无法准确表达或需要人工决定的事项。

> 所有产品均仅保存为草稿，未提交审核、未付款、未发布。
```
