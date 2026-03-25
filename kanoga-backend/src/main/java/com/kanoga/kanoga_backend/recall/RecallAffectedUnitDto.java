package com.kanoga.kanoga_backend.recall;

public record RecallAffectedUnitDto(
        String subBatchCode,
        Long labelId,
        Integer serialNo,
        Long orderId,
        String orderNumber,
        String customerName,
        String customerEmail,
        String assignedAt
) {
}