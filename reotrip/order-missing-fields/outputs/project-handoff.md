# ReoTrip 订单缺失字段与英文邮件生成页面交接文档

## 交付物

- 页面文件：`outputs/three-panel-page.html`
- 交接文档：`outputs/project-handoff.md`

当前页面是本地静态 HTML，只读本地整理后的订单信息，不会写回 ReoTrip 系统，不会修改任何线上订单。

## 项目目标

基于 ReoTrip 订单列表和订单详情信息，制作一个本地三栏页面：

1. 左侧：展示订单信息。
2. 中间：根据订单类型和订单字段自动判断缺失字段。
3. 右侧：根据当前缺失字段生成英文询问邮件，并支持复制邮件内容。

## 安全边界

- 不在代码、截图或文档中明文暴露 API Key、账号密码、Cookie、Token 等敏感信息。
- 只读取 ReoTrip 系统信息，不修改 ReoTrip 系统内任何订单。
- 当前版本是静态本地页面，不包含登录凭证，不调用 ReoTrip 写接口。
- 无法判断订单类型时，应标记为：`需人工确认 / Manual review required`。

## 当前最终页面功能

### 三栏布局

页面路径：

`C:\Users\starfish\Documents\Codex\2026-07-06\https-a-reotrip-com-v-orders\outputs\three-panel-page.html`

页面结构：

- 左栏：订单信息
- 中栏：缺失字段
- 右栏：邮件处理

页面保持横向三栏布局，窄屏时通过横向滚动查看。

### 日期切换

左侧顶部日期从固定标签改为日期下拉框。

当前已导入：

- `2026-07-04`
- `2026-07-05`

切换日期后会刷新：

- 左侧订单列表
- 订单数
- 已确认数
- 待补充数
- 中间缺失字段
- 右侧邮件生成对象

### 缺失字段判断

缺失字段不是手写展示，而是根据：

- 左侧订单信息
- 当前订单类型
- 类型规则

动态计算。

订单里已有的信息不会显示在缺失字段里，也不会在邮件中重复询问。

### 邮件生成

点击右侧 `邮件生成` 后，页面生成英文邮件。

邮件要求：

- 礼貌、简洁、清晰。
- 只询问当前缺失字段。
- 不重复询问订单中已存在的信息。
- 包含订单号，便于客户识别。
- 字段名使用自然英文。

示例结构：

```text
Subject: Missing Information for Booking BR-xxxx

Dear Customer,

Thank you for your booking BR-xxxx. Could you please provide the following missing information?

- Pickup time
- Full English hotel name and address

Thank you for your help.

Best regards,
ReoTrip Team
```

### 复制邮件内容

右侧 `复制邮件内容` 按钮位于 `邮件生成` 按钮正下方。

生成邮件后点击可复制邮件正文，便于运营同事直接粘贴发送。

## 已实现的字段规则

### 接送订单

接送订单需检查：

- 出行日期 / Travel date
- 接送时间 / Pickup time
- 接送线路 / Transfer route
- 出发地 / Pickup location
- 目的地 / Drop-off location
- 酒店英文全名和具体地址 / Hotel full English name and full address
- 人数 / Passenger count
- 行李配置 / Luggage details
- 航班 / 列车 / 船名编号 / Flight, train, or ferry number/name

规则细节：

- 如果订单已有日期但缺少时间，只询问具体接送时间。
- 酒店信息需包含英文酒店全名和具体地址。
- 只有酒店中文名、简称或模糊地址时，仍视为不完整。
- 接送线路需明确上车点和下车点。
- 若路线方向不清楚，应询问 `Pickup location` 和 `Drop-off location`。
- 行李配置至少包含数量、尺寸和类型。
- 尺寸示例：`24-inch`、`26-inch`、`28-inch`、`carry-on`。
- 类型示例：`suitcase`、`backpack`、`stroller`、`soft bag`。
- 交通枢纽相关订单必须收集航班、列车或船名编号。
- 码头订单单独检查：接送时间、酒店英文名和地址、接送线路、船名、行李配置。
- 码头订单中，如果 `pickup` 已经是完整酒店地址，不再要求酒店地址。
- 码头订单中，如果 `flight` 或备注字段里已有船名，不再要求船名。
- 订单类型无法判断时，标记为 `需人工确认 / Manual review required`。

### 门票订单

门票订单需检查：

- 使用日期 / Visit date
- 使用时间 / Time slot
- 人数 / Passenger count
- 邮箱 / Email
- 特殊备注 / Special notes

