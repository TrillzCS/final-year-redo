package com.kanoga.kanoga_backend.imports;

import java.util.List;
import java.util.Map;

/** Translates one store's order format into the canonical InboundOrder. */
public interface StoreOrderAdapter {

    /** Identifier used to route a request to this adapter, e.g. */
    String source();

    /** A short human-readable description, surfaced by the import screen. */
    String description();

    /** Authenticates the payload before it is parsed. */
    default void verify(String rawBody, Map<String, String> headers) {
        // No additional verification required by default.
    }

    /** Parses the payload into zero or more canonical orders. */
    List<InboundOrder> parse(String rawBody);
}
