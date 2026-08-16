package com.kanoga.kanoga_backend.orders;

/** Marks one previously assigned unit as returned by the customer. */
public record ReturnUnitRequest(String subBatchId, Integer serialNo, String reason) {}
