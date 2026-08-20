# AGENTS.md

## 项目概览

本项目是一个用于 ReoTrip 订单运营处理的本地静态 HTML 工具，核心目标是：

- 展示已整理的 ReoTrip 订单信息。
- 根据订单字段和规则识别缺失字段。
- 根据当前缺失字段生成简洁礼貌的英文询问邮件。
- 支持复制邮件内容，方便运营同事直接发送。

当前项目不需要后端服务、不需要安装依赖，直接用浏览器打开 HTML 文件即可运行。

## 重要安全边界

- 项目只允许读取和整理 ReoTrip 系统信息。
- 不允许修改 ReoTrip 系统内任何订单。
- 不要在代码、截图、文档或提交记录中暴露 API Key、账号密码、Cookie、Token、Gitee 私人令牌等敏感信息。
- 不要把 ReoTrip 登录态或原始敏感抓取文件提交进仓库。
- 无法判断订单类型或字段含义时，标记为 `需人工确认 / Manual review required`，不要猜测。

## 主要文件

```text
.
├─ README.md
├─ LEARNING_NOTES.md
├─ .gitignore
├─ AGENTS.md
├─ backend/
│  ├─ pom.xml
│  ├─ README.md
│  └─ src/main/java/com/reotrip/orders/
└─ outputs/
   ├─ three-panel-page.html
   ├─ project-handoff.md
   ├─ deployment-path.md
   ├─ user-guide.md
   └─ development-standards.md
```

文件说明：

- `README.md`：Gitee 首页入口文档，说明项目用途、快速开始、目录结构和安全要求。
- `LEARNING_NOTES.md`：完整学习笔记，说明 HTML 页面和 Spring Boot 后端是如何做出来的，以及涉及的知识点。
- `outputs/three-panel-page.html`：最终可运行页面，包含 HTML、CSS、JavaScript 和内嵌订单数据。
- `outputs/project-handoff.md`：项目交接文档，记录项目目标、功能和规则。
- `outputs/deployment-path.md`：执行部署路径，记录其他设备如何复用项目。
- `outputs/user-guide.md`：使用说明文档，面向实际操作人员。
- `outputs/development-standards.md`：开发规范，记录代码注释、命名、提交和交付规范。
- `.gitignore`：排除 Codex 元数据、原始工作文件、压缩包、日志和临时文件。
- `AGENTS.md`：给后续 Codex/协作者的项目说明。
- `backend/`：Spring Boot 后端接口模块，提供订单导入、查询、统计和 Excel 数据源接口。
- `backend/README.md`：后端接口模块启动方式和接口清单。

## 不应提交的内容

`.gitignore` 已排除：

```text
.agents/
.codex/
work/
*.zip
*.log
*.tmp
*.temp
```

其中：

- `.agents/`、`.codex/` 是本地 Codex 工作元数据。
- `work/` 可能包含原始导入页面或临时资料，不应进入仓库。
- `*.zip` 是可再生成的交付包，不作为源码提交。

## 运行方式

直接打开：

```text
outputs/three-panel-page.html
```

浏览器地址可以使用：

```text
file:///C:/Users/starfish/Documents/Codex/2026-07-06/https-a-reotrip-com-v-orders/outputs/three-panel-page.html
```

如果项目在其他设备或目录中，打开该设备上的 `outputs/three-panel-page.html` 即可。

## 页面功能结构

页面是横向三栏布局：

- 左侧：订单信息、日期下拉、统计筛选、订单列表。
- 中间：当前订单缺失字段。
- 右侧：英文邮件生成按钮、复制邮件按钮、邮件内容。

左侧订单卡片当前展示运营常用字段：

- 订单号
- 客人
- 类型
- 产品
- 套餐
- 接送时间或出行时间
- 上车地址
- 下车地址
- 人数

金额和供应商已从左侧列表卡片移除，但仍保留在订单详情弹窗中。

点击订单卡片会：

- 选中该订单。
- 刷新中间缺失字段。
- 刷新右侧邮件生成对象。
- 弹出订单详情窗口。

## 核心 JavaScript 位置

核心逻辑都在 `outputs/three-panel-page.html` 中：

- `orders`：内嵌订单数据数组。
- `getMissingFields(order)`：根据订单字段和规则计算缺失字段。
- `renderOrders()`：渲染左侧订单列表。
- `renderMissing()`：渲染中间缺失字段。
- `generateEmail()`：根据当前缺失字段生成英文邮件。
- `copyEmail()`：复制邮件内容。
- `renderDateSelect()`：渲染日期下拉。
- `openOrderModal(index)`：打开订单详情弹窗。

修改页面时优先在这些函数附近定位。

## 后端模块说明

后端模块路径：

```text
backend/
```

技术栈：

- Spring Boot 3.3.7
- Java 17 目标版本
- 当前实现为内存存储
- 后续可通过实现 `OrderRepository` 接口切换 MySQL

核心包结构：

