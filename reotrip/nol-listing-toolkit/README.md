# internship-phase1-projects · NOL 上架工具包

本分支交付 **NOL 合作后台上架** 相关材料（实习 phase1）：

1. **两个 Grok Skills**（门票 + 接送）
2. **一个浏览器翻译插件**（后台 UI 韩→自然简体）

仓库：`https://gitee.com/liu-haixinha/internship-phase1-projects`  
分支：`feat/nol-listing-skills-20260805`

## 目录一览

```text
.
├── README.md                          # 本文件（总入口）
├── skills/
│   ├── README.md                      # Skills 总览
│   ├── nol-domestic-ticket-listing-helper/
│   │   ├── README.md                  # 门票 skill 说明
│   │   └── SKILL.md
│   └── nol-product-listing-helper/
│       ├── README.md                  # 接送 skill 说明
│       ├── SKILL.md
│       ├── agents/
│       └── references/                # playbook + 各路线 live notes
└── nol-zh-ext/                        # Chrome/Edge 翻译插件
    ├── README.md                      # 安装与使用
    ├── manifest.json
    ├── background.js
    ├── icons/
    └── src/
```

## 各模块 README

| 模块 | README | 一句话 |
| --- | --- | --- |
| Skills 总览 | [skills/README.md](./skills/README.md) | 两个 skill 装哪、怎么选 |
| 国内门票 | [skills/nol-domestic-ticket-listing-helper/README.md](./skills/nol-domestic-ticket-listing-helper/README.md) | 场次/护照入园/售价粘贴 |
| 接送产品 | [skills/nol-product-listing-helper/README.md](./skills/nol-product-listing-helper/README.md) | 包车字段、保存顺序、路线 notes |
| 翻译插件 | [nol-zh-ext/README.md](./nol-zh-ext/README.md) | 加载已解压扩展，后台简中 |

## 怎么用（最短路径）

### A. Grok Skills

```bash
# 示例：拷到用户级 skills
cp -R skills/nol-domestic-ticket-listing-helper ~/.grok/skills/
cp -R skills/nol-product-listing-helper ~/.grok/skills/
```

- 上**门票**时加载 `nol-domestic-ticket-listing-helper`
- 上**接送**时加载 `nol-product-listing-helper`
- 详细规则以各目录 `SKILL.md` 为准

### B. 翻译插件

1. Chrome/Edge 打开扩展页 → 开发者模式  
2. 「加载已解压的扩展程序」→ 选择本仓库中的 **`nol-zh-ext`** 目录  
3. 打开 `https://tour.triple.partners/*` 并强制刷新  

详见 [nol-zh-ext/README.md](./nol-zh-ext/README.md)。

## 安全约定（全模块通用）

- **禁止**自动点击合作后台的「批准请求 / 提交审核」
- 插件只改本机展示层，不改提交数据
- Skill 默认在 **选项管理** 阶段停手，交给人工审核

## 更新说明

- 门票售价：以 Excel/截图 **售价** 为准复制，**不再**默认 `成本/0.8`
- 接送：日本时段默认 07:00–21:30、价格类型韩文名、选项修改须「临时保存→下一个」
- 插件版本见 `nol-zh-ext/manifest.json`
