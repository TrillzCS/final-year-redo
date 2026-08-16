package com.kanoga.kanoga_backend.catalogue;

import java.math.BigDecimal;

/** A catalogue product. */
public record ProductDto(
        String id,
        String name,
        String sku,
        String barcode,
        BigDecimal unitSize,
        String unitOfMeasure,
        Integer shelfLifeMonths,
        boolean active
) {}
