package com.kanoga.kanoga_backend.subbatch;

import java.time.LocalDate;

public record SubBatchAvailableDto(
        String subBatchId,
        String subBatchCode,
        String productId,
        String productName,
        LocalDate bestBefore,
        Long totalUnits,
        Long assignedUnits,
        Long availableUnits
) {}