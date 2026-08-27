# 选用哪一份 Workflow

先看报价表「服务场景」和两端地名，再打开对应文件。

| 产品形态 | 打开 |
|---|---|
| 市区/酒店 ↔ 景区、乐园、地标 | `Viator接送产品自动上架Workflow.md` |
| 任一端是机场、火车站、邮轮港、码头 | `TRANSFER_TRANSPORT_HUB_AUTO_UPLOAD_WORKFLOW.md` |
| 包车/岸上观光（非点对点接送） | `Viator包车产品自动上架Workflow.md` |
| 门票 | `Viator门票产品自动上架Workflow.md` |
| 门票+接送等组合 | `Viator组合产品自动上架Workflow.md` |

本目录只收流程文档。报价表、车型图等材料留在本机，不进仓库。

包车 / 门票 / 组合 workflow 方便换产品形态时对照，不是接送试上架的主路径。

## 上架前检查

- Chrome 已登录目标 Supplier，页眉名称已核对
- 佣金率已从 Pricing 页回读
- 未开远程调试 9222，未对 supplier 页注入 JS
- 报价表文件名与 Sheet 内「线路」一致
