package com.kanoga.kanoga_backend.dashboard;

import java.util.List;

public record AlertsDashboardResponseDto(
        int expiredCount,
        int expiringSoonCount,
        int lowStockCount,
        List<AlertItemDto> expired,
        List<AlertItemDto> expiringSoon,
        List<AlertItemDto> lowStock
) {
}
