# NOL Listing Skills

Grok / NOL 上架相关 **Skill 包**（实习 phase1）。

本目录只含 Skills；浏览器翻译插件在上级目录 [`../nol-zh-ext/`](../nol-zh-ext/)。

## 内容

| Skill | README | 用途 |
| --- | --- | --- |
| [`nol-domestic-ticket-listing-helper`](./nol-domestic-ticket-listing-helper/) | [README](./nol-domestic-ticket-listing-helper/README.md) | 中国国内景区 / 主题公园**门票**上架（韩文案、场次/成人票、护照入园、售价粘贴等） |
| [`nol-product-listing-helper`](./nol-product-listing-helper/) | [README](./nol-product-listing-helper/README.md) | NOL **接送 / 包车**上架（partner 浏览器 playbook、接送 workflow、各路线 live notes） |

## 如何选择

```text
商品是门票 / 通票 / 场次入园？
  → nol-domestic-ticket-listing-helper

商品是私人包车、机场/港口/景点接送？
  → nol-product-listing-helper
```

两个 skill **不要混用默认规则**（例如：不要把接送的 `기사제공차량`、行李、航班字段套到门票上）。

## 使用（安装）

将对应目录放入：

```text
<project>/.grok/skills/<skill-name>/
# 或
~/.grok/skills/<skill-name>/
```

Grok 会加载目录内的 `SKILL.md`（及 references）。每个 skill 自带 `README.md` 作人类可读入口。

## 打包说明

- 包含：`SKILL.md`、`README.md`、`references/`、`agents/` 等源文件
- 已排除：`.git`、`node_modules`、`*.zip`、`.DS_Store`、缓存与 IDE 配置

## 更新要点

### 门票 skill

- 售价以 Excel/截图 **售价** 为准，复制粘贴
- **不再**默认使用 `成本 / 0.8` 自动加价
- 上架前先分 Family A/B/C/D（场次景区 / 护照入园 / 电子票 / 不上架）

### 接送 skill

- 必须勾选「私人的」；图片上缩略图区 ≥3
- 日本时段默认 07:00–21:30；价格类型名称用韩文
- 修改选项：`临时保存` → `下一个`；选项列表齐全后停手，不点批准

## 仓库总入口

上一级：[../README.md](../README.md)
