package com.kanoga.kanoga_backend.Alerts;

import com.kanoga.kanoga_backend.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Raises the operational alerts a stock-holding business actually runs on. */
@Service
public class StockAlertService {

    private static final Logger log = LoggerFactory.getLogger(StockAlertService.class);

    private final JdbcTemplate jdbc;
    private final AppProperties app;

    public StockAlertService(JdbcTemplate jdbc, AppProperties app) {
        this.jdbc = jdbc;
        this.app = app;
    }

    /** Every five minutes: stock levels move far more slowly than expiry dates. */
    @Scheduled(fixedRateString = "${app.defaults.low-stock-check-ms:300000}")
    @Transactional
    public void checkLowStock() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            select p.id::text            as product_id,
                   p.name                as product_name,
                   p.low_stock_threshold as threshold,
                   p.reorder_quantity    as reorder_quantity,
                   coalesce(sum(
                       case when au.unit_serial_no is null then 1 else 0 end
                   ), 0) as available
            from products p
            left join sub_batches sb on sb.product_id = p.id
            left join labels l on l.sub_batch_id = sb.id and l.written_off_at is null
            left join assigned_units au
                   on au.sub_batch_id = l.sub_batch_id
                  and au.unit_serial_no = l.serial_no
            where p.low_stock_threshold is not null
              and p.active is true
            group by p.id, p.name, p.low_stock_threshold, p.reorder_quantity
            """);

        for (Map<String, Object> row : rows) {
            UUID productId = UUID.fromString(String.valueOf(row.get("product_id")));
            long available = toLong(row.get("available"));
            long threshold = toLong(row.get("threshold"));
            String productName = String.valueOf(row.get("product_name"));

            if (available <= threshold) {
                String severity = available == 0 ? "CRITICAL" : "HIGH";
                Object reorder = row.get("reorder_quantity");
                String message = available == 0
                        ? "Out of stock: " + productName + " has no unassigned units left"
                        : "Low stock: " + productName + " is down to " + available
                                + " unit(s), at or below the reorder point of " + threshold
                                + (reorder == null ? "" : ". Suggested reorder: " + reorder + " units");

                raise("product", productId, "LOW_STOCK", severity, message);
            } else {
                resolve("product", productId, "LOW_STOCK");
            }
        }
    }

    /** Inserts an alert unless an unresolved one already exists for the same target. */
    private void raise(String targetType, UUID targetId, String type, String severity, String message) {
        boolean open = !jdbc.queryForList("""
            select id from alerts
            where target_type = ? and target_id = ? and type = ? and resolved_at is null
            limit 1
            """, targetType, targetId, type).isEmpty();

        if (open) return;

        jdbc.update("""
            insert into alerts (id, type, target_type, target_id, message, severity, created_at)
            values (?, ?, ?, ?, ?, ?, ?)
            on conflict do nothing
            """, UUID.randomUUID(), type, targetType, targetId, message, severity,
                OffsetDateTime.now());

        log.info("Raised {} alert for {} {}", type, targetType, targetId);
    }

    /** Clears an open alert once the condition that caused it no longer holds. */
    private void resolve(String targetType, UUID targetId, String type) {
        int cleared = jdbc.update("""
            update alerts set resolved_at = now()
            where target_type = ? and target_id = ? and type = ? and resolved_at is null
            """, targetType, targetId, type);

        if (cleared > 0) {
            log.info("Resolved {} alert for {} {} — condition no longer applies",
                    type, targetType, targetId);
        }
    }

    private static long toLong(Object v) {
        return v instanceof Number n ? n.longValue() : 0L;
    }
}
