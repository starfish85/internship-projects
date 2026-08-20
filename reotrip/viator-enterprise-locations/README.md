# Viator 企业位置核对

核对 Reotrip 在 Viator 已上线产品，以及 Tripadvisor UK 上的透传和企业位置展示。真正采集前必须先在本机 Chrome 登录 Viator 后台。

## 第一次（已完成）

只搭了目录和 skill，**没有访问网站**。

## 你怎么发指令

在本项目目录打开 Grok，然后说其中一句即可：

- `/viator-enterprise-locations` — 全量采集（Viator + Tripadvisor + 出表）
- `/viator-enterprise-locations viator` — 只更新 Viator 已上线产品和评分
- `/viator-enterprise-locations tripadvisor` — 用已有 Viator 列表核透传和企业位置
- `/viator-enterprise-locations resume` — 从上次中断处继续
- `/viator-enterprise-locations compare` — 对比最近两个采集日
- `/viator-enterprise-locations compare 20260820 20260827` — 按指定日期对比

采集前请先登录：Grok 会拉起独立 Chrome（用户数据在 `browser-profile/`，不影响你日常浏览器）。在弹出窗口登录 `https://supplier.viator.com/products/`，回到对话回复「已登录」。

## 产出

| 位置 | 内容 |
|---|---|
| `data/viator/` | Viator 视角 xlsx |
| `data/tripadvisor/` | 企业位置 + 其下产品 xlsx |
| `data/comparisons/` | 按日期对比 xlsx |
| `data/raw/<run_id>/` | snapshot / checkpoint / 日志 |

## 约定

- 约 130 条已上线产品；节奏慢，避免风控。
- 透传：Tripadvisor 页面上的 product code 与后台 **完全一致**。
- 企业位置：完整列表，不按名称是否叫 Reotrip 过滤；每条都要评分、链接、其下产品数量、产品明细和产品评分。
- 对比按日期；同一天多次采集取当天最晚一份。
