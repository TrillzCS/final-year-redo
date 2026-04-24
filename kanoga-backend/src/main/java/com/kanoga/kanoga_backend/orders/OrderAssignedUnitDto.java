package com.kanoga.kanoga_backend.orders;

public record OrderAssignedUnitDto(
        Integer serialNo,
        String subBatchId,
        String subBatchCode,
        String productName,
        String expiry
) {}