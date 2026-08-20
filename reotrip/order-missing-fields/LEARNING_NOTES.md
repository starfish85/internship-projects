# ReoTrip 订单自动化项目学习笔记

## 1. 项目是什么

本项目从一个本地 HTML 页面开始，逐步扩展成“订单自动化系统”的雏形。

它目前包含两部分：

- 前端静态页面：用于展示订单、识别缺失字段、生成英文询问邮件。
- Spring Boot 后端接口模块：用于提供订单导入、查询、统计、异常识别和 Excel 导出数据源。

项目的核心目标不是替代 ReoTrip 系统，而是围绕 ReoTrip 订单做本地辅助处理：

- 只读取订单信息。
- 不修改 ReoTrip 线上订单。
- 不保存账号密码、Cookie、Token、API Key 等敏感信息。

## 2. 项目目录结构

```text
.
├─ README.md
├─ AGENTS.md
├─ LEARNING_NOTES.md
├─ .gitignore
├─ backend/
│  ├─ pom.xml
│  ├─ README.md
│  └─ src/main/
│     ├─ java/com/reotrip/orders/
│     │  ├─ OrderAutomationApplication.java
│     │  ├─ common/
│     │  ├─ controller/
│     │  ├─ dto/
│     │  ├─ exception/
│     │  ├─ model/
│     │  ├─ repository/
│     │  └─ service/
│     └─ resources/application.yml
└─ outputs/
   ├─ three-panel-page.html
   ├─ project-handoff.md
   ├─ deployment-path.md
   ├─ user-guide.md
   └─ development-standards.md
```

## 3. 第一阶段：HTML 页面是怎么做出来的

第一阶段做的是本地静态页面：

```text
outputs/three-panel-page.html
```

页面不依赖服务器，直接用浏览器打开即可。

### 3.1 页面目标

页面要解决运营同事的三个问题：

1. 快速查看订单信息。
2. 快速判断订单缺哪些关键字段。
3. 自动生成英文邮件，只询问缺失信息。

所以页面设计成三栏：

```text
左侧：订单信息
中间：缺失字段
右侧：邮件生成
```

### 3.2 用到的前端知识点

HTML 部分：

- 使用 `<main>` 承载页面主体。
- 使用 `<section>` 划分三栏区域。
- 使用 `<button>`、`<select>`、`<article>` 等语义化标签组织页面。

CSS 部分：

- 使用 `display: grid` 实现横向三栏布局。
- 使用 `overflow: auto` 实现订单列表内部滚动。
- 使用 `position: sticky` 固定面板头部。
- 使用 `border`、`background`、`tag` 样式模拟 ReoTrip 后台管理风格。
- 使用弹窗样式实现订单详情展示。

JavaScript 部分：

- 使用数组 `orders` 保存本地订单数据。
- 使用函数 `renderOrders()` 渲染订单列表。
- 使用函数 `renderMissing()` 渲染缺失字段。
- 使用函数 `generateEmail()` 生成英文邮件。
- 使用函数 `copyEmail()` 调用浏览器剪贴板能力。
- 使用事件监听器处理订单点击、日期切换、统计筛选、弹窗关闭。

### 3.3 订单数据结构

前端页面里的订单数据保存在：

```js
const orders = [
  {
    no: "订单号",
    guest: "客人姓名",
    status: "订单状态",
    type: "接送",
    product: "产品名称",
    package: "套餐名称",
    date: "YYYY-MM-DD",
    time: "HH:mm",
    pax: "人数信息",
    pickup: "上车地址",
    dropoff: "下车地址",
    hotelNameEn: "酒店英文全名",
    hotelAddress: "酒店完整地址",
    luggageQuantity: "行李数量",
    luggageSize: "行李尺寸",
    luggageType: "行李类型",
    routeClear: true,
    hubRelated: true,
    flight: "航班/列车/船名编号"
  }
]
```

这个结构是从 ReoTrip 订单列表和订单详情中抽出来的。

### 3.4 缺失字段怎么判断

页面核心函数是：

```js
getMissingFields(order)
```

它根据订单类型和订单字段判断缺失信息。

接送订单重点检查：

- 出行日期 / Travel date
- 接送时间 / Pickup time
- 上车地址 / Pickup location
- 下车地址 / Drop-off location
- 酒店英文全名和具体地址 / Hotel full English name and full address
- 人数 / Passenger count
- 行李配置 / Luggage details
- 航班 / 列车 / 船名编号 / Flight, train, or ferry number/name

