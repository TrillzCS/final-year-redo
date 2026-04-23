package com.kanoga.kanoga_backend.woocommerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WooCommerceService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${woocommerce.webhook.secret}")
    private String webhookSecret;

    public WooCommerceService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void handleWebhook(String topic, String signature, String rawBody) throws Exception {
        // Validate signature
        if (!isValidSignature(rawBody, signature)) {
            throw new SecurityException("Invalid webhook signature");
        }

        if (topic == null) return;

        JsonNode payload = objectMapper.readTree(rawBody);

        switch (topic) {
            case "order.created" -> handleOrderCreated(payload);
            case "order.updated" -> handleOrderUpdated(payload);
            default -> {} // ignore other topics
        }
    }

    @Transactional
    private void handleOrderCreated(JsonNode order) {
        String wooOrderId = order.path("id").asText();
        String orderNo = "WOO-" + wooOrderId;

        // Check if order already exists
        List<Map<String, Object>> existing = jdbc.queryForList(
                "select id from orders where order_no = ? limit 1", orderNo
        );
        if (!existing.isEmpty()) return;

        // Extract customer details from billing
        JsonNode billing = order.path("billing");
        String firstName = billing.path("first_name").asText("");
        String lastName = billing.path("last_name").asText("");
        String customerName = (firstName + " " + lastName).trim();
        String customerEmail = billing.path("email").asText("");
        String phone = billing.path("phone").asText("");
        String address1 = billing.path("address_1").asText("");
        String address2 = billing.path("address_2").asText("");
        String city = billing.path("city").asText("");
        String country = billing.path("country").asText("");
        String postcode = billing.path("postcode").asText("");

        if (customerName.isEmpty()) customerName = "WooCommerce Customer";

        // Find or create customer
        UUID customerId = null;
        if (!customerEmail.isEmpty()) {
            List<Map<String, Object>> existingCustomer = jdbc.queryForList(
                    "select id from customers where email = ? limit 1", customerEmail
            );
            if (!existingCustomer.isEmpty()) {
                customerId = UUID.fromString(existingCustomer.get(0).get("id").toString());
            }
        }

        if (customerId == null) {
            customerId = UUID.randomUUID();
            jdbc.update(
                    """
                    insert into customers (id, name, email, phone, address1, address2, city, country, eircode)
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    customerId,
                    customerName,
                    customerEmail.isEmpty() ? null : customerEmail,
                    phone.isEmpty() ? null : phone,
                    address1.isEmpty() ? null : address1,
                    address2.isEmpty() ? null : address2,
                    city.isEmpty() ? null : city,
                    country.isEmpty() ? null : country,
                    postcode.isEmpty() ? null : postcode
            );
        }

        // Create order
        UUID orderId = UUID.randomUUID();
        String wooStatus = order.path("status").asText("pending");
        String mappedStatus = mapWooStatus(wooStatus);

        jdbc.update(
                """
                insert into orders (id, order_no, customer_id, status, placed_at, created_at)
                values (?, ?, ?, ?::order_status, now(), now())
                """,
                orderId, orderNo, customerId, mappedStatus
        );

        // Create order items from line items
        JsonNode lineItems = order.path("line_items");
        for (JsonNode item : lineItems) {
            String sku = item.path("sku").asText("");
            int qty = item.path("quantity").asInt(1);

            // Look up product by SKU first, then fall back to case-insensitive name match
            UUID productId = findProductId(sku, item.path("name").asText(""));

            UUID orderItemId = UUID.randomUUID();
            jdbc.update(
                    "insert into order_items (id, order_id, product_id, qty_ordered) values (?, ?, ?, ?)",
                    orderItemId, orderId, productId, qty
            );
        }
    }

    @Transactional
    private void handleOrderUpdated(JsonNode order) {
        String wooOrderId = order.path("id").asText();
        String orderNo = "WOO-" + wooOrderId;
        String wooStatus = order.path("status").asText();
        String mappedStatus = mapWooStatus(wooStatus);

        jdbc.update(
                "update orders set status = ?::order_status where order_no = ?",
                mappedStatus, orderNo
        );
    }

    private UUID findProductId(String sku, String name) {
        // Try SKU match first
        if (!sku.isEmpty()) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "select id from products where sku = ? limit 1", sku
            );
            if (!rows.isEmpty()) {
                return UUID.fromString(rows.get(0).get("id").toString());
            }
        }

        // Fall back to case-insensitive name match
        if (!name.isEmpty()) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "select id from products where lower(name) = lower(?) limit 1", name
            );
            if (!rows.isEmpty()) {
                return UUID.fromString(rows.get(0).get("id").toString());
            }

            // Try partial name match as last resort
            List<Map<String, Object>> partialRows = jdbc.queryForList(
                    "select id from products where lower(name) like lower(?) limit 1",
                    "%" + name + "%"
            );
            if (!partialRows.isEmpty()) {
                return UUID.fromString(partialRows.get(0).get("id").toString());
            }
        }

        return null;
    }

    private String mapWooStatus(String wooStatus) {
        return switch (wooStatus) {
            case "processing", "on-hold" -> "NEW";
            case "completed" -> "DISPATCHED";
            case "cancelled", "refunded", "failed" -> "CANCELLED";
            default -> "NEW";
        };
    }

    private boolean isValidSignature(String body, String signature) {
        if (signature == null || signature.isEmpty()) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    webhookSecret.getBytes(), "HmacSHA256"
            );
            mac.init(secretKey);
            byte[] hash = mac.doFinal(body.getBytes());
            String computed = Base64.getEncoder().encodeToString(hash);
            return computed.equals(signature);
        } catch (Exception e) {
            return false;
        }
    }
}