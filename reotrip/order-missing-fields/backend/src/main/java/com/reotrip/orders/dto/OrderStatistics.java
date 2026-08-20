package com.reotrip.orders.dto; // 声明统计 DTO 所在包。

import java.util.List; // 引入列表类型，用于保存每日统计。

public record OrderStatistics( // 定义订单统计返回结构。
        long totalOrders, // 订单总量。
        long missingPhoneCount, // 缺失手机号订单数量。
        long missingAddressCount, // 缺失地址订单数量。
        long abnormalItineraryCount, // 行程异常订单数量。
        List<DailyOrderCount> dailyOrderCounts // 每日订单总量列表。
) { // 结束订单统计结构定义。
} // 结束统计 DTO。
