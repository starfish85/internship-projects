# Sample Output

以下是输出格式样例，不代表真实查价结果。实际使用时必须替换为 Trip.com 或 Klook 页面真实展示的车次、站点、坐席和价格。

```text
需求识别：
日期：2026-11-12（参考：2026-10-15）
出发地：東京
目的地：金澤
期望时间：12:00 左右
乘客人数：1 位成人，1 位儿童

查询结果：
1. 车次或列车类型：新幹線 / Hakutaka No.xxx
   出发：12:xx，東京
   到达：15:xx，金澤
   坐席价格：
   - Trip.com 公开列表显示价格（坐席类别未暴露）：USD xx.xx

说明：
目标日期尚未开售，本次使用 2026-10-15 作为同星期参考日期。以上价格仅为参考日期在订票页面真实展示的价格，不代表 2026-11-12 的真实票价。
```

如果公开页面展示了明确坐席类别，应按页面原文写出：

```text
坐席价格：
- Non-reserved seat - Ordinary Car：USD xx.xx
- Reserved seat - Ordinary Car：USD xx.xx
- Reserved seat - Green Car：USD xx.xx
```

如果无法取得 USD 或 HKD：

```text
说明：
本次未能取得符合 USD/HKD 币种要求的真实展示价格，未进行换算或估价。
```