package com.reotrip.orders.model; // 声明订单实体所在包。

import java.time.LocalDate; // 引入日期类型，用于保存行程日期。
import java.time.LocalDateTime; // 引入日期时间类型，用于保存创建和更新时间。

public class TravelOrder { // 定义旅游订单实体，代表爬虫抓取后保存的一条订单。
    private String orderNo; // 保存订单编号，例如 BR-1417501241。
    private String customerName; // 保存客户姓名。
    private String phone; // 保存客户手机号。
    private LocalDate travelDate; // 保存行程日期。
    private String orderStatus; // 保存订单状态，例如已确认、已取消。
    private String orderType; // 保存订单类型，例如接送、门票、包车。
    private String itinerary; // 保存行程描述。
    private String pickupTime; // 保存接送时间。
    private String pickupAddress; // 保存上车地址。
    private String dropoffAddress; // 保存下车地址。
    private String hotelName; // 保存酒店名称。
    private String hotelAddress; // 保存酒店地址。
    private String flightNo; // 保存航班号、车次或船名编号。
    private String passengerCount; // 保存乘客人数信息。
    private String luggageInfo; // 保存行李信息。
    private Boolean routeClear; // 保存路线是否清楚。
    private String source; // 保存数据来源，例如 crawler、manual。
    private String rawData; // 保存原始抓取数据，便于排查问题。
    private LocalDateTime createdAt; // 保存订单进入本系统的时间。
    private LocalDateTime updatedAt; // 保存订单最后更新时间。

    public String getOrderNo() { return orderNo; } // 返回订单编号。
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; } // 设置订单编号。
    public String getCustomerName() { return customerName; } // 返回客户姓名。
    public void setCustomerName(String customerName) { this.customerName = customerName; } // 设置客户姓名。
    public String getPhone() { return phone; } // 返回客户手机号。
    public void setPhone(String phone) { this.phone = phone; } // 设置客户手机号。
    public LocalDate getTravelDate() { return travelDate; } // 返回行程日期。
    public void setTravelDate(LocalDate travelDate) { this.travelDate = travelDate; } // 设置行程日期。
    public String getOrderStatus() { return orderStatus; } // 返回订单状态。
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; } // 设置订单状态。
    public String getOrderType() { return orderType; } // 返回订单类型。
    public void setOrderType(String orderType) { this.orderType = orderType; } // 设置订单类型。
    public String getItinerary() { return itinerary; } // 返回行程描述。
    public void setItinerary(String itinerary) { this.itinerary = itinerary; } // 设置行程描述。
    public String getPickupTime() { return pickupTime; } // 返回接送时间。
    public void setPickupTime(String pickupTime) { this.pickupTime = pickupTime; } // 设置接送时间。
    public String getPickupAddress() { return pickupAddress; } // 返回上车地址。
    public void setPickupAddress(String pickupAddress) { this.pickupAddress = pickupAddress; } // 设置上车地址。
    public String getDropoffAddress() { return dropoffAddress; } // 返回下车地址。
    public void setDropoffAddress(String dropoffAddress) { this.dropoffAddress = dropoffAddress; } // 设置下车地址。
    public String getHotelName() { return hotelName; } // 返回酒店名称。
    public void setHotelName(String hotelName) { this.hotelName = hotelName; } // 设置酒店名称。
    public String getHotelAddress() { return hotelAddress; } // 返回酒店地址。
    public void setHotelAddress(String hotelAddress) { this.hotelAddress = hotelAddress; } // 设置酒店地址。
    public String getFlightNo() { return flightNo; } // 返回航班号、车次或船名编号。
    public void setFlightNo(String flightNo) { this.flightNo = flightNo; } // 设置航班号、车次或船名编号。
    public String getPassengerCount() { return passengerCount; } // 返回乘客人数信息。
    public void setPassengerCount(String passengerCount) { this.passengerCount = passengerCount; } // 设置乘客人数信息。
    public String getLuggageInfo() { return luggageInfo; } // 返回行李信息。
    public void setLuggageInfo(String luggageInfo) { this.luggageInfo = luggageInfo; } // 设置行李信息。
    public Boolean getRouteClear() { return routeClear; } // 返回路线是否清楚。
    public void setRouteClear(Boolean routeClear) { this.routeClear = routeClear; } // 设置路线是否清楚。
    public String getSource() { return source; } // 返回数据来源。
    public void setSource(String source) { this.source = source; } // 设置数据来源。
    public String getRawData() { return rawData; } // 返回原始抓取数据。
    public void setRawData(String rawData) { this.rawData = rawData; } // 设置原始抓取数据。
    public LocalDateTime getCreatedAt() { return createdAt; } // 返回创建时间。
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; } // 设置创建时间。
    public LocalDateTime getUpdatedAt() { return updatedAt; } // 返回更新时间。
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; } // 设置更新时间。
} // 结束旅游订单实体。
