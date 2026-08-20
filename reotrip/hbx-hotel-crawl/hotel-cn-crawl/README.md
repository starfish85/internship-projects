# HBX 中国大陆酒店产品爬取

**项目目录**: `/Users/mac/hbx产品爬取/hotel-cn-crawl`  
**目标站点**: https://app-bedsonline.gta-travel.cn/main  
**外接盘数据根**: `/Volumes/CodexArchive/hbx-hotel-crawl`  
**规模预估**: 约 41 万酒店级记录（需分城市 / 分批 / 断点续爬）

---

## 这是做什么的

从 Bedsonline（HBX 中国区前端）抓取 **中国大陆酒店** 相关产品信息，包括：

- 酒店基础信息（尽量同时覆盖中文 / 英文）
- 搜索/可售相关字段
- 日历价（按入住窗口滚动抓取）

数据**分期分批**写入外接盘 `CodexArchive`，本地只保留脚本、配置、探针结果与日志镜像。

---

## 目录结构

```text
hotel-cn-crawl/
├── README.md                 # 本文件（项目说明）
├── docs/
│   ├── 项目说明.md            # 背景、目标、架构、风险
│   ├── 使用说明.md            # 最短上手步骤
│   └── 爬取策略.md            # 41万规模分期策略与字段匹配
├── config/defaults.json      # 站点 / 盘符 / 批大小等默认配置
├── lib/                      # 公共库（Chrome 连接、路径）
├── scripts/                  # 可执行脚本
│   ├── launch-chrome-debug.sh
│   ├── probe-session.mjs
│   ├── probe-hotel-ui.mjs
│   ├── crawl-hotels-batch.mjs
│   ├── monitor-external-disk.sh
│   └── install-disk-monitor-cron.sh
├── browser-profile/          # 自动化专用 Chrome profile（与日常 Chrome 隔离）
├── data/                     # 本地探针 JSON
├── reports/                  # 导出报表（预留）
└── artifacts/logs|screenshots
```

外接盘：

```text
/Volumes/CodexArchive/hbx-hotel-crawl/
├── batches/     # 正式分批数据 CN/by-city/...
├── state/       # 断点 / plan / checkpoint
├── probe/       # 探测产物
├── monitor/     # 磁盘温度与健康
└── logs/
```

---

## 技术路线（先探再爬）

1. **控制本机 Google Chrome**（Playwright `channel: chrome` 或 CDP `9222`）
2. 登录态以 `localStorage.darwinToken` 为准（不是“页面看起来已登录”）
3. 在 UI 中切入 **酒店** 搜索，拦截 `webapi.gta-travel.cn` 相关 XHR
4. 根据真实 API 形状写正式分页爬虫（城市 → 酒店列表 → 详情中英文 → 日历价）
5. 每批 flush 到外接盘；失败可从 `state/` 续跑

历史账号探测曾出现 **API 401**（凭据被拒绝）。优先：

- 在调试 Chrome 窗口用浏览器已存密码登录一次；或
- 设置环境变量 `BEDSONLINE_USERNAME` / `BEDSONLINE_PASSWORD` 后自动填表

---

## 正式流水线（推荐）

详见 **`docs/PIPELINE.md`**。

```bash
cd "/Users/mac/hbx产品爬取/hotel-cn-crawl"
npm install
npm run disk:monitor
npm run chrome:launch          # 调试 Chrome，可用已存密码登录

# Phase1 北上广深酒店清单 → 外接盘分区域文件夹
npm run pipeline:list -- --tier=1

# 日历价探针
npm run pipeline:probe-calendar -- --dest=PEK

# 产品信息 xlsx（试跑）
npm run pipeline:products -- --dest=PEK --limit=20

# 日历价（探针 HIT 后）
npm run pipeline:calendar -- --dest=PEK --limit=5
```

数据根：`/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/`  
本地镜像：`hotel-data/`

更细步骤见 `docs/使用说明.md`、`docs/PIPELINE.md`。

---

## 与仓库其他目录的关系

| 路径 | 关系 |
|------|------|
| `../workspaces/bedsonline-*` | 历史 **活动 Activities** 提取，可参考登录与落盘风格 |
| `../future/hotel-product-crawl` | 早期探测草稿；**正式框架以本目录为准** |
| `../docs/ROADMAP-hotel-product-crawl.md` | 早期规划，实现已迁移到本项目 |
| `../related/reotaxis-hbx-port` | 港口接送成本，非酒店产品 |

---

## 合规与安全

- 仅限授权内部账号与用途
- 不要把账号密码提交到 git
- 大规模抓取注意限速，避免影响供应商侧配额
- 外接盘满载/过热时脚本会写 `alerts`（见 monitor JSON）
