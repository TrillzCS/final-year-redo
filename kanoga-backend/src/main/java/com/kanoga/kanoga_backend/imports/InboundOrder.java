package com.kanoga.kanoga_backend.imports;

import java.time.OffsetDateTime;
import java.util.List;

/** A store-agnostic representation of an order arriving from outside the system. */
public record InboundOrder(
        String orderNo,
        String source,
        String status,
        OffsetDateTime placedAt,
        InboundCustomer customer,
        List<InboundLine> lines
) {}
