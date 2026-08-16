package com.kanoga.kanoga_backend.imports;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Accepts orders in the system's own canonical JSON shape. */
@Component
public class GenericJsonOrderAdapter implements StoreOrderAdapter {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String source() {
        return "json";
    }

    @Override
    public String description() {
        return "Canonical JSON: { orders: [ { orderNo, customer: {...}, lines: [ { sku, productName, quantity } ] } ] }";
    }

    @Override
    public void verify(String rawBody, Map<String, String> headers) {
    }

    @Override
    public List<InboundOrder> parse(String rawBody) {
        if (rawBody == null || rawBody.isBlank()) {
            throw new IllegalArgumentException("The request body is empty");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            throw new IllegalArgumentException("Body is not valid JSON: " + e.getMessage());
        }

        JsonNode ordersNode =
                root.isArray() ? root
                        : root.has("orders") ? root.path("orders")
                        : null;

        List<InboundOrder> orders = new ArrayList<>();
        if (ordersNode == null) {
            orders.add(readOrder(root, 1));
        } else {
            if (!ordersNode.isArray()) {
                throw new IllegalArgumentException("'orders' must be an array");
            }
            int i = 1;
            for (JsonNode node : ordersNode) {
                orders.add(readOrder(node, i++));
            }
        }

        if (orders.isEmpty()) {
            throw new IllegalArgumentException("No orders found in the payload");
        }
        return orders;
    }

    private InboundOrder readOrder(JsonNode node, int position) {
        String orderNo = node.path("orderNo").asText("").trim();
        if (orderNo.isEmpty()) {
            throw new IllegalArgumentException("Order " + position + ": orderNo is required");
        }

        JsonNode customerNode = node.path("customer");
        InboundCustomer customer = new InboundCustomer(
                text(customerNode, "name"),
                text(customerNode, "email"),
                text(customerNode, "phone"),
                text(customerNode, "address1"),
                text(customerNode, "address2"),
                text(customerNode, "city"),
                text(customerNode, "country"),
                text(customerNode, "postcode")
        );

        List<InboundLine> lines = new ArrayList<>();
        JsonNode linesNode = node.path("lines");
        if (!linesNode.isArray() || linesNode.isEmpty()) {
            throw new IllegalArgumentException(
                    "Order " + orderNo + ": at least one line is required");
        }
        for (JsonNode line : linesNode) {
            String sku = text(line, "sku");
            String productName = text(line, "productName");
            if (sku == null && productName == null) {
                throw new IllegalArgumentException(
                        "Order " + orderNo + ": every line needs a sku or a productName");
            }
            int quantity = line.path("quantity").asInt(0);
            if (quantity <= 0) {
                throw new IllegalArgumentException(
                        "Order " + orderNo + ": quantity must be greater than zero");
            }
            lines.add(new InboundLine(sku, productName, quantity));
        }

        String status = text(node, "status");
        OffsetDateTime placedAt = null;
        String rawPlacedAt = text(node, "placedAt");
        if (rawPlacedAt != null) {
            try {
                placedAt = OffsetDateTime.parse(rawPlacedAt);
            } catch (Exception e) {
                throw new IllegalArgumentException(
                        "Order " + orderNo + ": placedAt '" + rawPlacedAt
                                + "' is not a valid ISO-8601 timestamp");
            }
        }

        return new InboundOrder(
                orderNo,
                source(),
                status == null ? null : status.toUpperCase(Locale.ROOT),
                placedAt,
                customer,
                lines
        );
    }

    private static String text(JsonNode node, String field) {
        String v = node.path(field).asText("").trim();
        return v.isEmpty() ? null : v;
    }
}
