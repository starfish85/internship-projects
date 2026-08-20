package com.reotrip.orders.dto; // 声明订单校验结果 DTO 所在包。

import java.util.List; // 引入列表类型，用于保存缺失字段和异常原因。

public record OrderValidationResult( // 定义订单字段完整性校验结果。
        String orderNo, // 订单编号。
        boolean missingPhone, // 是否缺失手机号。
        boolean missingAddress, // 是否缺失地址。
        boolean abnormalItinerary, // 是否行程异常。
        List<String> missingFields, // 缺失字段列表。
        List<String> abnormalReasons // 异常原因列表。
) { // 结束订单校验结果结构定义。
} // 结束订单校验 DTO。
