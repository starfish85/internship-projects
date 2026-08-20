# nol-product-listing-helper

NOL **接送 / 私人包车** 等运输类商品上架辅助 Skill（Grok）。

覆盖日本机场 / 车站 / 港口 / 景点接送与中国景点接送：字段怎么填、韩文案、选项与日历价格、草稿修改与保存顺序，以及浏览器实操 playbook。

> 国内景区门票请用同级目录的 [`nol-domestic-ticket-listing-helper`](../nol-domestic-ticket-listing-helper/)。

## 适用场景

- 用户发 NOL 后台截图问「怎么填 / 可以吗 / 怎么添加 / 继续上架」
- 按 Excel / CSV 价表批量做日本接送产品
- 修改已有草稿（预约信息、价格类型韩文、时段、选项字段）
- 需要按路线加载 live notes 做实机上架

## 不适用范围

- 门票 / 通票 / 场次景区 → `nol-domestic-ticket-listing-helper`
- **禁止**把门票的场次、护照入园文案套到包车上

## 快速安装

```text
# 项目级
<project>/.grok/skills/nol-product-listing-helper/

# 或用户级
~/.grok/skills/nol-product-listing-helper/
```

完整目录应包含：

```text
nol-product-listing-helper/
├── README.md                 # 本说明
├── SKILL.md                  # Skill 正文
├── agents/
│   └── openai.yaml
└── references/               # 实操 playbook 与各路线 notes
    ├── fill-flow-checklist.md
    ├── nol-partner-browser-playbook.md
    ├── nol-transfer-live-listing-workflow.md
    ├── nol-draft-edit-save-playbook.md
    ├── haneda-airport-live-notes.md
    ├── kansai-airport-live-notes.md
    ├── itami-airport-live-notes.md
    ├── tokyo-disney-transfer-live-notes.md
    ├── osaka-universal-studios-live-notes.md
    ├── osaka-port-live-notes.md
    ├── yokohama-port-live-notes.md
    └── shanghai-yuyuan-transfer.md
```

## 目录与 references 怎么用

| 文件 | 何时加载 |
| --- | --- |
| `SKILL.md` | 默认：字段规则、安全停手、统一矩阵 |
| `nol-transfer-live-listing-workflow.md` | 整单实机上架 checklist |
| `nol-partner-browser-playbook.md` | 选择器、填表顺序、失败恢复 |
| `nol-draft-edit-save-playbook.md` | **改已有草稿**（临时保存→下一个、离开弹窗） |
| `fill-flow-checklist.md` | 收工前自检 |
| `*-live-notes.md` | 按路线加载（价格、POI、坑位） |

### 机场价格速查（HKD，7 座 / 10 座）

| 路线 | Notes | 价 |
| --- | --- | --- |
| 东京市区–羽田 (HND) | `haneda-airport-live-notes.md` | 70 / 105 |
| 东京市区–成田 (NRT) | 同羽田模式 + NRT 命名 | 112 / 175 |
| 大阪市区–关西 (KIX) | `kansai-airport-live-notes.md` | 99 / 133 |
| 大阪市区–伊丹 (ITM) | `itami-airport-live-notes.md` | 77 / 105 |

（以当批 Excel 为准；表与 notes 冲突时跟 Excel。）

## 硬规则摘要

1. **价格只来自用户 Excel/CSV**，不编造 HKD / 节假日列  
2. **必须勾选 `私人的`**；主题 `기사제공차량`；进度语言韩语  
3. 图片只上 **`썸네일 이미지` / 상품 이미지（≥3）**，不要上到 `프로그램 이미지`  
4. 日本 hub/机场/景点时段默认 **`07:00`–`21:30` / 30 分**，须点 **生成** 再保存  
5. 价格类型名称用韩文：`7인승 가는` / `10인승 오는`，禁用 `7seat go` 等英文码  
6. **修改选项**：`临时保存` → `下一个`（繁体：`臨時存儲` → `下個`）  
7. 出现「有变化…确定要离开吗？」= 没保存成功 → 点**消除**，再按保存流程走  
8. 四个选项卡片（去/回 × 7/10）出现在选项列表后 **停手**  
9. **永不**点击 `批准請求` / `提交審核` / `승인요청`  
10. 大阪站文案只用 **`오사카역`**，禁止写成 `신오사카역` 或双站捆绑  

完整说明见 [`SKILL.md`](./SKILL.md)。

## 推荐上架顺序

```text
产品列表 恢复草稿/新建
  → 产品属性（含 私人的）→ 保存然后（可点再点）
  → 产品介绍（韩文 + 缩略图×3 + NONE 时间表）
  → 产品法规（截单、包含、代金券、代表预约、取消）
  → 选项管理 ×N（每个选项：价格类型 → 日历价 → 时段生成 → 下一个）
  → 停在选项列表（可选 临时存储，不点批准）
```

## 安全边界

- 「上架 / 做完 / 保存 / 提交」**不等于**允许点批准  
- 页底 `临时保存` 与 `提交审核` 相邻时，只按**精确文案**点，禁止按坐标瞎点  
- 操作说明用中文；客户可见文案一律**可粘贴韩文**

## 主数据源

- Excel：`NOL 待上架产品.xlsx` 等  
- 常见 Sheet：`日本接送产品`  
- 优先级：当批 Excel > 用户当轮口头纠正 > Skill / notes 旧示例  

## 版本说明

- 正文与路线细节以 `SKILL.md` + `references/` 为准  
- 本 README 为入口摘要，便于仓库浏览与新人上手  
