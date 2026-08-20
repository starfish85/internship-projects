# 设备与源文件清单（mac vs mark）

打包时间: 2026-07-27  
对照依据: 本机路径扫描 + `docs/bedsonline-codex-transfer-playbook-2026-05-13.md` 中记录的 mark 路径。

---

## 1. 设备对照

| 设备代号 | 本包中的称呼 | 典型绝对路径前缀 | 本次是否可直接复制 |
|----------|--------------|------------------|--------------------|
| **mac** | 本机 / 当前打包机 | `/Users/mac/...` | ✅ 已复制进本包 |
| **mark** | 原 skill 所在机 | `/Users/mark/...` | ❌ 当时不在本机磁盘上，**仅列清单** |

> 说明：playbook 写于 2026-05-13，面向「从 mark 交接给另一台 Codex」。  
> 本包是 2026-07-27 在 **mac** 上二次整理，因此 **mark 独有文件需要人工从 mark 机再拷一次** 才能补齐「完整主链路」。

---

## 2. 已打进本包（来源：mac）

### 2.1 文档

| 原始路径（mac） | 本包路径 |
|-----------------|----------|
| `/Users/mac/Downloads/bedsonline-codex-transfer-playbook-2026-05-13.md` | `docs/bedsonline-codex-transfer-playbook-2026-05-13.md` |
| `/Users/mac/Downloads/AI_Voice_Receptionist_Handover/AI语音接线员_交接包/工单存档/本机ClaudeCode_任务工单3_HBX订单号规则梳理.md` | `docs/HBX订单号规则梳理_工单3.md` |

### 2.2 活动提取工作区

| 原始路径（mac） | 本包路径 | 内容摘要 |
|-----------------|----------|----------|
| `/Users/mac/Documents/Codex/2026-05-14/files-mentioned-by-the-user-bedsonline/` | `workspaces/bedsonline-2026-05-14/` | `bedsonline-login-probe.mjs`、`extract-beijing-activities.mjs`、北京活动 JSON/CSV、browser-profile |
| `/Users/mac/Documents/Codex/2026-05-31/files-mentioned-by-the-user-bedsonline/` | `workspaces/bedsonline-2026-05-31/` | `run-city-activities.mjs`、北京/新加坡 live 数据与报告、browser-profile |

> 复制时已排除各目录内 `node_modules/`（可重建）与 `.DS_Store`。

### 2.3 相关：港口 transfer 成本（非全站活动提取）

| 原始路径（mac） | 本包路径 |
|-----------------|----------|
| `/Users/mac/cowork/repos/reotaxis-web/scripts/*hbx*` 与 `scripts/hbx-refresh/` | `related/reotaxis-hbx-port/scripts/` |
| `/Users/mac/cowork/repos/reotaxis-web/data/hbx*` 及 supplier-cost 相关 | `related/reotaxis-hbx-port/data/` |
| `/Users/mac/cowork/repos/reotransfer-web/` 同源 HBX 脚本与 data | `related/reotransfer-hbx-port/` |

### 2.4 相关：邮件 / 运营旁证

| 原始路径（mac） | 本包路径 |
|-----------------|----------|
| `~/mail generate draft/feishu-cn-mail-app/outputs/feishu_mail_today/*hbx*` | `related/mail-and-ops-samples/feishu-mail/` |
| `~/week report/**/*bedsonline*` | `related/mail-and-ops-samples/week-report-bedsonline/` |

### 2.5 本机明确「没有」的

| 项 | 说明 |
|----|------|
| `~/.codex/skills/bedsonline-extract` | mac 上 `~/.codex/skills/` 仅有 `tripadvisor-viator-extraction` 等，**无 bedsonline-extract** |
| `/Users/mac/Documents/Codex/2026-04-26/bedsonline-skills` | 不存在（playbook 写的是 mark 路径） |
| `/Users/mac/codex-workspace/browser-profiles/bedsonline` | 不存在 |

---

## 3. 仅在 mark 设备上（本包缺失 · 需补齐）

