package com.kanoga.kanoga_backend.orders;

/** An order as shown in the fulfilment list, including its progress. */
public record OrderSummaryDto(
        String id,
        String orderNumber,
        String customerName,
        String customerEmail,
        String status,
        long qtyOrdered,
        long qtyAssigned,
        long qtyReturned,
        String fulfilment,
        String placedAt,
        String dispatchedAt
) {}
