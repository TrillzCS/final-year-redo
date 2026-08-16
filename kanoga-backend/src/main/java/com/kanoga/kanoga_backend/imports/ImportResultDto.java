package com.kanoga.kanoga_backend.imports;

import java.util.List;

/** Outcome of an import run. */
public record ImportResultDto(
        String source,
        int importedCount,
        int skippedCount,
        List<String> imported,
        List<String> skipped,
        List<String> warnings
) {}
