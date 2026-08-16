package com.kanoga.kanoga_backend.connections;

/** A connected storefront as shown in the interface. */
public record StoreConnectionDto(
        String id,
        String platform,
        String displayName,
        String storeUrl,
        boolean active,
        String createdAt,
        String lastOrderAt,
        int ordersReceived,
        String webhookUrl,
        String webhookSecret,
        String setupSteps
) {}
