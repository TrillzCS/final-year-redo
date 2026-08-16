package com.kanoga.kanoga_backend.catalogue;

public record SupplierDto(
        String id,
        String name,
        String contactEmail,
        String contactPhone,
        String country,
        boolean active
) {}