```text
backend/src/main/java/com/reotrip/orders/
├─ controller/   接口层
├─ service/      业务层
├─ repository/   存储层
├─ model/        实体类
├─ dto/          请求和返回对象
├─ exception/    统一异常处理
└─ common/       统一返回和错误码
```

已实现接口：

- `POST /api/orders/import`
- `GET /api/orders`
- `GET /api/orders/{orderNo}`
- `GET /api/orders/{orderNo}/validation`
- `GET /api/orders/statistics`
- `GET /api/orders/export-source`
- `GET /api/health`

当前 Java 代码按用户要求添加了详细中文注释，后续修改时也应保持中文注释风格。

## ReoTrip 数据读取流程

读取 ReoTrip 订单前，先在 ReoTrip 系统内完成筛选：

1. 打开订单列表，例如：

   ```text
   https://a.reotrip.com/v/orders?travel_date_from=2026-07-04
   ```

2. 在 ReoTrip 页面里筛选 `接送订单`。
3. 确认浏览器地址栏 URL 已包含筛选条件。
4. 使用筛选后的 URL/link 读取订单列表和详情。
5. 将结果整理进本地页面的 `orders` 数组。

这样导入的数据默认都是接送订单，缺失字段检查可以优先按接送规则执行。

仍需保留轻量兜底：如果数据中混入无法确认类型的订单，应标记为 `需人工确认 / Manual review required`。

## 订单数据结构

`orders` 数组中的常用字段：

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
  pickup: "上车地址",
  dropoff: "下车地址",
  hotelNameEn: "酒店英文全名",
  hotelAddress: "酒店完整地址",
  luggageQuantity: "行李数量",
  luggageSize: "行李尺寸",
  luggageType: "行李类型",
  routeClear: true,
  hubRelated: true,
  flight: "航班/列车/船名编号",
  emailVerified: true,
  noteNeedsConfirm: false
}
```

字段可以为空。空字段会在页面中按规则判断是否为缺失信息。

## 接送订单缺失规则

接送订单重点检查：

- 出行日期 / Travel date
- 接送时间 / Pickup time
- 上车地址 / Pickup location
- 下车地址 / Drop-off location
- 酒店英文全名和具体地址 / Hotel full English name and full address
- 人数 / Passenger count
- 行李配置 / Luggage details
- 航班 / 列车 / 船名编号 / Flight, train, or ferry number/name

规则补充：

- 订单已有日期但缺少时间时，只询问具体接送时间。
- 酒店只有中文名、简称或模糊地址时，仍视为不完整。
- 接送线路需要明确上车点和下车点。
- 行李配置至少包含数量、尺寸和类型。
- 交通枢纽相关订单必须收集对应航班、列车或船名编号。

## 邮件生成规则

英文邮件应保持：

- 礼貌
- 简洁
- 清晰
- 只询问当前缺失字段
- 不重复询问订单中已有的信息
- 包含订单号，便于客户识别

行李缺失字段在邮件中会展开为：

- Luggage details
- Number of pieces
- Approximate sizes
- Types

## 文档维护要求

如果修改了页面功能、数据来源流程、字段规则或交付方式，需要同步更新：

- `README.md`
- `outputs/project-handoff.md`
- `outputs/deployment-path.md`
- `outputs/user-guide.md`
- `outputs/development-standards.md`
- `backend/README.md`
- 本文件 `AGENTS.md`

交付 ZIP 需要重新生成，但 ZIP 文件不提交 Git。

## 代码注释与提交规范

统一规范记录在：

```text
outputs/development-standards.md
```

关键要求：

- 注释使用中文为主，只在复杂规则、字段映射、邮件生成兜底逻辑处添加。
- 不给简单 DOM 赋值、直观变量声明添加重复注释。
- 提交信息使用简短英文，例如 `Add ...`、`Update ...`、`Fix ...`、`Document ...`。
- 每次提交尽量只包含一类变化：页面功能、字段规则、文档或交付配置。

## Git 与 Gitee

Gitee 仓库：

```text
https://gitee.com/liu-haixinha/missing-fields.git
```

常用提交命令：

```powershell
git status --short
git add README.md AGENTS.md backend outputs/three-panel-page.html outputs/project-handoff.md outputs/deployment-path.md outputs/user-guide.md outputs/development-standards.md
git commit -m "Update ReoTrip order helper"
git push
```

如果只是更新文档，按实际修改文件 `git add` 即可。

## 交付包

当前交付包通常生成在：

```text
outputs/reotrip-missing-fields-project-delivery.zip
```

建议交付包包含：

- `.gitignore`
- `README.md`
- `AGENTS.md`
- `backend/`
- `outputs/three-panel-page.html`
- `outputs/project-handoff.md`
- `outputs/deployment-path.md`
- `outputs/user-guide.md`
- `outputs/development-standards.md`

不要包含：

- `.git/`
- `.agents/`
- `.codex/`
- `work/`
- 旧 ZIP 文件
- 任何登录凭证或敏感信息
