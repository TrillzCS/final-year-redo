package com.kanoga.kanoga_backend.orders;

import java.util.UUID;

public record OrderResponseDto(
        UUID id,
        String orderNumber,
        String customerName,
        String customerEmail
) {}
