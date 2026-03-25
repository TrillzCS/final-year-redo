package com.kanoga.kanoga_backend.orders;

public record CreateOrderRequest(
        String orderNumber,
        String customerName,
        String customerEmail
) {}
