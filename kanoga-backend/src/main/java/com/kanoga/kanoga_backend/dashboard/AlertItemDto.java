package com.kanoga.kanoga_backend.dashboard;

public record AlertItemDto(
        Long subBatchId,
        String subBatchCode,
        String expiry,
        Integer totalUnits,
        Integer assignedUnits,
        Integer availableUnits,
        String severity,
        String type,
        String message
) {
}