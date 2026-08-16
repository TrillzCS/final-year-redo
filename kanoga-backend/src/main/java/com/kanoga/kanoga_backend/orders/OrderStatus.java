package com.kanoga.kanoga_backend.orders;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** The order lifecycle, mirroring the PostgreSQL order_status enum. */
public enum OrderStatus {

    /** Created or imported, nothing picked yet. */
    NEW,

    /** At least one physical unit has been assigned. */
    PICKING,

    /** Handed to the courier. */
    DISPATCHED,

    /** Came back from the customer. */
    RETURNED,

    /** Abandoned before dispatch. */
    CANCELLED;

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
            NEW,        Set.of(PICKING, CANCELLED),
            PICKING,    Set.of(NEW, DISPATCHED, CANCELLED),
            DISPATCHED, Set.of(RETURNED),
            RETURNED,   Set.of(),
            CANCELLED,  Set.of()
    );

    /** Parses a value from the API or the database, rejecting anything unrecognised. */
    public static OrderStatus parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }
        String normalised = raw.trim().toUpperCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(s -> s.name().equals(normalised))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown status '" + raw + "'. Valid values: " + List.of(values())));
    }

    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    public Set<OrderStatus> nextStates() {
        return ALLOWED.get(this);
    }

    public void requireCanMoveTo(OrderStatus target) {
        if (this == target) {
            throw new IllegalArgumentException("Order is already " + name());
        }
        if (isTerminal()) {
            throw new IllegalArgumentException(
                    name() + " is a final status — this order cannot be changed further");
        }
        if (!ALLOWED.get(this).contains(target)) {
            throw new IllegalArgumentException(
                    "Cannot move an order from " + name() + " to " + target.name()
                            + ". From " + name() + " you can move to: " + ALLOWED.get(this));
        }
    }
}
