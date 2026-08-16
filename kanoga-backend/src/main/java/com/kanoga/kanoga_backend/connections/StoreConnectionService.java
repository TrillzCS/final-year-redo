package com.kanoga.kanoga_backend.connections;

import com.kanoga.kanoga_backend.imports.ImportResultDto;
import com.kanoga.kanoga_backend.imports.InboundOrder;
import com.kanoga.kanoga_backend.imports.OrderImportService;
import com.kanoga.kanoga_backend.imports.StoreOrderAdapter;
import com.kanoga.kanoga_backend.imports.WebhookOrderAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Connecting a storefront without touching code. */
@Service
public class StoreConnectionService {

    private static final Logger log = LoggerFactory.getLogger(StoreConnectionService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final OrderImportService importService;
    private final List<StoreOrderAdapter> adapters;

    /** Public base URL of this backend, used to build the webhook address to copy. */
    @Value("${app.public-base-url:http://localhost:8081}")
    private String publicBaseUrl;

    public StoreConnectionService(JdbcTemplate jdbc,
                                  OrderImportService importService,
                                  List<StoreOrderAdapter> adapters) {
        this.jdbc = jdbc;
        this.importService = importService;
        this.adapters = adapters;
    }

    public List<StoreConnectionDto> list() {
        return jdbc.query("""
            select id::text as id, platform, display_name, store_url, active,
                   created_at::text as created_at, last_order_at::text as last_order_at,
                   orders_received, webhook_secret
            from store_connections
            order by created_at desc
            """, (rs, n) -> toDto(
                rs.getString("id"), rs.getString("platform"), rs.getString("display_name"),
                rs.getString("store_url"), rs.getBoolean("active"), rs.getString("created_at"),
                rs.getString("last_order_at"), rs.getInt("orders_received"),
                rs.getString("webhook_secret")));
    }

    @Transactional
    public StoreConnectionDto create(CreateConnectionRequest req) {
        if (req == null || req.platform() == null || req.platform().isBlank()) {
            throw new IllegalArgumentException("A platform is required");
        }
        String platform = req.platform().trim().toLowerCase(Locale.ROOT);
        if (!List.of("woocommerce", "shopify", "generic").contains(platform)) {
            throw new IllegalArgumentException(
                    "Unsupported platform '" + platform + "'. Supported: woocommerce, shopify, generic");
        }

        String displayName = req.displayName() == null || req.displayName().isBlank()
                ? platform + " store" : req.displayName().trim();

        String secret = req.secret() != null && !req.secret().isBlank()
                ? req.secret().trim() : generateSecret();

        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into store_connections (id, platform, display_name, store_url, webhook_secret)
            values (?, ?, ?, ?, ?)
            """, id, platform, displayName,
                req.storeUrl() == null || req.storeUrl().isBlank() ? null : req.storeUrl().trim(),
                secret);

        log.info("Created {} connection '{}'", platform, displayName);
        return get(id);
    }

    @Transactional
    public StoreConnectionDto setActive(String connectionId, boolean active) {
        UUID id = parseId(connectionId);
        int rows = jdbc.update("update store_connections set active = ? where id = ?", active, id);
        if (rows == 0) throw new IllegalArgumentException("Connection not found");
        return get(id);
    }

    /** Issues a fresh secret, e.g. */
    @Transactional
    public StoreConnectionDto rotateSecret(String connectionId) {
        UUID id = parseId(connectionId);
        int rows = jdbc.update(
                "update store_connections set webhook_secret = ? where id = ?", generateSecret(), id);
        if (rows == 0) throw new IllegalArgumentException("Connection not found");
        log.info("Rotated webhook secret for connection {}", id);
        return get(id);
    }

    /** Handles an inbound webhook for one connection. */
    @Transactional
    public ImportResultDto handleWebhook(String connectionId, String rawBody,
                                         Map<String, String> headers) {
        UUID id = parseId(connectionId);

        List<Map<String, Object>> rows = jdbc.queryForList("""
            select platform, webhook_secret, active from store_connections where id = ? limit 1
            """, id);
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Unknown connection");
        }

        Map<String, Object> row = rows.get(0);
        if (!Boolean.TRUE.equals(row.get("active"))) {
            throw new IllegalArgumentException("This connection is disabled");
        }

        String platform = String.valueOf(row.get("platform"));
        String secret = String.valueOf(row.get("webhook_secret"));

        StoreOrderAdapter adapter = adapters.stream()
                .filter(a -> a.source().equalsIgnoreCase(platform))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "No adapter registered for platform '" + platform + "'"));

        if (adapter instanceof WebhookOrderAdapter webhookAdapter) {
            webhookAdapter.verifyWebhook(rawBody, headers, secret);
        } else {
            adapter.verify(rawBody, headers);
        }

        List<InboundOrder> orders = adapter.parse(rawBody);
        ImportResultDto result = importService.persist(adapter.source(), orders);

        jdbc.update("""
            update store_connections
            set last_order_at = now(), orders_received = orders_received + ?
            where id = ?
            """, result.importedCount(), id);

        return result;
    }

    private StoreConnectionDto get(UUID id) {
        return jdbc.queryForObject("""
            select id::text as id, platform, display_name, store_url, active,
                   created_at::text as created_at, last_order_at::text as last_order_at,
                   orders_received, webhook_secret
            from store_connections where id = ?
            """, (rs, n) -> toDto(
                rs.getString("id"), rs.getString("platform"), rs.getString("display_name"),
                rs.getString("store_url"), rs.getBoolean("active"), rs.getString("created_at"),
                rs.getString("last_order_at"), rs.getInt("orders_received"),
                rs.getString("webhook_secret")), id);
    }

    private StoreConnectionDto toDto(String id, String platform, String displayName,
                                     String storeUrl, boolean active, String createdAt,
                                     String lastOrderAt, int ordersReceived, String secret) {
        String steps = adapters.stream()
                .filter(a -> a.source().equalsIgnoreCase(platform))
                .filter(a -> a instanceof WebhookOrderAdapter)
                .map(a -> ((WebhookOrderAdapter) a).setupInstructions())
                .findFirst()
                .orElse("Post orders in canonical JSON to the URL above.");

        return new StoreConnectionDto(
                id, platform, displayName, storeUrl, active, createdAt, lastOrderAt,
                ordersReceived,
                trimTrailingSlash(publicBaseUrl) + "/api/connections/" + id + "/webhook",
                secret, steps);
    }

    private static String generateSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String trimTrailingSlash(String v) {
        return v != null && v.endsWith("/") ? v.substring(0, v.length() - 1) : v;
    }

    private static UUID parseId(String raw) {
        try {
            return UUID.fromString(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException("'" + raw + "' is not a valid connection id");
        }
    }
}
