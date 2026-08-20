package com.reotrip.orders.exception; // 声明业务异常类所在包。

import com.reotrip.orders.common.ErrorCode; // 引入统一错误码枚举。

public class BusinessException extends RuntimeException { // 定义业务异常，继承运行时异常方便全局捕获。
    private final ErrorCode errorCode; // 保存当前异常对应的业务错误码。

    public BusinessException(ErrorCode errorCode) { // 定义只传错误码的构造方法。
        super(errorCode.message()); // 将错误码默认提示传给父类异常消息。
        this.errorCode = errorCode; // 保存错误码。
    } // 结束构造方法。

    public BusinessException(ErrorCode errorCode, String message) { // 定义可自定义提示的构造方法。
        super(message); // 将自定义提示传给父类异常消息。
        this.errorCode = errorCode; // 保存错误码。
    } // 结束构造方法。

    public ErrorCode getErrorCode() { // 提供读取错误码的方法。
        return errorCode; // 返回当前异常的错误码。
    } // 结束错误码读取方法。
} // 结束业务异常类。
