package com.reotrip.orders.dto; // 声明分页结果 DTO 所在包。

import java.util.List; // 引入列表类型，用于保存当前页数据。

public record PageResult<T>( // 定义分页返回结构。
        List<T> records, // 当前页记录列表。
        long total, // 符合条件的总记录数。
        int page, // 当前页码。
        int size // 每页数量。
) { // 结束分页返回结构定义。
} // 结束分页结果类。
