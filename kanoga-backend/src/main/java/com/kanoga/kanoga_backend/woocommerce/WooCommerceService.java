package com.kanoga.kanoga_backend.woocommerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kanoga.kanoga_backend.imports.ImportResultDto;
import com.kanoga.kanoga_backend.imports.InboundOrder;
import com.kanoga.kanoga_backend.imports.OrderImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** Handles WooCommerce webhook topics. */
@Service
public class WooCommerceService {

    private static final Logger log = LoggerFactory.getLogger(WooCommerceService.class);

    private final JdbcTemplate jdbc;
    private final OrderImportService importService;
    private final WooCommerceOrderAdapter adapter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WooCommerceService(JdbcTemplate jdbc,
                              OrderImportService importService,
                              WooCommerceOrderAdapter adapter) {
        this.jdbc = jdbc;
        this.importService = importService;
        this.adapter = adapter;
    }

    /** Entry point for an incoming webhook. */
    public void handleWebhook(String topic, String signature, String rawBody) {
        Map<String, String> headers = Map.of(
                "x-wc-webhook-signature", signature == null ? "" : signature);

        adapter.verify(rawBody, headers);

        if (topic == null) return;

        switch (topic) {
            case "order.created" -> handleOrderCreated(rawBody);
            case "order.updated" -> handleOrderUpdated(rawBody);
            default -> log.debug("Ignoring unhandled WooCommerce topic '{}'", topic);
        }
    }

    @Transactional
    public void handleOrderCreated(String rawBody) {
        List<InboundOrder> orders = adapter.parse(rawBody);
        ImportResultDto result = importService.persist(adapter.source(), orders);
        result.warnings().forEach(w -> log.warn("WooCommerce import: {}", w));
    }

    /** Applies a status change to an order that was previously imported. */
    @Transactional
    public void handleOrderUpdated(String rawBody) {
        JsonNode order;
        try {
            order = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            throw new IllegalArgumentException("Webhook body is not valid JSON: " + e.getMessage());
        }

        String orderNo = "WOO-" + order.path("id").asText("");
        String mappedStatus = adapter.mapStatus(order.path("status").asText(""));

        int rows = jdbc.update(
                "update orders set status = ?::order_status where order_no = ?",
                mappedStatus, orderNo);

        if (rows == 0) {
            log.warn("WooCommerce sent an update for {}, which is not in the system — ignoring",
                    orderNo);
            return;
        }

        JsonNode billing = order.path("billing");
        String name = (billing.path("first_name").asText("") + " "
                + billing.path("last_name").asText("")).trim();
        if (!name.isEmpty()) {
            jdbc.update("""
                update customers set name = ?
                where id = (select customer_id from orders where order_no = ? limit 1)
                """, name, orderNo);
        }
    }
}
