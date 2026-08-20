package com.reotrip.orders.dto; // 声明订单查询条件 DTO 所在包。

import org.springframework.format.annotation.DateTimeFormat; // 引入日期格式化注解，用于接收 URL 日期参数。

import java.time.LocalDate; // 引入日期类型，用于筛选行程日期。

public class OrderQueryRequest { // 定义订单查询请求对象，用于接收列表查询参数。
    private String orderNo; // 查询条件：订单编号。
    private String phone; // 查询条件：客户手机号。
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) // 指定 travelDate 使用 yyyy-MM-dd 格式解析。
    private LocalDate travelDate; // 查询条件：单个行程日期。
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) // 指定 dateFrom 使用 yyyy-MM-dd 格式解析。
    private LocalDate dateFrom; // 查询条件：行程开始日期。
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) // 指定 dateTo 使用 yyyy-MM-dd 格式解析。
    private LocalDate dateTo; // 查询条件：行程结束日期。
    private String orderType; // 查询条件：订单类型。
    private String status; // 查询条件：订单状态。
    private Integer page = 1; // 查询条件：页码，默认第一页。
    private Integer size = 20; // 查询条件：每页数量，默认二十条。

    public String getOrderNo() { return orderNo; } // 返回订单编号查询条件。
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; } // 设置订单编号查询条件。
    public String getPhone() { return phone; } // 返回手机号查询条件。
    public void setPhone(String phone) { this.phone = phone; } // 设置手机号查询条件。
    public LocalDate getTravelDate() { return travelDate; } // 返回单日查询条件。
    public void setTravelDate(LocalDate travelDate) { this.travelDate = travelDate; } // 设置单日查询条件。
    public LocalDate getDateFrom() { return dateFrom; } // 返回开始日期查询条件。
    public void setDateFrom(LocalDate dateFrom) { this.dateFrom = dateFrom; } // 设置开始日期查询条件。
    public LocalDate getDateTo() { return dateTo; } // 返回结束日期查询条件。
    public void setDateTo(LocalDate dateTo) { this.dateTo = dateTo; } // 设置结束日期查询条件。
    public String getOrderType() { return orderType; } // 返回订单类型查询条件。
    public void setOrderType(String orderType) { this.orderType = orderType; } // 设置订单类型查询条件。
    public String getStatus() { return status; } // 返回订单状态查询条件。
    public void setStatus(String status) { this.status = status; } // 设置订单状态查询条件。
    public Integer getPage() { return page; } // 返回页码。
    public void setPage(Integer page) { this.page = page; } // 设置页码。
    public Integer getSize() { return size; } // 返回每页数量。
    public void setSize(Integer size) { this.size = size; } // 设置每页数量。
} // 结束订单查询请求对象。
