# ReoTrip 订单缺失字段助手

## 项目简介

这是一个用于 ReoTrip 订单运营处理的本地静态 HTML 工具。

它可以展示本地整理后的订单数据，根据接送订单规则识别缺失字段，并生成只询问缺失信息的英文邮件，方便运营同事复制后发送给客户。

项目不会连接 ReoTrip 写接口，也不会修改 ReoTrip 系统内任何订单。

## 快速开始

直接打开：

```text
outputs/three-panel-page.html
```

浏览器地址示例：

```text
file:///C:/Users/starfish/Documents/Codex/2026-07-06/https-a-reotrip-com-v-orders/outputs/three-panel-page.html
```

本项目是纯静态页面，不需要安装依赖，不需要启动服务。

## 目录结构

```text
.
├─ README.md
├─ AGENTS.md
├─ .gitignore
├─ backend/
│  ├─ pom.xml
│  ├─ README.md
│  └─ src/main/java/com/reotrip/orders/
│     ├─ controller/
│     ├─ service/
│     ├─ repository/
│     ├─ model/
│     ├─ dto/
│     └─ exception/
└─ outputs/
   ├─ three-panel-page.html
   ├─ project-handoff.md
   ├─ deployment-path.md
   ├─ user-guide.md
   └─ development-standards.md
```

## 核心功能

- 日期切换：按订单出行日期查看订单。
- 订单筛选：可查看全部、已确认、待补充订单。
- 订单详情：点击订单卡片弹出完整详情。
- 缺失字段：根据订单字段和接送规则自动计算缺失项。
- 邮件生成：只询问当前缺失字段，不重复询问已有信息。
- 邮件复制：一键复制英文邮件内容。

## ReoTrip 数据读取流程

读取 ReoTrip 订单前，先在 ReoTrip 系统完成筛选：

1. 打开 ReoTrip 订单列表。
2. 筛选 `接送订单`。
3. 确认浏览器 URL 已包含筛选条件。
4. 使用筛选后的 URL 读取订单列表和详情。
5. 将结果整理进 `outputs/three-panel-page.html` 的 `orders` 数组。

这样导入后的订单默认是接送订单，页面会优先按接送规则检查缺失字段。

如果出现无法确认类型的订单，标记为：

```text
需人工确认 / Manual review required
```

## 重要文档

- `outputs/user-guide.md`：面向使用者的操作说明。
- `outputs/deployment-path.md`：其他设备复用和部署路径。
- `outputs/project-handoff.md`：项目交接记录。
- `outputs/development-standards.md`：代码注释、提交和交付规范。
- `AGENTS.md`：给后续 Codex/协作者的项目上下文。
- `backend/README.md`：Spring Boot 后端接口模块说明。
- `LEARNING_NOTES.md`：完整学习笔记，覆盖 HTML 页面和 Spring Boot 后端的做法与知识点。

## 后端接口模块

后端模块位于：

```text
backend/
```

当前使用 Spring Boot + 内存存储实现，提供：

- `POST /api/orders/import`：导入爬虫抓取订单。
- `GET /api/orders`：按订单编号、手机号、行程日期等条件查询订单。
- `GET /api/orders/{orderNo}`：查询订单详情。
- `GET /api/orders/{orderNo}/validation`：查询单条订单缺失字段和异常原因。
- `GET /api/orders/statistics`：统计缺失手机号、缺失地址、行程异常和每日订单总量。
- `GET /api/orders/export-source`：给 Excel 导出模块提供数据源。

启动方式：

```powershell
cd backend
mvn spring-boot:run
```

如果本机没有 Maven，需要先安装 Maven，或后续为模块补充 Maven Wrapper。

## 安全要求

- 不提交 API Key、账号密码、Cookie、Token、私人令牌。
- 不保存 ReoTrip 登录态。
- 不提交原始抓取页面、临时工作文件或压缩包。
- 不修改 ReoTrip 线上订单。

## Gitee

仓库地址：

```text
https://gitee.com/liu-haixinha/missing-fields.git
```

常用提交：

```powershell
git status --short
git add README.md AGENTS.md LEARNING_NOTES.md backend outputs/three-panel-page.html outputs/project-handoff.md outputs/deployment-path.md outputs/user-guide.md outputs/development-standards.md
git commit -m "Update project documentation"
git push
```