规则细节：

- 如果订单已有日期但缺少时间，只询问具体接送时间。
- 如果酒店只有中文名、简称或模糊地址，仍视为不完整。
- 如果路线方向不清楚，需要询问上车点和下车点。
- 如果行李缺少数量、尺寸或类型，就询问行李配置。
- 如果交通枢纽相关订单缺少航班/车次/船名，需要补充对应编号。

### 3.5 英文邮件怎么生成

邮件生成函数：

```js
generateEmail()
```

它的原则是：

- 只询问当前缺失字段。
- 不重复询问订单中已有字段。
- 语气礼貌、简洁、清晰。
- 包含订单号，方便客户识别。

示例：

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

### 3.6 为什么后来加了订单详情弹窗

左侧订单卡片需要保持简洁，所以金额、供应商等字段不适合堆在列表里。

因此点击订单卡片时弹出详情弹窗：

- 列表只看运营关键字段。
- 弹窗看完整字段。
- 缺失字段和邮件对象同步刷新。

涉及知识点：

- DOM 事件监听。
- 弹窗显示/隐藏。
- 点击背景关闭。
- 按 `Esc` 关闭。
- 根据选中订单动态渲染详情。

### 3.7 ReoTrip 读取前为什么要筛选接送订单

ReoTrip 系统本身可以筛选接送订单，筛选结果会体现在 URL 里。

标准流程：

1. 打开 ReoTrip 订单列表。
2. 在页面中筛选 `接送订单`。
3. 确认 URL 已包含筛选条件。
4. 使用筛选后的 URL 读取订单。
5. 导入本地工具。

好处：

- 导入的数据默认都是接送订单。
- 页面可以优先按接送规则检查缺失字段。
- 本地逻辑不用过度复杂。

但仍保留兜底：

```text
需人工确认 / Manual review required
```

防止混入无法判断类型的订单。

## 4. 第二阶段：为什么要做 Spring Boot 后端

HTML 页面适合展示和人工辅助，但如果要做订单自动化系统，需要后端提供统一数据能力。

后端要解决这些问题：

- 爬虫抓到的数据如何存储。
- 前端如何按条件查询订单。
- 如何统一统计缺失字段。
- Excel 导出模块如何拿数据。
- 异常如何统一返回友好提示。

所以新增了：

```text
backend/
```

## 5. 后端整体业务逻辑

后端业务流程：

```text
爬虫抓取订单
  ↓
POST /api/orders/import 导入订单
  ↓
OrderRepository 保存订单
  ↓
GET /api/orders 查询订单
  ↓
OrderValidationService 判断缺失和异常
  ↓
GET /api/orders/statistics 输出统计结果
  ↓
前端页面 / Excel 导出模块复用接口数据
```

第一版使用内存存储，后续可以切换到 MySQL。

## 6. Spring Boot 后端结构

```text
backend/src/main/java/com/reotrip/orders/
├─ OrderAutomationApplication.java
├─ common/
│  ├─ ApiResponse.java
│  └─ ErrorCode.java
├─ controller/
│  └─ OrderController.java
├─ dto/
│  ├─ DailyOrderCount.java
│  ├─ OrderQueryRequest.java
│  ├─ OrderStatistics.java
│  ├─ OrderValidationResult.java
│  └─ PageResult.java
├─ exception/
│  ├─ BusinessException.java
│  └─ GlobalExceptionHandler.java
├─ model/
│  └─ TravelOrder.java
├─ repository/
│  ├─ OrderRepository.java
│  └─ InMemoryOrderRepository.java
└─ service/
   ├─ OrderService.java
   └─ OrderValidationService.java
```

## 7. Spring Boot 启动类知识点

文件：

```text
OrderAutomationApplication.java
```

核心注解：

```java
@SpringBootApplication
```

作用：

- 声明这是 Spring Boot 应用入口。
- 开启自动配置。
- 扫描当前包及子包下的 Controller、Service、Repository。

启动方法：

```java
SpringApplication.run(OrderAutomationApplication.class, args);
```

## 8. 实体类 TravelOrder

文件：

```text
model/TravelOrder.java
```

它表示一条旅游订单。

字段包括：

