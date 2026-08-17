package com.kanoga.kanoga_backend.catalogue;

import java.math.BigDecimal;

public record ProductUpsertRequest(
        String name,
        String sku,
        String barcode,
        BigDecimal unitSize,
        String unitOfMeasure,
        Integer shelfLifeMonths,
        Boolean active,
        Integer lowStockThreshold,
        Integer reorderQuantity,
        Boolean perishable,
        Integer expiryWarningDays
) {}
