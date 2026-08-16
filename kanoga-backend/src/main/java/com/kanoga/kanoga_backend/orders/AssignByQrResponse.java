package com.kanoga.kanoga_backend.orders;

import java.time.OffsetDateTime;

public record AssignByQrResponse(
        String orderId,
        String labelId,
        Integer serialNo,
        String subBatchId,
        OffsetDateTime assignedAt
) {}
