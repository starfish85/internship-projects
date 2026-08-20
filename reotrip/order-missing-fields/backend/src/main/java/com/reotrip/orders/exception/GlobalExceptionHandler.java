package com.reotrip.orders.exception; // 声明全局异常处理器所在包。

import com.reotrip.orders.common.ApiResponse; // 引入统一 JSON 返回结构。
import com.reotrip.orders.common.ErrorCode; // 引入统一错误码枚举。
import org.springframework.http.ResponseEntity; // 引入 Spring HTTP 响应对象。
import org.springframework.web.bind.MethodArgumentNotValidException; // 引入参数校验异常类型。
import org.springframework.web.bind.annotation.ExceptionHandler; // 引入异常处理方法注解。
import org.springframework.web.bind.annotation.RestControllerAdvice; // 引入全局 Controller 增强注解。

@RestControllerAdvice // 声明该类会统一拦截所有 Controller 抛出的异常并返回 JSON。
public class GlobalExceptionHandler { // 定义全局异常处理器。

    @ExceptionHandler(BusinessException.class) // 声明该方法处理业务异常。
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) { // 定义业务异常处理方法。
        ErrorCode errorCode = exception.getErrorCode(); // 取出业务异常中的错误码。
        return ResponseEntity.badRequest().body(ApiResponse.fail(errorCode.code(), exception.getMessage())); // 返回 400 和友好错误 JSON。
    } // 结束业务异常处理方法。

    @ExceptionHandler(MethodArgumentNotValidException.class) // 声明该方法处理参数校验异常。
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException exception) { // 定义参数校验异常处理方法。
        String message = exception.getBindingResult().getFieldErrors().stream().findFirst().map(error -> error.getDefaultMessage()).orElse(ErrorCode.VALIDATION_FAILED.message()); // 提取第一个字段错误提示。
        return ResponseEntity.badRequest().body(ApiResponse.fail(ErrorCode.VALIDATION_FAILED.code(), message)); // 返回 400 和校验失败 JSON。
    } // 结束参数校验异常处理方法。

    @ExceptionHandler(Exception.class) // 声明该方法兜底处理所有未预期异常。
    public ResponseEntity<ApiResponse<Void>> handleException(Exception exception) { // 定义兜底异常处理方法。
        return ResponseEntity.internalServerError().body(ApiResponse.fail(ErrorCode.INTERNAL_ERROR.code(), ErrorCode.INTERNAL_ERROR.message())); // 返回 500 和统一系统异常提示。
    } // 结束兜底异常处理方法。
} // 结束全局异常处理器。
