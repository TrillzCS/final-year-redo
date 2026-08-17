package com.kanoga.kanoga_backend.imports;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Writes canonical InboundOrders to the database. */
@Service
public class OrderImportService {

    private static final Logger log = LoggerFactory.getLogger(OrderImportService.class);

    private final JdbcTemplate jdbc;
    private final List<StoreOrderAdapter> adapters;

    public OrderImportService(JdbcTemplate jdbc, List<StoreOrderAdapter> adapters) {
        this.jdbc = jdbc;
        this.adapters = adapters;
    }

    /** All registered adapters, for the import screen to list. */
    public List<StoreOrderAdapter> availableAdapters() {
        return adapters;
    }

    public StoreOrderAdapter adapterFor(String source) {
        if (source == null || source.isBlank()) {
            throw new IllegalArgumentException("An import source is required");
        }
        return adapters.stream()
                .filter(a -> a.source().equalsIgnoreCase(source.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown import source '" + source + "'. Available: "
                                + adapters.stream().map(StoreOrderAdapter::source)
                                        .collect(Collectors.joining(", "))));
    }

    /** Runs the full pipeline for one payload: verify, parse, persist. */
    @Transactional
    public ImportResultDto importFrom(String source, String rawBody, Map<String, String> headers) {
        StoreOrderAdapter adapter = adapterFor(source);
        adapter.verify(rawBody, headers);
        return persist(adapter.source(), adapter.parse(rawBody));
    }

    /** Persists already-parsed orders. */
    @Transactional
    public ImportResultDto persist(String source, List<InboundOrder> orders) {
        return persist(source, orders, null);
    }

    /** @param connectionId the store connection this batch arrived through, if any */
    @Transactional
    public ImportResultDto persist(String source, List<InboundOrder> orders, UUID connectionId) {
        List<String> imported = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        for (InboundOrder order : orders) {
            if (orderExists(order.orderNo())) {
                skipped.add(order.orderNo());
                continue;
            }
            writeOrder(order, source, connectionId, warnings);
            imported.add(order.orderNo());
        }

        log.info("Import from {}: {} written, {} already present, {} warnings",
                source, imported.size(), skipped.size(), warnings.size());

        return new ImportResultDto(
                source, imported.size(), skipped.size(), imported, skipped, warnings);
    }

    private boolean orderExists(String orderNo) {
        return !jdbc.queryForList(
                "select id from orders where order_no = ? limit 1", orderNo).isEmpty();
    }

    private void writeOrder(InboundOrder order, String source, UUID connectionId, List<String> warnings) {
        UUID customerId = findOrCreateCustomer(order.customer());
        UUID orderId = UUID.randomUUID();

        if (order.status() != null && !order.status().isBlank()) {
            jdbc.update("""
                insert into orders (id, order_no, customer_id, status, placed_at, created_at,
                                    source, source_connection_id)
                values (?, ?, ?, ?::order_status, coalesce(?, now()), now(), ?, ?)
                """, orderId, order.orderNo(), customerId, order.status(), order.placedAt(),
                    source, connectionId);
        } else {
            jdbc.update("""
                insert into orders (id, order_no, customer_id, placed_at, created_at,
                                    source, source_connection_id)
                values (?, ?, ?, coalesce(?, now()), now(), ?, ?)
                """, orderId, order.orderNo(), customerId, order.placedAt(), source, connectionId);
        }

        for (InboundLine line : order.lines()) {
            UUID productId = findProductId(line.sku(), line.productName());
            if (productId == null) {
                warnings.add("Order " + order.orderNo() + ": no catalogue product matches "
                        + describe(line) + " — line skipped");
                continue;
            }
            jdbc.update(
                    "insert into order_items (id, order_id, product_id, qty_ordered) values (?, ?, ?, ?)",
                    UUID.randomUUID(), orderId, productId, line.quantity());
        }
    }

    private static String describe(InboundLine line) {
        if (line.sku() != null && line.productName() != null) {
            return "sku '" + line.sku() + "' or name '" + line.productName() + "'";
        }
        return line.sku() != null ? "sku '" + line.sku() + "'" : "name '" + line.productName() + "'";
    }

    private UUID findOrCreateCustomer(InboundCustomer customer) {
        String name = customer == null || customer.name() == null || customer.name().isBlank()
                ? "Guest" : customer.name().trim();
        String email = customer == null || customer.email() == null || customer.email().isBlank()
                ? null : customer.email().trim();

        if (email != null) {
            List<Map<String, Object>> existing = jdbc.queryForList(
                    "select id from customers where email = ? limit 1", email);
            if (!existing.isEmpty()) {
                UUID id = UUID.fromString(existing.get(0).get("id").toString());
                jdbc.update("update customers set name = ? where id = ?", name, id);
                return id;
            }
        }

        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into customers (id, name, email, phone, address1, address2, city, country, eircode)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                id, name, email,
                customer == null ? null : customer.phone(),
                customer == null ? null : customer.address1(),
                customer == null ? null : customer.address2(),
                customer == null ? null : customer.city(),
                customer == null ? null : customer.country(),
                customer == null ? null : customer.postcode());
        return id;
    }

    /** Resolves a catalogue product by SKU, then exact name, then partial name. */
    private UUID findProductId(String sku, String name) {
        if (sku != null && !sku.isBlank()) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "select id from products where sku = ? limit 1", sku.trim());
            if (!rows.isEmpty()) return UUID.fromString(rows.get(0).get("id").toString());
        }
        if (name != null && !name.isBlank()) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "select id from products where lower(name) = lower(?) limit 1", name.trim());
            if (!rows.isEmpty()) return UUID.fromString(rows.get(0).get("id").toString());

            rows = jdbc.queryForList(
                    "select id from products where lower(name) like lower(?) limit 1",
                    "%" + name.trim() + "%");
            if (!rows.isEmpty()) return UUID.fromString(rows.get(0).get("id").toString());
        }
        return null;
    }
}
