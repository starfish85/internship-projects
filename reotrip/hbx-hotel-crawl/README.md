# HBX / Bedsonline 信息提取 · 跨设备交接包

**打包设备**: macOS 本机 `mac`（用户 `/Users/mac`）  
**打包时间**: 2026-07-27  
**外接盘路径**: `/Volumes/CodexArchive/hbx-info-extract/`  
**用途**:
1. 让其他设备识别并接手现有 HBX/Bedsonline **活动(Activities) 信息提取**流程  
2. 在此基础上 **新增 HBX 酒店产品信息爬取**

---

## 项目架构

```text
hbx-info-extract/
├── README.md                          # 本文件（总览 + 架构）
├── docs/                              # 流程说明、工单、设备清单入口
│   ├── bedsonline-codex-transfer-playbook-2026-05-13.md
│   ├── HBX订单号规则梳理_工单3.md
│   ├── DEVICE_AND_SOURCE_INVENTORY.md # 本机已打包 vs mark 机缺失
│   └── ROADMAP-hotel-product-crawl.md # 后续酒店产品爬取规划
├── workspaces/                        # 本机已跑通过的提取工作区（含脚本/数据/profile）
│   ├── bedsonline-2026-05-14/         # 登录探测 + 北京活动提取
│   └── bedsonline-2026-05-31/         # 北京/新加坡 live 活动提取
├── related/                           # 相关但非「全站活动提取」主链路
│   ├── reotaxis-hbx-port/             # 港口接送供应商成本 / session（reotaxis-web）
│   ├── reotransfer-hbx-port/          # 同系 reotransfer-web 副本
│   └── mail-and-ops-samples/          # 邮件 HBX 样例、运营周报中的 Bedsonline 记录
├── missing-from-mark-device/          # mark 机上有、本包缺失的清单与占位
│   └── README.md
├── future/
│   └── hotel-product-crawl/           # 早期探测草稿（请改用 hotel-cn-crawl）
└── hotel-cn-crawl/                    # ★ 正式：中国大陆酒店产品爬取（中英+日历价）
    ├── README.md
    ├── docs/
    ├── scripts/
    └── config/
```

---

## 快速理解：本包里有什么

| 层级 | 内容 | 能否直接跑提取 |
|------|------|----------------|
| `docs/` 交接手册 | 完整流程说明（登录 → token → coverage → crawl） | 说明文档 |
| `workspaces/*` | 本机脚本、历史 JSON/CSV、浏览器 profile | **部分可跑**（城市活动脚本） |
| `related/reotaxis*` | 港口 transfer 成本快照与 session 刷新 | 另一条业务线 |
| `missing-from-mark-device/` | **核心 skill 不在本包** | 见清单，需从 mark 机补齐 |

**关键缺口（请先读）**:  
完整 Codex skill `bedsonline-extract`（`verify-login` / `discover-coverage` / `crawl-countries` 等）位于 **mark 设备**  
`/Users/mark/.codex/skills/bedsonline-extract/`，**本机当时未安装**，本包只收录了手册中的路径说明与本机替代工作区。  
详见 `docs/DEVICE_AND_SOURCE_INVENTORY.md`。

---

## 其他设备接手建议顺序

1. 读 `docs/bedsonline-codex-transfer-playbook-2026-05-13.md`  
2. 读 `docs/DEVICE_AND_SOURCE_INVENTORY.md`，确认缺哪些 mark 机文件  
3. 从 mark 机补齐 `missing-from-mark-device/` 清单中的 skill + 主工作目录（若能拿到）  
4. 用 `workspaces/bedsonline-2026-05-31/scripts/run-city-activities.mjs` 理解本机已验证的「城市活动」提取模式  
5. 新酒店爬取在 **`hotel-cn-crawl/`** 落地（说明见该目录 README / docs），**不要直接改历史 workspaces**

### 环境依赖（摘自 playbook）

- Node.js + npm + Playwright（Chromium）
- Python 3 + openpyxl（统计/打包脚本若从 mark skill 补齐后需要）

```bash
cd <本包>/workspaces/bedsonline-2026-05-31
npm init -y
npm install --save-dev playwright
npx playwright install chromium
```

### 登录态注意

- 可用条件不是「页面看起来已登录」，而是 `localStorage.darwinToken` 存在且 API 探测成功  
- 本包内 `browser-profile/` 可能已过期，到新设备后务必重新验证  
- playbook 内含账号信息，**仅限内部授权使用，勿提交 git / 勿公开传播**

---

## 本包数据来源设备

| 代号 | 系统用户路径 | 角色 |
|------|--------------|------|
| **mac（本机）** | `/Users/mac` | 本次打包源；有 5/14、5/31 工作区与 reotaxis HBX 脚本 |
| **mark** | `/Users/mark` | 原始 skill 与主工作流所在设备；**核心 skill 未在本机** |

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-07-27 | 首次从 mac 机整理到 CodexArchive 外接盘；含本机全量相关副本 + mark 缺失清单 + 酒店爬取占位 |
