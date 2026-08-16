package com.kanoga.kanoga_backend.woocommerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kanoga.kanoga_backend.imports.InboundCustomer;
import com.kanoga.kanoga_backend.imports.InboundLine;
import com.kanoga.kanoga_backend.imports.InboundOrder;
import com.kanoga.kanoga_backend.imports.WebhookOrderAdapter;
import org.springframework.beans.factory.annotation.Value;
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

/** Translates a WooCommerce order webhook into the canonical shape. */
@Component
public class WooCommerceOrderAdapter implements WebhookOrderAdapter {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${woocommerce.webhook.secret:}")
    private String webhookSecret;

    @Override
    public String source() {
        return "woocommerce";
    }

    @Override
    public String description() {
        return "WooCommerce order webhook (HMAC-SHA256 signed)";
    }

    /** Validates the X-WC-Webhook-Signature header against the raw body. */
    @Override
    public String setupInstructions() {
        return """
               In WordPress: WooCommerce -> Settings -> Advanced -> Webhooks -> Add webhook.
               Topic: Order created. Delivery URL: paste the webhook URL shown above.
               Secret: paste this connection's secret. Set Status to Active.""";
    }

    /** Legacy path: verifies against the single secret in application configuration. */
    @Override
    public void verify(String rawBody, Map<String, String> headers) {
        verifyWebhook(rawBody, headers, webhookSecret);
    }

    @Override
    public void verifyWebhook(String rawBody, Map<String, String> headers, String secret) {
        String signature = header(headers, "x-wc-webhook-signature");

        if (secret == null || secret.isBlank()) {
            throw new SecurityException("This connection has no signing secret configured");
        }
        if (signature == null || signature.isBlank()) {
            throw new SecurityException("Missing webhook signature");
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            byte[] provided = Base64.getDecoder().decode(signature);
            if (!MessageDigest.isEqual(expected, provided)) {
                throw new SecurityException("Webhook signature does not match");
            }
        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            throw new SecurityException("Could not verify the webhook signature");
        }
    }

    @Override
    public List<InboundOrder> parse(String rawBody) {
        JsonNode order;
        try {
            order = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            throw new IllegalArgumentException("Webhook body is not valid JSON: " + e.getMessage());
        }

        String wooId = order.path("id").asText("");
        if (wooId.isEmpty()) {
            throw new IllegalArgumentException("Webhook payload has no order id");
        }

        JsonNode billing = order.path("billing");
        String name = (billing.path("first_name").asText("") + " "
                + billing.path("last_name").asText("")).trim();
        if (name.isEmpty()) name = "WooCommerce Customer";

        InboundCustomer customer = new InboundCustomer(
                name,
                nullIfBlank(billing.path("email").asText("")),
                nullIfBlank(billing.path("phone").asText("")),
                nullIfBlank(billing.path("address_1").asText("")),
                nullIfBlank(billing.path("address_2").asText("")),
                nullIfBlank(billing.path("city").asText("")),
                nullIfBlank(billing.path("country").asText("")),
                nullIfBlank(billing.path("postcode").asText(""))
        );

        List<InboundLine> lines = new ArrayList<>();
        for (JsonNode item : order.path("line_items")) {
            lines.add(new InboundLine(
                    nullIfBlank(item.path("sku").asText("")),
                    nullIfBlank(item.path("name").asText("")),
                    Math.max(1, item.path("quantity").asInt(1))
            ));
        }

        return List.of(new InboundOrder(
                "WOO-" + wooId,
                source(),
                mapStatus(order.path("status").asText("pending")),
                null,
                customer,
                lines
        ));
    }

    /** Maps WooCommerce's order states onto the internal order_status enum. */
    public String mapStatus(String wooStatus) {
        return switch (wooStatus == null ? "" : wooStatus.toLowerCase(Locale.ROOT)) {
            case "completed" -> "DISPATCHED";
            case "cancelled", "refunded", "failed" -> "CANCELLED";
            default -> "NEW";
        };
    }

    private static String header(Map<String, String> headers, String name) {
        if (headers == null) return null;
        for (Map.Entry<String, String> e : headers.entrySet()) {
            if (e.getKey() != null && e.getKey().equalsIgnoreCase(name)) return e.getValue();
        }
        return null;
    }

    private static String nullIfBlank(String v) {
        return v == null || v.isBlank() ? null : v;
    }
}
