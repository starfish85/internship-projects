package com.reotrip.orders; // 声明当前类所在的基础包，Spring Boot 会从这个包向下扫描组件。

import org.springframework.boot.SpringApplication; // 引入 Spring Boot 启动工具类，用于启动应用。
import org.springframework.boot.autoconfigure.SpringBootApplication; // 引入 Spring Boot 自动配置注解，用于声明启动类。

@SpringBootApplication // 标记这是 Spring Boot 启动入口，同时启用自动配置和组件扫描。
public class OrderAutomationApplication { // 定义订单自动化后端应用的启动类。

    public static void main(String[] args) { // 定义 Java 程序入口方法，启动服务时从这里开始执行。
        SpringApplication.run(OrderAutomationApplication.class, args); // 启动 Spring Boot 应用并加载所有接口、服务和配置。
    } // 结束 main 方法。
} // 结束启动类定义。