- 订单编号：`orderNo`
- 客户姓名：`customerName`
- 手机号：`phone`
- 行程日期：`travelDate`
- 订单状态：`orderStatus`
- 订单类型：`orderType`
- 行程描述：`itinerary`
- 接送时间：`pickupTime`
- 上车地址：`pickupAddress`
- 下车地址：`dropoffAddress`
- 酒店名称：`hotelName`
- 酒店地址：`hotelAddress`
- 航班/车次/船名：`flightNo`
- 乘客人数：`passengerCount`
- 行李信息：`luggageInfo`
- 路线是否清楚：`routeClear`
- 数据来源：`source`
- 原始数据：`rawData`
- 创建时间：`createdAt`
- 更新时间：`updatedAt`

知识点：

- 实体类承载核心业务数据。
- 当前没有使用 JPA 注解，因为第一版是内存存储。
- 后续接 MySQL 时可以新增 Entity 或在该类上增加持久化注解。

## 9. DTO 是什么

DTO 是 Data Transfer Object，即接口传输对象。

本项目中 DTO 包括：

- `OrderQueryRequest`：接收查询条件。
- `PageResult`：返回分页结果。
- `OrderStatistics`：返回统计数据。
- `DailyOrderCount`：返回每日订单数量。
- `OrderValidationResult`：返回缺失字段和异常原因。

为什么需要 DTO：

- 避免 Controller 里散落大量参数。
- 让接口返回结构清晰。
- 前端更容易渲染数据。
- 后续 Excel 导出也能复用。

## 10. Controller 层

文件：

```text
controller/OrderController.java
```

Controller 负责接收 HTTP 请求，不直接写复杂业务逻辑。

已实现接口：

```text
GET  /api/health
POST /api/orders/import
GET  /api/orders
GET  /api/orders/{orderNo}
GET  /api/orders/{orderNo}/validation
GET  /api/orders/statistics
GET  /api/orders/export-source
```

知识点：

- `@RestController`：返回 JSON。
- `@RequestMapping("/api")`：统一接口前缀。
- `@GetMapping`：GET 查询接口。
- `@PostMapping`：POST 导入接口。
- `@PathVariable`：读取 URL 中的订单号。
- `@RequestBody`：读取 JSON 请求体。

## 11. Service 层

Service 层负责业务逻辑。

本项目有两个核心 Service：

```text
OrderService
OrderValidationService
```

`OrderService` 负责：

- 导入订单。
- 查询订单列表。
- 查询订单详情。
- 查询统计信息。
- 给 Excel 导出提供数据源。

`OrderValidationService` 负责：

- 判断手机号是否缺失。
- 判断地址是否缺失。
- 判断行程是否异常。
- 判断接送订单是否缺少关键字段。

这样拆分的好处：

- 查询逻辑和校验逻辑分离。
- 统计接口可以复用校验逻辑。
- 后续规则扩展更容易。

## 12. Repository 层

接口：

```text
OrderRepository
```

实现：

```text
InMemoryOrderRepository
```

Repository 负责数据存储和读取。

当前使用：

```java
ConcurrentHashMap<String, TravelOrder>
```

知识点：

- 用订单号作为 key。
- 查询单条订单速度快。
- `ConcurrentHashMap` 比普通 `HashMap` 更适合 Web 服务并发场景。

为什么先抽接口：

```java
public interface OrderRepository
```

因为后续从内存切换到 MySQL 时，只要新增一个 MySQL 实现类即可。

## 13. 统一 JSON 返回

文件：

```text
common/ApiResponse.java
```

统一格式：

```json
{
  "success": true,
  "code": "OK",
  "message": "查询成功",
  "data": {}
}
```

好处：

- 前端统一判断 `success`。
- 前端根据 `code` 做不同提示。
- `message` 可直接显示给运营人员。
- `data` 承载真实业务数据。

## 14. 统一错误码

文件：

```text
common/ErrorCode.java
```

错误码包括：

- `PARAM_REQUIRED`：必填参数为空。
- `ORDER_NOT_FOUND`：订单不存在。
- `DATA_READ_FAILED`：数据读取失败。
- `VALIDATION_FAILED`：参数格式错误。
- `INTERNAL_ERROR`：系统异常。

知识点：

统一错误码能让前端和后端约定清楚，而不是只靠文字判断错误类型。

## 15. 全局异常处理

文件：

```text
exception/GlobalExceptionHandler.java
```

核心注解：

```java
@RestControllerAdvice
@ExceptionHandler
```

作用：

