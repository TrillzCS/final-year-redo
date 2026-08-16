package com.kanoga.kanoga_backend.imports;

/** One line of an inbound order. */
public record InboundLine(String sku, String productName, int quantity) {}
