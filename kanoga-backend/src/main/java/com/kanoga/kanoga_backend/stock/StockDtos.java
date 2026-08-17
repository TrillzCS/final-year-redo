package com.kanoga.kanoga_backend.stock;

import java.util.List;

public class StockDtos {

    public record ProductStock(
            String productId,
            String productName,
            String sku,
            String barcode,
            long totalUnits,
            long availableUnits,
            long assignedUnits,
            long returnedUnits,
            Integer lowStockThreshold,
            boolean belowThreshold,
            String earliestExpiry
    ) {}

    public record BatchStock(
            String subBatchId,
            String subBatchCode,
            String batchCode,
            String supplierName,
            String productName,
            String expiry,
            long totalUnits,
            long availableUnits,
            long assignedUnits,
            boolean expired
    ) {}

    public record DashboardSummary(
            long productCount,
            long availableUnits,
            long unitsWithCustomers,
            long ordersAwaitingPicking,
            long ordersPicking,
            long ordersDispatched,
            long openAlerts,
            long criticalAlerts,
            long expiringSoon,
            List<ProductStock> lowStock
    ) {}
}