## 当前页面的数据来源

早期任务中读取了用户提供的本地 HTML 页面：

`D:\常用文件\reotrip\旅游订单管理系统.html`

为便于处理，复制了一份到工作区：

`work/orders.html`

从该 HTML 中读取并整理出：

- `2026-07-04` 的订单
- `2026-07-05` 的订单

最终页面中的订单数据当前以内嵌 JavaScript 数组形式存在于：

`outputs/three-panel-page.html`

数组名：

`orders`

## 在其他设备上复现同类操作

### 方式一：直接使用当前交付页面

1. 复制 `outputs/three-panel-page.html` 到其他设备。
2. 用浏览器打开该 HTML 文件。
3. 在左侧切换日期。
4. 点击订单。
5. 查看中间缺失字段。
6. 点击右侧 `邮件生成`。
7. 点击 `复制邮件内容` 后粘贴发送。

### 方式二：处理新的 ReoTrip 页面

1. 在已登录浏览器中打开 ReoTrip 订单列表。
2. 选择目标出行日期范围。
3. 确保订单列表和需要的详情信息已加载。
4. 将页面另存为完整 HTML，或导出 Excel / CSV / HAR。
5. 不要提供 Cookie、Token、账号密码等敏感凭证。
6. 将 HTML / Excel / CSV / HAR 放入本地工作目录。
7. 从文件中提取订单字段。
8. 将订单整理进页面的 `orders` 数组。
9. 打开 `three-panel-page.html` 验证：
   - 日期切换是否正常
   - 订单列表是否正常
   - 缺失字段是否只显示真正缺失项
   - 邮件是否只询问缺失信息

## 订单数据结构说明

每个订单对象建议包含：

```js
{
  no: "订单号",
  guest: "客人姓名",
  status: "订单状态",
  type: "接送 或 门票",
  product: "产品名称",
  package: "套餐名称",
  date: "YYYY-MM-DD",
  time: "HH:mm",
  pax: "人数信息",
  price: "金额",
  supplier: "供应商",
  pickup: "上车点",
  dropoff: "下车点",
  hotelNameEn: "酒店英文全名",
  hotelAddress: "酒店完整地址",
  luggageQuantity: "行李数量",
  luggageSize: "行李尺寸",
  luggageType: "行李类型",
  routeClear: true,
  hubRelated: true,
  flight: "航班/列车/船名编号",
  remark: "备注，可用于识别码头订单船名",
  emailVerified: true,
  noteNeedsConfirm: false
}
```

字段可为空。缺失字段判断逻辑会根据空值和订单类型自动计算。

## 关键函数

页面中的核心函数：

- `getMissingFields(order)`：根据订单字段和类型规则计算缺失字段。
- `getExistingFields(order)`：根据订单字段计算已存在字段，目前仅用于邮件逻辑内部，不展示在页面上。
- `renderOrders()`：按当前日期渲染左侧订单列表。
- `renderMissing()`：渲染中间缺失字段。
- `generateEmail()`：根据当前缺失字段生成英文邮件。
- `copyEmail()`：复制生成的邮件内容。
- `renderDateSelect()`：渲染顶部日期切换下拉框。

## 后续可扩展方向

- 从上传的 HTML / HAR 自动解析订单，而不是手工写入 `orders` 数组。
- 增加订单搜索框。
- 增加“只看待补充订单”过滤。
- 增加字段规则配置区。
- 增加导出待补充清单 CSV。
- 支持更多订单类型，例如包车、多点接送、往返接送。

## 注意事项

- 不要在页面中保存任何登录态、Cookie、Token 或账号密码。
- 不要让页面直接调用 ReoTrip 修改订单的接口。
- 对线上系统只读，不写入。
- 如果订单类型、路线方向或字段含义无法确认，标记为人工确认，不要猜测。

## 最后一版新增：订单详情弹窗

点击左侧任意订单卡片时，页面会选中该订单并刷新中间缺失字段、右侧邮件对象，同时弹出“订单详情”窗口。

弹窗展示当前订单的订单号、状态、客人、类型、产品、套餐、出行日期、时间、人数、金额、供应商、缺失字段，以及接送订单相关的上车点、下车点、酒店英文名、酒店地址、行李信息、航班/列车/船名、路线方向和交通枢纽判断。

空字段统一显示为“未填写”。弹窗支持点击“关闭”、点击背景区域、按 `Esc` 关闭。该弹窗仍然是本地只读展示，不会修改 ReoTrip 系统内任何订单信息。
