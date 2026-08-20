# 第 2 步：打开 Trip.com 页面

目标：在字段提取之后，直接把 Trip.com 查价页打开到对应日期和线路。

当前脚本：

```text
03_实习生提交/shinkansen-price-skill/scripts/open_tripcom.py
```

当前支持的线路模板：

- 东京站 / Tokyo Station
- 大阪 / Shin-Osaka

说明：

- 脚本会先调用字段提取逻辑。
- 目前只覆盖你刚展示的东京与大阪模板，后续你演示其他线路后再补站点映射。
- 该脚本默认只输出 URL；加 `--open` 时会尝试打开浏览器。

使用示例：

```text
python scripts/open_tripcom.py "客人 2 位成人，想在 2026 年 7 月 18 日下午从大阪到东京，看看新干线价格。"
```

打开浏览器：

```text
python scripts/open_tripcom.py "客人 2 位成人，想在 2026 年 7 月 18 日下午从大阪到东京，看看新干线价格。" --open
```

下一步：你继续演示 Trip.com 页面里怎么改日期、怎么切币种、怎么展开车次，我再把那部分补成脚本。
