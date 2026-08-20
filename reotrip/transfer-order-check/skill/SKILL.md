---
name: transfer-order-check
description: >
  校验接送机/接送港/接送站订单：用航班号、船名或列车号核对枢纽和方向，判断接送时间是否过晚，抓住订错产品、订反线路。
  Use when the user asks to 校验接送订单, 核对接机, 核对接港, 核对接站, 检查航班是否订反, 检查送机是否来得及,
  查待出行接送单, or runs /transfer-order-check.
---

# 接送订单校验

避免三类事故：订错产品（枢纽不对）、订反线路（接/送反了）、接送时间过晚。

规则表只在 `scripts/judge.py` 和 `references/aliases.json`。查询源只在 `references/sources.md`。不要另写一套阈值。

## 1. 收订单

按优先级取数，取到就能往下走：

1. 用户粘贴的订单 JSON / 表格 / 截图 / 单号
2. 用户给了后台 Cookie 或 Token：按 `references/sources.md` 拉 `TRANSFER` 和 `TICKET_WITH_TRANSFER`
3. 用户说「待出行 / 某日接送单」但没凭证：先要筛选后的订单或登录态，不要去翻浏览器 Cookie

每张单抽齐：产品名、套餐名、出行日、`time_slot`、起终点 POI、备注/行程/附加信息、枢纽号。

枢纽号提取顺序：`booking_extra_info` → `unit_extra_info` → `customer_note` → 行程/备注 → 产品名。航班形如 `NH812`/`CX 888`，列车如 `のぞみ12`，船名按原文保留。

用产品名和起终点判断类型：接送机 / 接送港 / 接送站。往返单把去程、回程拆成两条再判。

## 2. 查官方时刻

按类型打开 `references/sources.md` 对应源，核出行日那一班。

必须落到这些事实，缺一不可就标 `NEED_INFO`，不要猜时刻：

- 枢纽点（机场三字码 / 码头 / 车站）
- 方向：到达或出发
- 计划时刻（有实际/预计则并列，判决用更晚的到达或更早的出发）
- 对端地点（另一机场/前港次港/另一车站）
- 来源 URL

内部 `/api/flight/{号}/` 若字段全空，立刻改 FlightAware，不要当查到了。

## 3. 判决

把每张单写成 JSON（`order` + `hub`），跑：

```bash
python3 .grok/skills/transfer-order-check/scripts/judge.py facts.json --pretty
```

`hub.direction` 只能是 `arrival`（到达=应接）或 `departure`（出发=应送）。`hub.scheduled_time` 用 ISO 或 `YYYY-MM-DD HH:MM`，东京时区。

脚本会判：枢纽是否一致、接送方向是否反了、日期是否对得上、送是否来得及、接是否早于到达。不要在回复里改阈值。

## 4. 输出

先汇总：`FAIL / WARN / NEED_INFO / PASS` 各多少。然后只展开非 PASS。

每张问题单用表：

| 字段 | 值 |
|---|---|
| 单号 | |
| 类型 | 接送机 / 接送港 / 接送站 |
| 产品 | 产品名 + 起终点 + 出行日 + 时段 |
| 枢纽号 | 航班/船/车 |
| 官方时刻 | 方向 + 枢纽 + 时刻 + 来源 |
| 结论 | FAIL/WARN/NEED_INFO |
| 原因 | 脚本 `issues` 原文 |
| 建议 | 改产品 / 改方向 / 改时间 / 向客人确认 |

建议口径：

- `WRONG_HUB`：换到实际枢纽对应产品
- `REVERSED_ROUTE`：接改送或送改接
- `TOO_LATE` / `TOO_LATE_AFTER_DEPART`：提前上车，或告诉客人赶不上
- `PICKUP_BEFORE_ARRIVAL`：接到到达之后
- `NEED_INFO`：先补枢纽号或官方时刻，不要标通过

未查到时刻时写清查过哪些 URL。不要改订单，除非用户明确要求改。
