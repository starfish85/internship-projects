# 接送订单校验 · 交付包

校验日期：2026-08-13  
数据范围：出行日 ≥ 2026-08-12，产品类型 `TRANSFER` + `TICKET_WITH_TRANSFER`  
后台：https://a.reotrip.com/v/orders

## 包内结构

```
交付/
  README.md                          本说明
  校验报告.md                        给人看的结论（先读这个）
  skill/                             可安装的 Grok skill
    SKILL.md
    scripts/judge.py                 唯一判定规则（阈值只在这里）
    references/aliases.json          机场/港口/车站别名与车程
    references/sources.md            官方时刻查询源
    references/examples.json
  results/
    hub_verdicts.csv                 38 张枢纽单判定表（Excel 可开）
    judge_results.json               脚本完整输出
    facts.json                       送进 judge.py 的结构化事实
    hub_orders.json                  38 张枢纽单的产品/起终点/备注
    orders_index.json                455 张列表索引（无联系人隐私字段）
```

## 怎么用这个 skill

1. 把 `skill/` 拷到项目 `.grok/skills/transfer-order-check/`，或用户技能目录。
2. 对话里说「校验接送订单」或 `/transfer-order-check`。
3. 后台筛好单，或提供 Cookie / 已登录 Chrome。
4. 查官方时刻后写成 `facts.json`，跑：

```bash
python3 skill/scripts/judge.py results/facts.json --pretty
```

不要另写一套阈值。规则只在 `judge.py` 和 `aliases.json`。

## 本次结论（一句话）

455 张接送相关单里，384 张是乐园/酒店点对点，不按航班船车抽检；38 张枢纽单进入判定：**FAIL 2、WARN 1、NEED_INFO 32、PASS 3**。  
优先处理 **17087（订反线路）** 和 **16860（东京港产品 vs 船在横浜大栈桥）**。

详情见 `校验报告.md`。
