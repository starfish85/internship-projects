# 项目执行部署路径

## 项目定位

本项目是 ReoTrip 订单缺失字段识别与英文邮件生成的本地静态页面工具。

页面只读取本地整理后的订单数据，不连接线上写接口，不修改 ReoTrip 系统内任何订单。

## 目录结构

```text
missing-fields/
├─ .gitignore
└─ outputs/
   ├─ three-panel-page.html
   ├─ project-handoff.md
   ├─ deployment-path.md
   └─ user-guide.md
```

其中：

- `outputs/three-panel-page.html`：最终可运行页面。
- `outputs/project-handoff.md`：项目交接记录。
- `outputs/deployment-path.md`：本文件，记录执行与部署路径。
- `outputs/user-guide.md`：使用说明。

## 本机执行路径

当前开发设备上的项目路径：

```text
C:\Users\starfish\Documents\Codex\2026-07-06\https-a-reotrip-com-v-orders
```

当前页面路径：

```text
C:\Users\starfish\Documents\Codex\2026-07-06\https-a-reotrip-com-v-orders\outputs\three-panel-page.html
```

打开方式：

1. 双击 `outputs/three-panel-page.html`。
2. 或在浏览器地址栏打开本地文件路径。

该页面不需要安装依赖，不需要启动服务。

## 其他设备复用流程

### 方式一：从 Gitee 拉取

在新设备上安装 Git 后执行：

```powershell
cd D:\Projects
git clone https://gitee.com/liu-haixinha/missing-fields.git
cd missing-fields
```

然后打开：

```text
outputs\three-panel-page.html
```

### 方式二：直接复制项目文件夹

将整个项目文件夹复制到新设备后，直接打开：

```text
outputs\three-panel-page.html
```

## 新订单数据更新路径

当前页面数据内嵌在 `outputs/three-panel-page.html` 的 JavaScript `orders` 数组中。

### ReoTrip 读取前的标准筛选流程

读取 ReoTrip 订单前，先在 ReoTrip 系统内完成订单类型筛选：

1. 打开 ReoTrip 订单列表，例如：

   ```text
   https://a.reotrip.com/v/orders?travel_date_from=2026-07-04
   ```

2. 在 ReoTrip 页面中筛选 `接送订单`。
3. 确认浏览器地址栏 URL 已经包含筛选条件。
4. 使用筛选后的 URL/link 读取订单列表和订单详情。
5. 将读取到的订单导入本地页面。

这样导入到本地工具中的订单默认都是接送订单，缺失字段检查可以优先按接送订单规则执行，例如接送时间、上车地址、下车地址、酒店信息、行李配置、航班/列车/船名编号。码头订单重点检查接送时间、酒店英文名和地址、接送线路、船名、行李配置；如果 `pickup` 已经是完整酒店地址，不再要求酒店地址；如果 `flight` 或备注里已有船名，不再要求船名。

仍建议保留轻量兜底：如果读取结果中出现无法确认是否为接送的订单，应标记为 `需人工确认 / Manual review required`，不要猜测。

更新新订单时：

1. 只从 ReoTrip 系统读取订单列表和订单详情。
2. 不修改 ReoTrip 系统内任何订单。
3. 先在 ReoTrip 页面筛选接送订单，并使用筛选后的 URL 读取数据。
4. 将订单字段整理为 `orders` 数组中的对象。
5. 保存 `outputs/three-panel-page.html`。
6. 浏览器刷新页面，验证日期、订单列表、缺失字段和邮件生成结果。

订单对象常用字段：

```js
{
  no: "订单号",
  guest: "客人姓名",
  status: "订单状态",
  type: "接送 或 门票",
  product: "产品名称",
  package: "套餐名称",
  date: "YYYY-MM-DD",
  time: "HH:mm",
  pax: "人数信息",
  pickup: "上车地址",
  dropoff: "下车地址",
  hotelNameEn: "酒店英文全名",
  hotelAddress: "酒店完整地址",
  luggageQuantity: "行李数量",
  luggageSize: "行李尺寸",
  luggageType: "行李类型",
  routeClear: true,
  hubRelated: true,
  flight: "航班/列车/船名编号",
  remark: "备注，可用于识别码头订单船名"
}
```

## Git 提交流程

修改页面或文档后执行：

```powershell
git status --short
git add outputs/three-panel-page.html outputs/project-handoff.md outputs/deployment-path.md outputs/user-guide.md
git commit -m "Update ReoTrip order helper"
git push
```

如果只修改了页面：

```powershell
git add outputs/three-panel-page.html
git commit -m "Update order page"
git push
```

## Gitee 仓库

```text
https://gitee.com/liu-haixinha/missing-fields.git
```

首次推送时：

```powershell
git remote add origin https://gitee.com/liu-haixinha/missing-fields.git
git push -u origin master
```

如果已经绑定过远程仓库：

```powershell
git push
```

## 安全要求

- 不要提交 API Key、账号密码、Cookie、Token、私人令牌。
- 不要把 ReoTrip 登录态保存进项目。
- 不要提交原始抓取页面、临时工作文件或压缩包。
- 项目只允许读取 ReoTrip 信息，不允许修改线上订单。
- 无法判断的订单类型要标记为 `需人工确认 / Manual review required`。

## 已排除文件

`.gitignore` 已排除：

```text
.agents/
.codex/
work/
*.zip
*.log
*.tmp
*.temp
```

这些文件不应进入仓库。
