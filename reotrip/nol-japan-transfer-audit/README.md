# 日本接送产品检查 Skill · 交付包

**包名：** `nol-japan-transfer-audit`  
**版本日期：** 2026-08-17  
**性质：** 检查 / 验收 only · **不**并入上架 skill `nol-product-listing-helper`

---

## 1. 包内结构

```
nol-japan-transfer-audit-YYYYMMDD/
├── README.md                          ← 本说明
├── skill/
│   └── nol-japan-transfer-audit/
│       └── SKILL.md                   ← 主 skill（装到 Grok skills 目录）
├── references/
│   ├── CHECKLIST-1page.md             ← 一页检查码速查
│   └── transfer-audit-constants.excerpt.mjs  ← 取消条款/FAQ 常量摘录
└── samples/
    ├── japan-products-inventory-4.0.md       ← 日本接送 N≈56 清单 + 4.0 反馈
    ├── audit-route-taste-results.json        ← C-ROUTE+C-TASTE 全量样例结果
    └── audit-faq-spec-img-results.json       ← C-FAQ+C-SPEC+C-IMG 全量样例结果
```

---

## 2. 安装（Grok Build / 本机 skills）

### 方式 A · 项目级（推荐，跟仓库走）

```bash
# 解压后：
cp -R skill/nol-japan-transfer-audit \
  <你的项目根>/.grok/skills/

# 目录应变为：
# <项目>/.grok/skills/nol-japan-transfer-audit/SKILL.md
```

### 方式 B · 用户级（全项目可用）

```bash
cp -R skill/nol-japan-transfer-audit \
  ~/.grok/skills/
# 若设置了 GROK_HOME：
# cp -R skill/nol-japan-transfer-audit "$GROK_HOME/skills/"
```

安装后几秒内斜杠菜单应出现：`/nol-japan-transfer-audit`  
或自然语言：`检查日本接送` / `按 1.0-4.0 扫` / `验收接送线路串味`。

---

## 3. 怎么用

1. Chrome 已用调试端口打开 NOL 后台（CDP `127.0.0.1:9222`，与现有上架自动化一致）。  
2. 对 Agent 说：  
   - 「按检查 skill 全量扫日本接送」  
   - 「只查 C-ROUTE 和 C-TASTE」  
   - 「扫 FAQ 和图片」  
3. Agent 应输出 **PASS/FAIL 总表 + fails[]**，**不**擅自提交审核。  
4. 若要改 FAIL：明确说「按 FAIL 修」→ 另走 **上架 skill** 或仓库内 fix 脚本。

---

## 4. 与上架 skill 边界

| | 检查 skill（本包） | 上架 skill |
|--|-------------------|------------|
| 包名 | `nol-japan-transfer-audit` | `nol-product-listing-helper` |
| 动作 | 读回 · 出表 | 填表 · 上传 · 保存然后 |
| 合并 | **禁止并入上架 skill** | 保持独立 |

---

## 5. 样例结果摘要（2026-08-17 live）

| 扫描 | N | 结果 |
|------|---|------|
| C-ROUTE + C-TASTE | 56 | 55→修东京站迪士尼串味→**56 PASS** |
| C-FAQ + C-SPEC + C-IMG | 56 | 55→成田图去重→**56 PASS** |
| 提交审核 | — | **未点** |

详见 `samples/` JSON 与 inventory 第七、八节。

---

## 6. 依赖（执行 live 检查时）

- 已登录的 NOL Partner Chrome（远程调试 9222）  
- 可选：仓库 `nol-listing-automation`（产品 id 表、常量 lib、批量脚本）  
- 车图资产（仅「建议换图」时）：`upload-ready-images/japan-car-only/`

本交付包 **自含 skill 正文 + 清单 + 样例结果**，不强制附带整个 automation 仓库。

---

## 7. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-08-17 | 初版交付：1.0–4.0 检查码、边界、样例全量结果 |
