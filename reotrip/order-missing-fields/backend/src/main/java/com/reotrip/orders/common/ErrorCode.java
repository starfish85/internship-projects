package com.reotrip.orders.common; // 声明错误码枚举所在包。

public enum ErrorCode { // 定义业务错误码枚举，统一管理接口异常类型。
    PARAM_REQUIRED("PARAM_REQUIRED", "必填参数为空，请补充后重试"), // 参数缺失时使用。
    ORDER_NOT_FOUND("ORDER_NOT_FOUND", "未找到对应订单，请检查订单编号"), // 订单不存在时使用。
    DATA_READ_FAILED("DATA_READ_FAILED", "订单数据读取失败，请稍后重试"), // 数据读取失败时使用。
    VALIDATION_FAILED("VALIDATION_FAILED", "参数格式不正确，请检查后重试"), // 参数校验失败时使用。
    INTERNAL_ERROR("INTERNAL_ERROR", "系统处理异常，请联系管理员"); // 未预期系统异常时使用。

    private final String code; // 保存给前端使用的错误码字符串。
    private final String message; // 保存给前端和运营人员看的默认提示。

    ErrorCode(String code, String message) { // 定义枚举构造方法，用于初始化错误码和提示。
        this.code = code; // 保存错误码。
        this.message = message; // 保存默认提示。
    } // 结束枚举构造方法。

    public String code() { // 提供读取错误码的方法。
        return code; // 返回错误码字符串。
    } // 结束错误码读取方法。

    public String message() { // 提供读取默认提示的方法。
        return message; // 返回默认友好提示。
    } // 结束默认提示读取方法。
} // 结束错误码枚举。
