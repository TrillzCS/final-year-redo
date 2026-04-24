package com.kanoga.kanoga_backend.recall;

public record RecallAffectedUnitDto(
        String subBatchCode,
        Long labelId,
        Integer serialNo,
        Long orderId,
        String orderNO,
        String customerName,
        String customerEmail,
        String assignedAt
) {
}