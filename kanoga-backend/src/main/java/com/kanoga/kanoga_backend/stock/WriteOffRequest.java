package com.kanoga.kanoga_backend.stock;

import java.util.List;

/** Write off specific serials from a sub-batch, or the next N available units of it. */
public record WriteOffRequest(String subBatchId, List<Integer> serials, Integer quantity, String reason) {}
