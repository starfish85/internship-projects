package com.reotrip.orders.dto; // 声明每日订单统计 DTO 所在包。

import java.time.LocalDate; // 引入日期类型，用于表示统计日期。

public record DailyOrderCount( // 定义每日订单数量返回结构。
        LocalDate date, // 统计日期。
        long count // 当天订单数量。
) { // 结束每日订单数量结构定义。
} // 结束每日统计 DTO。
