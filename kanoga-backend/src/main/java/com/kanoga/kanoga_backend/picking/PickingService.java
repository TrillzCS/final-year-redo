package com.kanoga.kanoga_backend.picking;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PickingService {

    private final JdbcTemplate jdbc;

    public PickingService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Orders that still need picking, oldest first. */
    public List<PickingDtos.OutstandingOrder> outstanding() {
        return jdbc.query("""
            select o.id::text as order_id,
                   o.order_no,
                   o.status::text as status,
                   c.name as customer_name,
                   coalesce((select sum(oi.qty_ordered) from order_items oi
                             where oi.order_id = o.id), 0) as qty_ordered,
                   coalesce((select count(*) from assigned_units au
                             join order_items oi2 on oi2.id = au.order_item_id
                             where oi2.order_id = o.id and au.returned_at is null), 0) as qty_picked
            from orders o
            left join customers c on c.id = o.customer_id
            where o.status::text in ('NEW', 'PICKING')
            order by o.created_at asc
            """, (rs, n) -> new PickingDtos.OutstandingOrder(
                    rs.getString("order_id"),
                    rs.getString("order_no"),
                    rs.getString("customer_name"),
                    rs.getString("status"),
                    rs.getLong("qty_ordered"),
                    rs.getLong("qty_picked")));
    }

    /**
     * A pick sheet for the selected orders, grouped by product and sub-batch so the
     * shelves are walked once rather than once per order.
     */
    public PickingDtos.PickingList build(List<String> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one order");
        }

        List<UUID> ids = orderIds.stream().map(id -> {
            try {
                return UUID.fromString(id.trim());
            } catch (Exception e) {
                throw new IllegalArgumentException("'" + id + "' is not a valid order id");
            }
        }).toList();

        String placeholders = String.join(",", ids.stream().map(i -> "?").toList());

        List<Map<String, Object>> rows = jdbc.queryForList("""
            select o.order_no,
                   p.name as product_name,
                   p.sku,
                   p.barcode,
                   sb.code as sub_batch_code,
                   sb.expiry::text as expiry,
                   au.unit_serial_no as serial_no
            from assigned_units au
            join order_items oi on oi.id = au.order_item_id
            join orders o on o.id = oi.order_id
            join sub_batches sb on sb.id = au.sub_batch_id
            left join products p on p.id = sb.product_id
            where oi.order_id in (%s)
              and au.returned_at is null
            order by sb.expiry asc nulls last, sb.code, au.unit_serial_no
            """.formatted(placeholders), ids.toArray());

        if (rows.isEmpty()) {
            throw new IllegalArgumentException(
                    "None of those orders have units picked yet. Assign stock first, "
                            + "then print the sheet.");
        }

        Map<String, PickAccumulator> grouped = new LinkedHashMap<>();
        List<String> orderNumbers = new ArrayList<>();

        for (Map<String, Object> row : rows) {
            String subBatch = String.valueOf(row.get("sub_batch_code"));
            String key = subBatch + "|" + row.get("product_name");
            PickAccumulator acc = grouped.computeIfAbsent(key, k -> new PickAccumulator(
                    asString(row.get("product_name")),
                    asString(row.get("sku")),
                    asString(row.get("barcode")),
                    subBatch,
                    asString(row.get("expiry"))));

            acc.serials.add(((Number) row.get("serial_no")).intValue());

            String orderNo = asString(row.get("order_no"));
            if (orderNo != null && !acc.orderNumbers.contains(orderNo)) acc.orderNumbers.add(orderNo);
            if (orderNo != null && !orderNumbers.contains(orderNo)) orderNumbers.add(orderNo);
        }

        List<PickingDtos.PickLine> lines = grouped.values().stream()
                .map(a -> new PickingDtos.PickLine(
                        a.productName, a.sku, a.barcode, a.subBatchCode, a.expiry,
                        a.serials.size(), a.serials, a.orderNumbers))
                .toList();

        long unitCount = lines.stream().mapToLong(PickingDtos.PickLine::quantity).sum();

        return new PickingDtos.PickingList(
                OffsetDateTime.now().toString(), orderNumbers.size(), unitCount, orderNumbers, lines);
    }

    private static String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static class PickAccumulator {
        final String productName, sku, barcode, subBatchCode, expiry;
        final List<Integer> serials = new ArrayList<>();
        final List<String> orderNumbers = new ArrayList<>();

        PickAccumulator(String productName, String sku, String barcode,
                        String subBatchCode, String expiry) {
            this.productName = productName;
            this.sku = sku;
            this.barcode = barcode;
            this.subBatchCode = subBatchCode;
            this.expiry = expiry;
        }
    }
}
