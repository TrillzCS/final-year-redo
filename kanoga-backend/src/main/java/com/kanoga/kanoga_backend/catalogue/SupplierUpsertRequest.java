package com.kanoga.kanoga_backend.catalogue;

public record SupplierUpsertRequest(
        String name,
        String contactEmail,
        String contactPhone,
        String country,
        Boolean active
) {}
