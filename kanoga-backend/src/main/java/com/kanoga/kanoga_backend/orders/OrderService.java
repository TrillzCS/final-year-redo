package com.kanoga.kanoga_backend.orders;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderService {

    private final JdbcTemplate jdbc;

    public OrderService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private void requireOrderExists(UUID orderId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "select id from orders where id = ? limit 1", orderId
        );
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Order not found");
        }
    }

    public List<OrderResponseDto> getAllOrders() {
        String sql = """
            select o.id, o.order_no, c.name as customer_name, c.email as customer_email
            from orders o
            left join customers c on c.id = o.customer_id
            order by o.created_at desc
            """;

        return jdbc.query(sql, (rs, rowNum) -> new OrderResponseDto(
                UUID.fromString(rs.getString("id")),
                rs.getString("order_no"),
                rs.getString("customer_name"),
                rs.getString("customer_email")
        ));
    }

    @Transactional
    public OrderResponseDto createOrder(CreateOrderRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }

        String orderNo = request.orderNumber() != null ? request.orderNumber().trim() : "";
        String customerName = request.customerName() != null ? request.customerName().trim() : "";
        String customerEmail = request.customerEmail() != null ? request.customerEmail().trim() : "";

        if (orderNo.isEmpty()) {
            throw new IllegalArgumentException("orderNumber is required");
        }

        // Find existing customer by email
        UUID customerId = null;
        String resolvedName = customerName.isEmpty() ? "Guest" : customerName;

        if (!customerEmail.isEmpty()) {
            List<Map<String, Object>> existing = jdbc.queryForList(
                    "select id, name from customers where email = ? limit 1",
                    customerEmail
            );
            if (!existing.isEmpty()) {
                customerId = UUID.fromString(existing.get(0).get("id").toString());
                resolvedName = existing.get(0).get("name").toString();
            }
        }

        // Create customer if not found
        if (customerId == null) {
            customerId = UUID.randomUUID();
            jdbc.update(
                    "insert into customers (id, name, email) values (?, ?, ?)",
                    customerId,
                    resolvedName,
                    customerEmail.isEmpty() ? null : customerEmail
            );
        }

        // Create order
        UUID orderId = UUID.randomUUID();
        jdbc.update(
                "insert into orders (id, order_no, customer_id) values (?, ?, ?)",
                orderId,
                orderNo,
                customerId
        );

        return new OrderResponseDto(
                orderId,
                orderNo,
                resolvedName,
                customerEmail.isEmpty() ? null : customerEmail
        );
    }

    @Transactional
    public List<AssignedLabelDto> assignUnits(String orderId, AssignRequest req) {
        UUID orderUUID = UUID.fromString(orderId);
        requireOrderExists(orderUUID);

        if (req == null || req.subBatchId() == null || req.quantity() == null || req.quantity() <= 0) {
            throw new IllegalArgumentException("subBatchId and quantity are required");
        }

        UUID subBatchUUID = UUID.fromString(req.subBatchId().toString());

        String sql = """
            select serial_no
            from labels
            where sub_batch_id = ?
              and serial_no not in (
                select unit_serial_no from assigned_units where sub_batch_id = ?
              )
            order by serial_no asc
            limit ?
            """;

        List<Integer> serials = jdbc.queryForList(sql, Integer.class,
                subBatchUUID, subBatchUUID, req.quantity());

        if (serials.size() < req.quantity()) {
            throw new IllegalArgumentException("Not enough unassigned units available in this sub-batch");
        }

        UUID orderItemId = UUID.randomUUID();
        jdbc.update("""
            insert into order_items (id, order_id, product_id, qty_ordered)
            select ?, o.id, sb.product_id, ?
            from orders o, sub_batches sb
            where o.id = ? and sb.id = ?
            """,
                orderItemId, req.quantity(), orderUUID, subBatchUUID
        );

        for (Integer serial : serials) {
            jdbc.update("""
                insert into assigned_units (id, order_item_id, sub_batch_id, unit_serial_no)
                values (?, ?, ?, ?)
                """,
                    UUID.randomUUID(), orderItemId, subBatchUUID, serial
            );
        }

        return serials.stream().map(serial ->
                new AssignedLabelDto(serial.longValue(), serial, req.subBatchId())
        ).toList();
    }

    @Transactional
    public AssignByQrResponse assignByQr(String orderId, AssignByQrRequest req) {
        UUID orderUUID = UUID.fromString(orderId);
        requireOrderExists(orderUUID);

        if (req == null || req.qrPayload() == null || req.qrPayload().trim().isEmpty()) {
            throw new IllegalArgumentException("qrPayload is required");
        }

        String payload = req.qrPayload().trim();

        List<Map<String, Object>> labelRows = jdbc.queryForList(
                "select sub_batch_id, serial_no from labels where qr_payload = ? limit 1",
                payload
        );

        if (labelRows.isEmpty()) {
            throw new IllegalArgumentException("Label not found for this QR payload");
        }

        UUID subBatchId = UUID.fromString(labelRows.get(0).get("sub_batch_id").toString());
        int serialNo = ((Number) labelRows.get(0).get("serial_no")).intValue();

        boolean alreadyAssigned = !jdbc.queryForList(
                "select id from assigned_units where sub_batch_id = ? and unit_serial_no = ? limit 1",
                subBatchId, serialNo
        ).isEmpty();

        if (alreadyAssigned) {
            throw new IllegalArgumentException("This unit is already assigned");
        }

        UUID orderItemId = UUID.randomUUID();
        jdbc.update("""
            insert into order_items (id, order_id, product_id, qty_ordered)
            select ?, o.id, sb.product_id, 1
            from orders o, sub_batches sb
            where o.id = ? and sb.id = ?
            """,
                orderItemId, orderUUID, subBatchId
        );

        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("""
            insert into assigned_units (id, order_item_id, sub_batch_id, unit_serial_no)
            values (?, ?, ?, ?)
            """,
                UUID.randomUUID(), orderItemId, subBatchId, serialNo
        );

        return new AssignByQrResponse(
                orderId,
                (long) serialNo,
                serialNo,
                subBatchId.getMostSignificantBits(),
                now
        );
    }

    @Transactional(readOnly = true)
    public List<OrderAssignedUnitDto> listAssignedUnits(String orderId) {
        UUID orderUUID = UUID.fromString(orderId);
        requireOrderExists(orderUUID);

        String sql = """
        select
          au.id as assigned_id,
          oi.order_id,
          au.unit_serial_no,
          au.sub_batch_id
        from assigned_units au
        join order_items oi on oi.id = au.order_item_id
        where oi.order_id = ?
        order by au.unit_serial_no
        """;

        return jdbc.query(sql, (rs, rowNum) -> new OrderAssignedUnitDto(
                0L,
                0L,
                rs.getLong("unit_serial_no"),
                null,
                rs.getInt("unit_serial_no"),
                0L
        ), orderUUID);
    }
}