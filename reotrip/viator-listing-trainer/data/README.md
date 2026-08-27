# 内容包怎么用

仿真页的数据只从本目录读，不要把字段写死在 HTML 里。

| 文件 | 作用 |
| --- | --- |
| `learning.json` | 常驻横幅和「上架前先问自己」。阶段 A 就要展示 |
| `steps.json` | 向导有哪些步、每步有哪些字段、适用哪些产品类型 |
| `products.json` | 样例产品的填值。第一版只有门票 `5514894P11` |
| `field-guides.json` | 字段旁问号。界面只展示 `draftZh.fill`（此处填什么）和 `draftZh.format`（建议文案格式） |
| `tour.json` | 第一次打开的强制引导。每条同样两段 `fill` / `format` |

## 给技术实习生

1. 把本目录**复制**到自己项目的 `data/`，不要改 `02_参考资料/content-pack` 原件。
2. 页面按 `steps.json` 的 `order` 渲染左侧步骤和主区。
3. 字段值从 `products.json` 的 `values` / `options` 读。
4. `valueStatus` 为 `todo_from_supplier_backend` 的，对照真实后台只读抄到你的副本里，并在过程记录中写明来源步骤。
5. `needs_owner` 的不要猜。页面显示「待负责人补全」。
6. `appliesToProductTypes` 现在只用 `ticket`。不要删这个字段，后面要接送、包车。
7. 从 `learning.json` 读取顶栏/侧栏提示，不要把「东迪只是样例」写死在 HTML 里却读不到 JSON。

## 状态枚举

`valueStatus` / `guide.status`：

- `confirmed_c_side`：前台能见到，可直接展示
- `inferred`：按类型推断，需和后台对一下
- `todo_from_supplier_backend`：去 P11 / P513 只读抄
- `needs_owner`：等 FAQ
- `owner_confirmed`：负责人已拍板
- `placeholder`：界面占位，不是真实业务值
