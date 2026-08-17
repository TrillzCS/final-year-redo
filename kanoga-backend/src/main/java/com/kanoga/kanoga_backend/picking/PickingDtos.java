package com.kanoga.kanoga_backend.picking;

import java.util.List;

public class PickingDtos {

    public record PickLine(
            String productName,
            String sku,
            String barcode,
            String subBatchCode,
            String expiry,
            long quantity,
            List<Integer> serials,
            List<String> orderNumbers
    ) {}

    public record PickingList(
            String generatedAt,
            int orderCount,
            long unitCount,
            List<String> orderNumbers,
            List<PickLine> lines
    ) {}

    public record OutstandingOrder(
            String orderId,
            String orderNumber,
            String customerName,
            String status,
            long qtyOrdered,
            long qtyPicked,
            String source,
            String sourceName
    ) {}
}
