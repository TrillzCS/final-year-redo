package com.kanoga.kanoga_backend.activity;

public record ActivityEntryDto(
        String id,
        String occurredAt,
        String actor,
        String action,
        String entityType,
        String entityId,
        String detail
) {}