以下路径均来自 playbook，前缀为 **`/Users/mark`**。  
在本包中的占位说明见 `missing-from-mark-device/README.md`。

### 3.1 必拷（完整主链路）

| mark 路径 | 类型 | 作用 |
|-----------|------|------|
| `/Users/mark/.codex/skills/bedsonline-extract/` | Codex Skill 整目录 | **核心**。含 `SKILL.md`、`references/workflow-notes.md`、脚本入口 |
| `/Users/mark/.codex/skills/bedsonline-extract/SKILL.md` | 入口文档 | skill 说明 |
| `/Users/mark/.codex/skills/bedsonline-extract/references/workflow-notes.md` | 工作流笔记 | 细节与坑 |
| `/Users/mark/.codex/skills/bedsonline-extract/scripts/verify-login.mjs` | 脚本 | 登录校验 |
| `/Users/mark/.codex/skills/bedsonline-extract/scripts/discover-coverage.mjs` | 脚本 | 国家/城市覆盖与产品数探测 |
| `/Users/mark/.codex/skills/bedsonline-extract/scripts/crawl-countries.mjs` | 脚本 | 国家维度明细爬取 |
| `/Users/mark/.codex/skills/bedsonline-extract/scripts/build-statistics.py` | 脚本 | 统计 |
| `/Users/mark/.codex/skills/bedsonline-extract/scripts/build-gpt-pro-package.py` | 脚本 | GPT Pro 交付打包 |
| `/Users/mark/Documents/Codex/2026-04-26/bedsonline-skills/` | 主工作目录 | playbook 认定的主 workdir |
| `/Users/mark/Documents/Codex/2026-04-23/mac-mini-codex-mac-mini-codex/bedsonline-sea-complete/` | 历史基线 | 旧 CJK/SEA 完整结果 |
| `/Users/mark/Documents/Codex/2026-05-13/bedsonline-md-b-bedsonline-skills` | 接管整理目录 | 2026-05-13 交接整理 |

### 3.2 建议拷

| mark 路径 | 类型 | 作用 |
|-----------|------|------|
| `/Users/mark/codex-workspace/browser-profiles/bedsonline/` | 浏览器持久化 profile | 可能继承登录态；仍需验证 `darwinToken` |

### 3.3 建议补齐后的本包落点（约定）

从 mark 机拷回外接盘时，请按下列结构放入，避免覆盖 mac 已有 workspaces：

```text
hbx-info-extract/
  missing-from-mark-device/
    bedsonline-extract/                 # ← skill 整目录
    workspaces/
      bedsonline-skills-2026-04-26/     # ← 主 workdir
      bedsonline-sea-complete-2026-04-23/
      bedsonline-md-b-2026-05-13/
    browser-profiles/
      bedsonline/                       # ← mark profile
    RECEIPT.md                          # 拷贝人/日期/校验备注
```

---

## 4. 能力对照（接手时心里有数）

| 能力 | mac 本包 | mark（需另拷） |
|------|----------|----------------|
| 流程文字说明 | ✅ playbook | ✅ 同源 |
| 城市活动提取脚本（北京/新加坡样例） | ✅ workspaces | 可能另有更完整版本 |
| 登录 probe / profile（本机历史） | ✅ 可能已过期 | ✅ 建议 profile |
| 标准 skill：verify / discover / crawl-countries | ❌ | ✅ |
| 统计与 GPT Pro 打包脚本 | ❌ | ✅ |
| 港口 transfer 成本日更 | ✅ related/reotaxis* | 未知 |
| **酒店产品**爬取 | ❌ 仅 future 占位 | ❌ 当时 skill 以 activities 为主，酒店为后续新增 |

---

## 5. 安全提示

- playbook 含 Bedsonline 登录凭据，属敏感内部资料。  
- browser-profile 可能含 session cookie / localStorage token。  
- 本包放在外接盘 `CodexArchive`，移动到其他设备时请注意物理与权限控制，**不要同步到公开云或 git**。