- 统一捕获业务异常。
- 统一捕获参数校验异常。
- 统一捕获未预期异常。
- 返回友好的 JSON，不暴露后端堆栈信息。

例如订单不存在：

```json
{
  "success": false,
  "code": "ORDER_NOT_FOUND",
  "message": "未找到对应订单，请检查订单编号",
  "data": null
}
```

## 16. 查询接口怎么工作

接口：

```text
GET /api/orders
```

支持参数：

- `orderNo`
- `phone`
- `travelDate`
- `dateFrom`
- `dateTo`
- `orderType`
- `status`
- `page`
- `size`

示例：

```text
GET /api/orders?orderNo=BR-1417501241
GET /api/orders?phone=13800000000
GET /api/orders?travelDate=2026-07-04
GET /api/orders?dateFrom=2026-07-04&dateTo=2026-07-05
```

业务逻辑：

1. 从仓库读取全部订单。
2. 根据查询条件过滤。
3. 根据 `page` 和 `size` 分页。
4. 返回 `PageResult`。

## 17. 统计接口怎么工作

接口：

```text
GET /api/orders/statistics
```

统计内容：

- 订单总量。
- 缺失手机号数量。
- 缺失地址数量。
- 行程异常数量。
- 每日订单总量。

关键设计：

统计接口不单独写死规则，而是复用：

```text
OrderValidationService
```

这样缺失字段规则一旦调整，统计结果也会同步变化。

## 18. Excel 数据源接口

接口：

```text
GET /api/orders/export-source
```

作用：

给 Excel 导出模块提供统一数据源。

它复用查询逻辑，只是默认一次性返回更多数据。

好处：

- 前端列表和 Excel 导出使用同一套数据过滤规则。
- 不需要 Excel 模块自己再写一套查询逻辑。

## 19. 代码注释策略

这次后端 Java 代码按“教学交接版”写法，基本每行都有中文注释。

这样做的目的：

- 方便学习 Spring Boot。
- 方便非后端人员理解。
- 方便后续交接。

注意：

- 工程成熟后，通常不需要每一行都注释。
- 但这个项目目前以学习和交接为目标，所以详细注释是有价值的。
- 后续改代码时，要同步维护注释，避免注释和代码不一致。

## 20. Git 和 Gitee 知识点

项目已经初始化 Git，并推送到 Gitee：

```text
https://gitee.com/liu-haixinha/missing-fields.git
```

`.gitignore` 排除了：

- `.agents/`
- `.codex/`
- `.vscode/`
- `work/`
- `target/`
- `*.zip`
- `*.class`
- 日志和临时文件

这些文件不应该提交到仓库。

提交文档和代码时常用命令：

```powershell
git status --short
git add .
git commit -m "Add learning notes"
git push
```

如果涉及敏感信息，一定先检查：

```powershell
git diff --cached
```

## 21. 当前项目的安全边界

必须遵守：

- 不提交账号密码。
- 不提交 Cookie。
- 不提交 Token。
- 不提交 Gitee 私人令牌。
- 不保存 ReoTrip 登录态。
- 不修改 ReoTrip 线上订单。
- 只读取和整理订单信息。

## 22. 运行方式

前端页面：

```text
outputs/three-panel-page.html
```

后端接口：

```powershell
cd backend
mvn spring-boot:run
```

注意：

当前设备需要安装 Maven，或者后续补充 Maven Wrapper。

## 23. 后续扩展方向

可以继续做：

1. 接入 MySQL，把内存存储替换为持久化存储。
2. 增加 Excel 导出文件生成接口。
3. 增加爬虫导入自动化。
4. 让 HTML 页面调用 Spring Boot 接口，而不是读取内嵌数组。
5. 增加登录和权限控制。
6. 增加订单异常处理状态。
7. 增加操作日志。
8. 增加单元测试和接口测试。

## 24. 学习路线建议

建议按这个顺序学习：

1. HTML 页面结构。
2. CSS 三栏布局和滚动区域。
3. JavaScript 数据渲染。
4. JavaScript 缺失字段判断。
5. JavaScript 邮件生成和复制。
6. Spring Boot Controller。
7. DTO 和实体类。
8. Service 业务层。
9. Repository 数据层。
10. 统一 JSON 返回。
11. 全局异常处理。
12. Git/Gitee 提交流程。
13. 内存存储切换 MySQL。

这份项目可以作为一个完整小项目来练习：前端静态页面、后端接口、业务规则、文档交付和 Git 协作都覆盖到了。
