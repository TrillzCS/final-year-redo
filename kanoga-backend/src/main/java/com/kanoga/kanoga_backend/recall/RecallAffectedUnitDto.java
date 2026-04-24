package com.kanoga.kanoga_backend.recall;

public record RecallAffectedUnitDto(
        String subBatchCode,
        Integer serialNo,
        String orderNo,
        String customerName,
        String customerEmail,
        String expiry
) {}