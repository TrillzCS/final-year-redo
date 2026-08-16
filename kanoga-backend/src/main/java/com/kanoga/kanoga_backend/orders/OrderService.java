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

    /** Every order with its fulfilment progress. */
    public List<OrderSummaryDto> getAllOrders() {
        String sql = """
            select
                o.id::text            as id,
                o.order_no            as order_no,
                o.status::text        as status,
                o.placed_at::text     as placed_at,
                o.dispatched_at::text as dispatched_at,
                c.name                as customer_name,
                c.email               as customer_email,
                coalesce((
                    select sum(oi.qty_ordered) from order_items oi
                    where oi.order_id = o.id
                ), 0) as qty_ordered,
                coalesce((
                    select count(*) from assigned_units au
                    join order_items oi2 on oi2.id = au.order_item_id
                    where oi2.order_id = o.id and au.returned_at is null
                ), 0) as qty_assigned,
                coalesce((
                    select count(*) from assigned_units au
                    join order_items oi3 on oi3.id = au.order_item_id
                    where oi3.order_id = o.id and au.returned_at is not null
                ), 0) as qty_returned
            from orders o
            left join customers c on c.id = o.customer_id
            order by o.created_at desc
            """;

        return jdbc.query(sql, (rs, rowNum) -> {
            long ordered = rs.getLong("qty_ordered");
            long assigned = rs.getLong("qty_assigned");
            long returned = rs.getLong("qty_returned");
            return new OrderSummaryDto(
                    rs.getString("id"),
                    rs.getString("order_no"),
                    rs.getString("customer_name"),
                    rs.getString("customer_email"),
                    rs.getString("status"),
                    ordered,
                    assigned,
                    returned,
                    fulfilmentState(ordered, assigned),
                    rs.getString("placed_at"),
                    rs.getString("dispatched_at")
            );
        });
    }

    /** Describes how far an order has been picked. */
    private static String fulfilmentState(long ordered, long assigned) {
        if (ordered == 0) {
            return assigned == 0 ? "MANUAL" : "MANUAL_PICKED";
        }
        if (assigned == 0) return "UNFULFILLED";
        if (assigned < ordered) return "PARTIAL";
        return "FULFILLED";
    }

    /** Moves an order to a new status, rejecting transitions that make no sense. */
    @Transactional
    public OrderSummaryDto updateStatus(String orderId, UpdateOrderStatusRequest request) {
        UUID orderUUID = UUID.fromString(orderId);
        requireOrderExists(orderUUID);

        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }

        OrderStatus target = OrderStatus.parse(request.status());
        OrderStatus current = currentStatus(orderUUID);
        current.requireCanMoveTo(target);

        if (target == OrderStatus.DISPATCHED && countAssignedUnits(orderUUID) == 0) {
            throw new IllegalArgumentException(
                    "Cannot dispatch an order with no units assigned to it");
        }

        if (target == OrderStatus.DISPATCHED) {
            jdbc.update(
                    "update orders set status = ?::order_status, dispatched_at = now() where id = ?",
                    target.name(), orderUUID);
        } else {
            jdbc.update(
                    "update orders set status = ?::order_status where id = ?",
                    target.name(), orderUUID);
        }

        return getOrder(orderUUID);
    }

    /** Records that one unit came back from the customer. */
    @Transactional
    public OrderSummaryDto returnUnit(String orderId, ReturnUnitRequest request) {
        UUID orderUUID = UUID.fromString(orderId);
        requireOrderExists(orderUUID);

        if (request == null || request.subBatchId() == null || request.serialNo() == null) {
            throw new IllegalArgumentException("subBatchId and serialNo are required");
        }

        UUID subBatchUUID = UUID.fromString(request.subBatchId());

        int updated = jdbc.update("""
            update assigned_units au
            set returned_at = now()
            from order_items oi
            where oi.id = au.order_item_id
              and oi.order_id = ?
              and au.sub_batch_id = ?
              and au.unit_serial_no = ?
              and au.returned_at is null
            """, orderUUID, subBatchUUID, request.serialNo());

        if (updated == 0) {
            throw new IllegalArgumentException(
                    "Serial " + request.serialNo()
                            + " is not currently assigned to this order (it may already be returned)");
        }

        return getOrder(orderUUID);
    }

    private OrderStatus currentStatus(UUID orderUUID) {
        String raw = jdbc.queryForObject(
                "select status::text from orders where id = ?", String.class, orderUUID);
        return OrderStatus.parse(raw);
    }

    private long countAssignedUnits(UUID orderUUID) {
        Long count = jdbc.queryForObject("""
            select count(*) from assigned_units au
            join order_items oi on oi.id = au.order_item_id
            where oi.order_id = ? and au.returned_at is null
            """, Long.class, orderUUID);
        return count == null ? 0 : count;
    }

    private OrderSummaryDto getOrder(UUID orderUUID) {
        return getAllOrders().stream()
                .filter(o -> o.id().equals(orderUUID.toString()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
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

        if (customerId == null) {
            customerId = UUID.randomUUID();
            jdbc.update(
                    "insert into customers (id, name, email) values (?, ?, ?)",
                    customerId,
                    resolvedName,
                    customerEmail.isEmpty() ? null : customerEmail
            );
        }

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

        requireSpareCapacity(orderUUID, req.quantity());

        UUID subBatchUUID = UUID.fromString(req.subBatchId());

        String sql = """
            select l.id::text as label_id, l.serial_no
            from labels l
            where l.sub_batch_id = ?
              and not exists (
                select 1 from assigned_units au
                where au.sub_batch_id = l.sub_batch_id
                  and au.unit_serial_no = l.serial_no
              )
            order by l.serial_no asc
            limit ?
            for update
            """;

        List<Map<String, Object>> labelRows = jdbc.queryForList(
                sql, subBatchUUID, req.quantity());

        if (labelRows.size() < req.quantity()) {
            throw new IllegalArgumentException(
                    "Not enough unassigned units in this sub-batch — requested "
                            + req.quantity() + ", only " + labelRows.size() + " free"
            );
        }

        List<Integer> serials = labelRows.stream()
                .map(row -> ((Number) row.get("serial_no")).intValue())
                .toList();

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

        return labelRows.stream().map(row ->
                new AssignedLabelDto(
                        String.valueOf(row.get("label_id")),
                        ((Number) row.get("serial_no")).intValue(),
                        req.subBatchId()
                )
        ).toList();
    }

    /** Rejects an assignment that would exceed the quantity the order actually asked for. */
    private void requireSpareCapacity(UUID orderUUID, int requestedQuantity) {
        Map<String, Object> totals = jdbc.queryForMap(
                """
                select coalesce(sum(oi.qty_ordered), 0) as total_ordered,
                       coalesce((
                         select count(*) from assigned_units au
                         join order_items oi2 on oi2.id = au.order_item_id
                         where oi2.order_id = ? and au.returned_at is null
                       ), 0) as total_assigned
                from order_items oi
                where oi.order_id = ?
                """,
                orderUUID, orderUUID
        );

        long totalOrdered = toLong(totals.get("total_ordered"));
        long totalAssigned = toLong(totals.get("total_assigned"));

        if (totalOrdered == 0) {
            return; // Manually created order — no declared quantity to enforce against.
        }

        if (totalAssigned + requestedQuantity > totalOrdered) {
            throw new IllegalArgumentException(
                    "Cannot assign " + requestedQuantity + " unit(s) — this order requires "
                            + totalOrdered + " in total and " + totalAssigned
                            + " are already assigned"
            );
        }
    }

    private static long toLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }

    private UUID findOrCreateOrderItem(UUID orderUUID, UUID subBatchId) {
        List<Map<String, Object>> existing = jdbc.queryForList(
                """
                select oi.id::text as id
                from order_items oi
                join sub_batches sb on sb.id = ?
                where oi.order_id = ?
                  and oi.product_id is not distinct from sb.product_id
                limit 1
                """,
                subBatchId, orderUUID
        );

        if (!existing.isEmpty()) {
            return UUID.fromString(String.valueOf(existing.get(0).get("id")));
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
        return orderItemId;
    }

    @Transactional
    public AssignByQrResponse assignByQr(String orderId, AssignByQrRequest req) {
        UUID orderUUID = UUID.fromString(orderId);
        requireOrderExists(orderUUID);

        if (req == null || req.qrPayload() == null || req.qrPayload().trim().isEmpty()) {
            throw new IllegalArgumentException("qrPayload is required");
        }

        String payload = req.qrPayload().trim();

        requireSpareCapacity(orderUUID, 1);

        List<Map<String, Object>> labelRows = jdbc.queryForList(
                "select id::text as label_id, sub_batch_id, serial_no from labels where qr_payload = ? limit 1",
                payload
        );

        if (labelRows.isEmpty()) {
            throw new IllegalArgumentException("Label not found for this QR payload");
        }

        String labelId = String.valueOf(labelRows.get(0).get("label_id"));
        UUID subBatchId = UUID.fromString(labelRows.get(0).get("sub_batch_id").toString());
        int serialNo = ((Number) labelRows.get(0).get("serial_no")).intValue();

        List<Map<String, Object>> existingAssignment = jdbc.queryForList(
                "select returned_at from assigned_units where sub_batch_id = ? and unit_serial_no = ? limit 1",
                subBatchId, serialNo
        );

        if (!existingAssignment.isEmpty()) {
            boolean wasReturned = existingAssignment.get(0).get("returned_at") != null;
            throw new IllegalArgumentException(wasReturned
                    ? "Serial " + serialNo + " was returned by a customer and is quarantined — it cannot be re-assigned"
                    : "Serial " + serialNo + " is already assigned to an order");
        }

        UUID orderItemId = findOrCreateOrderItem(orderUUID, subBatchId);

        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("""
            insert into assigned_units (id, order_item_id, sub_batch_id, unit_serial_no)
            values (?, ?, ?, ?)
            """,
                UUID.randomUUID(), orderItemId, subBatchId, serialNo
        );

        return new AssignByQrResponse(
                orderId,
                labelId,
                serialNo,
                subBatchId.toString(),
                now
        );
    }

    @Transactional(readOnly = true)
    public List<OrderAssignedUnitDto> listAssignedUnits(String orderId) {
        UUID orderUUID = UUID.fromString(orderId);
        requireOrderExists(orderUUID);

        String sql = """
            select
              au.unit_serial_no,
              au.sub_batch_id::text as sub_batch_id,
              sb.code as sub_batch_code,
              p.name as product_name,
              sb.expiry::text as expiry,
              au.returned_at::text as returned_at
            from assigned_units au
            join order_items oi on oi.id = au.order_item_id
            join sub_batches sb on sb.id = au.sub_batch_id
            left join products p on p.id = sb.product_id
            where oi.order_id = ?
            order by au.unit_serial_no
            """;

        return jdbc.query(sql, (rs, rowNum) -> new OrderAssignedUnitDto(
                rs.getInt("unit_serial_no"),
                rs.getString("sub_batch_id"),
                rs.getString("sub_batch_code"),
                rs.getString("product_name"),
                rs.getString("expiry"),
                rs.getString("returned_at")
        ), orderUUID);
    }
}