package com.kanoga.kanoga_backend.subbatch;

import java.time.LocalDate;

public record SubBatchAvailableDto(
        Long subBatchId,
        String subBatchCode,
        Long productId,
        String productName,
        LocalDate bestBefore,
        Long totalUnits,
        Long assignedUnits,
        Long availableUnits
) {}