package com.kanoga.kanoga_backend.recall;

import java.util.List;

public record RecallResultDto(
        String batchCode,
        int affectedSubBatches,
        int affectedUnits,
        int affectedOrders,
        int affectedCustomers,
        List<RecallAffectedUnitDto> units
) {}