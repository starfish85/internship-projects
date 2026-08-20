# 抽检记录 · 2026-08-14

在已登录 QRATOR 的本机 Chrome 里加载 `extension/`，打开俄语站实点，不截首页了事。

## 看过的页面

| 类型 | URL | 结论 |
| --- | --- | --- |
| 首页（俄文） | https://www.sputnik8.com/?locale=ru | 顶栏/城市入口/优势区走词典 |
| 英文落地页 | https://www.sputnik8.com/en?utm_referrer=https%3A%2F%2Fcn.bing.com%2F | 同一套固定栏有英→中，评论里的俄语仍会译 |
| 城市列表 | https://www.sputnik8.com/ru/moscow | 筛选、分类、卡片标签已译 |
| 拼团巴士观光 | https://www.sputnik8.com/ru/moscow/activities/24725-moskva-za-4-chasa-obzornaya-na-avtobuse-so-smotrovymi-ploschadkami | 含/不含、预订、儿童限制、48h 取消 |
| 拼团步行 | https://www.sputnik8.com/ru/moscow/activities/78959-moskva-kupecheskaya-progulka-v-gruppe-po-zamoskvorechyu | 按天气穿衣、票种、集合点地址保留 |
| 夜游游船 | https://www.sputnik8.com/ru/moscow/activities/55229-vechernyaya-moskva-muzykalnyy-kruiz-s-vidom-na-kreml | 含/不含、可自带酒水、选套餐/码头 |
| 门票+讲解 | https://www.sputnik8.com/ru/moscow/activities/20560-almaznyy-fond-i-eksklyuzivnaya-ekskursiya-po-aleksandrovskomu-sadu | **不可退**、门票另付、禁止拍照 |
| 出城一日 | https://www.sputnik8.com/ru/moscow/activities/92936-glavnyy-hram-vooruzhennyh-sil-i-muzeynyy-kompleks-doroga-pamyati | 餐食另付、着装限制、集合点 |

预订区点到填姓名/邮箱/电话、选日期人数、看到「零预付预订 / 开始预订」，**没有提交订单**。

## 发现并已修

| 问题 | 处理 |
| --- | --- |
| `экскурсия` 被句中替换，标题变成「обзорная 行程 на автобусе」 | 短词改为 `exact`，不再往标题里塞 |
| 列表热销标题机翻成「4 小时内的莫斯科」 | 5 条热销标题写入词典；并加「N 小时内的 → N小时逛」 |
| 票种 `Взрослый (18+)` / `Детский (от 7 до 15 лет)` 漏 | 词典 + 正则 |
| 游船「选择套餐 / 路线详情 / 可自带酒水」漏 | 补词典 |
| 儿童「须家长陪同 / 至少提前 20 分钟到」漏或被拆开 | 整句进词典，保留否定 |
| 钻石基金「禁止携带 / 禁止拍照 / 门票另付 / 不可退」 | 整句进词典，避免译反 |
| `отзыв` 只当评价，不跟退款混 | `context: review`，退款走 отмена/возврат |

复检产品页（24725）时：

- 固定栏：登录 / 筛选 / 费用包含 / 费用不含 / 重要须知 / 零预付预订 / 48 小时免费取消
- 命中统计约 `dict 296 / regex 33 / mt 137`
- 未译残留主要是：向导名、门牌、被拆开的 `Я` / `и`、日历季节小标签（已补夏秋冬）

## 有意不译

- 价格数字、`₽`、时刻 `12:30`、日期 `14.08.2026`
- 邮箱、电话、`hi@sputnik8.com`
- 向导名（Дарья、Дмитрий）
- 门牌（Кутузовский просп., д. 38）
- Yandex 地图 / Intercom 内部

## 动态区域

点开「筛选 / 日期 / 开始时间 / 团队类型 / 展开更多 / 选择日期」后新出现的节点会再走一遍。  
无限滚动新卡片同样靠 MutationObserver。  
第三方 iframe 不进内容脚本，README 已标明。
