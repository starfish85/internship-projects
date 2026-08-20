package com.reotrip.orders.common; // 声明通用返回对象所在包。

public record ApiResponse<T>( // 定义统一 JSON 返回结构，所有接口都返回该对象。
        boolean success, // 表示接口是否处理成功。
        String code, // 表示业务状态码，例如 OK、ORDER_NOT_FOUND。
        String message, // 表示给前端或运营人员看的友好提示。
        T data // 表示接口真正返回的数据内容。
) { // 结束 record 字段声明。

    public static <T> ApiResponse<T> ok(T data) { // 定义成功返回的快捷方法，减少 Controller 重复代码。
        return new ApiResponse<>(true, "OK", "操作成功", data); // 返回标准成功 JSON。
    } // 结束成功快捷方法。

    public static <T> ApiResponse<T> ok(String message, T data) { // 定义可自定义成功提示的快捷方法。
        return new ApiResponse<>(true, "OK", message, data); // 返回带自定义提示的成功 JSON。
    } // 结束自定义成功快捷方法。

    public static <T> ApiResponse<T> fail(String code, String message) { // 定义失败返回的快捷方法。
        return new ApiResponse<>(false, code, message, null); // 返回标准失败 JSON，失败时 data 为空。
    } // 结束失败快捷方法。
} // 结束统一返回对象定义。
