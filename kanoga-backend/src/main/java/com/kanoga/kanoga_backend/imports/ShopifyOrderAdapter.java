package com.kanoga.kanoga_backend.imports;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Translates a Shopify orders/create webhook into the canonical shape. */
@Component
public class ShopifyOrderAdapter implements WebhookOrderAdapter {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String source() {
        return "shopify";
    }

    @Override
    public String description() {
        return "Shopify orders/create webhook (HMAC-SHA256 signed)";
    }

    @Override
    public String setupInstructions() {
        return """
               In Shopify: Settings -> Notifications -> Webhooks -> Create webhook.
               Event: Order creation. Format: JSON.
               URL: paste the webhook URL shown above.
               Then copy Shopify's signing secret into this connection.""";
    }

    @Override
    public void verifyWebhook(String rawBody, Map<String, String> headers, String secret) {
        String signature = header(headers, "x-shopify-hmac-sha256");

        if (secret == null || secret.isBlank()) {
            throw new SecurityException("This connection has no signing secret configured");
        }
        if (signature == null || signature.isBlank()) {
            throw new SecurityException("Missing X-Shopify-Hmac-Sha256 header");
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            byte[] provided = Base64.getDecoder().decode(signature.trim());
            if (!MessageDigest.isEqual(expected, provided)) {
                throw new SecurityException("Shopify webhook signature does not match");
            }
        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            throw new SecurityException("Could not verify the Shopify webhook signature");
        }
    }

    @Override
    public void verify(String rawBody, Map<String, String> headers) {
        throw new SecurityException(
                "Shopify orders must arrive through a connection's webhook URL so the "
                        + "correct signing secret can be applied");
    }

    @Override
    public List<InboundOrder> parse(String rawBody) {
        JsonNode order;
        try {
            order = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            throw new IllegalArgumentException("Shopify payload is not valid JSON: " + e.getMessage());
        }

        String reference = firstNonBlank(
                order.path("name").asText(""),
                order.path("order_number").asText(""),
                order.path("id").asText(""));
        if (reference.isBlank()) {
            throw new IllegalArgumentException("Shopify payload has no order identifier");
        }
        // Shopify's `name` already carries a # prefix, e.g. "#1001".
        String orderNo = "SHOP-" + reference.replace("#", "");

        JsonNode customerNode = order.path("customer");
        JsonNode addressNode = order.has("shipping_address")
                ? order.path("shipping_address") : order.path("billing_address");

        String name = (customerNode.path("first_name").asText("") + " "
                + customerNode.path("last_name").asText("")).trim();
        if (name.isBlank()) {
            name = addressNode.path("name").asText("").trim();
        }
        if (name.isBlank()) name = "Shopify Customer";

        String email = firstNonBlank(
                order.path("email").asText(""),
                customerNode.path("email").asText(""),
                order.path("contact_email").asText(""));

        InboundCustomer customer = new InboundCustomer(
                name,
                nullIfBlank(email),
                nullIfBlank(addressNode.path("phone").asText("")),
                nullIfBlank(addressNode.path("address1").asText("")),
                nullIfBlank(addressNode.path("address2").asText("")),
                nullIfBlank(addressNode.path("city").asText("")),
                nullIfBlank(addressNode.path("country").asText("")),
                nullIfBlank(addressNode.path("zip").asText(""))
        );

        List<InboundLine> lines = new ArrayList<>();
        for (JsonNode item : order.path("line_items")) {
            String sku = firstNonBlank(
                    item.path("sku").asText(""),
                    item.path("barcode").asText(""));
            lines.add(new InboundLine(
                    nullIfBlank(sku),
                    nullIfBlank(item.path("title").asText("")),
                    Math.max(1, item.path("quantity").asInt(1))
            ));
        }
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Shopify order " + orderNo + " has no line items");
        }

        return List.of(new InboundOrder(
                orderNo, source(), mapStatus(order), null, customer, lines));
    }

    private String mapStatus(JsonNode order) {
        if (!order.path("cancelled_at").isNull() && !order.path("cancelled_at").asText("").isBlank()) {
            return "CANCELLED";
        }
        String fulfilment = order.path("fulfillment_status").asText("").toLowerCase(Locale.ROOT);
        if ("fulfilled".equals(fulfilment)) return "DISPATCHED";
        if ("partial".equals(fulfilment)) return "PICKING";
        return "NEW";
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank() && !"null".equals(v)) return v.trim();
        }
        return "";
    }

    private static String header(Map<String, String> headers, String name) {
        if (headers == null) return null;
        for (Map.Entry<String, String> e : headers.entrySet()) {
            if (e.getKey() != null && e.getKey().equalsIgnoreCase(name)) return e.getValue();
        }
        return null;
    }

    private static String nullIfBlank(String v) {
        return v == null || v.isBlank() || "null".equals(v) ? null : v;
    }
}
