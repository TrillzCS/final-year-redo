package com.kanoga.kanoga_backend.orders;

/** One physical unit assigned to an order. */
public record OrderAssignedUnitDto(
        Integer serialNo,
        String subBatchId,
        String subBatchCode,
        String productName,
        String expiry,
        String returnedAt
) {}
