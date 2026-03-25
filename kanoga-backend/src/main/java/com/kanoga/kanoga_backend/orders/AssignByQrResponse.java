package com.kanoga.kanoga_backend.orders;

import java.time.OffsetDateTime;

public record AssignByQrResponse(
        Long orderId,
        Long labelId,
        Integer serialNo,
        Long subBatchId,
        OffsetDateTime assignedAt
) {}

