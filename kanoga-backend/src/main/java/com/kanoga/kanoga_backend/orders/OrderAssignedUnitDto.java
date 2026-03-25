package com.kanoga.kanoga_backend.orders;

import java.time.OffsetDateTime;

public record OrderAssignedUnitDto(
        Long assignedId,
        Long orderId,
        Long labelId,
        OffsetDateTime assignedAt,
        Integer serialNo,
        Long subBatchId
) {}
