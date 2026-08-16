package com.kanoga.kanoga_backend.connections;

public record CreateConnectionRequest(
        String platform,
        String displayName,
        String storeUrl,
        String secret
) {}
