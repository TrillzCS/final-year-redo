package com.kanoga.kanoga_backend.verification;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class VerificationService {

    private final JdbcTemplate jdbc;

    public VerificationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public VerificationResultDto verify(String code) {
        VerificationResultDto dto = new VerificationResultDto();

        if (code == null || code.isBlank()) {
            dto.setValid(false);
            dto.setMessage("Empty code");
            dto.setExpired(false);
            dto.setAssigned(false);
            return dto;
        }

        try {
            // 1) Find label by exact QR payload
            List<Map<String, Object>> labelRows = jdbc.queryForList(
                    """
                    select id, sub_batch_id, serial_no
                    from labels
                    where qr_payload = ?
                    limit 1
                    """,
                    code
            );

            if (labelRows.isEmpty()) {
                dto.setValid(false);
                dto.setMessage("Code not found. This product may not be genuine.");
                dto.setExpired(false);
                dto.setAssigned(false);
                dto.setProductName(null);
                dto.setSubBatchCode(null);
                dto.setBatchCode(null);
                dto.setSupplierName(null);
                dto.setBestBefore(null);
                dto.setOrderId(null);
                dto.setOrderNumber(null);
                dto.setCustomerName(null);
                dto.setCustomerEmail(null);
                dto.setAssignedAt(null);
                return dto;
            }

            Map<String, Object> label = labelRows.get(0);
            UUID subBatchId = asUUID(label.get("sub_batch_id"));
            Integer serialNo = label.get("serial_no") != null
                    ? ((Number) label.get("serial_no")).intValue()
                    : null;

            // 2) Load sub-batch
            String subBatchCode = null;
            UUID parentBatchId = null;
            UUID productId = null;
            LocalDate expiry = null;

            if (subBatchId != null) {
                List<Map<String, Object>> subRows = jdbc.queryForList(
                        """
                        select id, code, parent_batch_id, product_id, expiry
                        from sub_batches
                        where id = ?
                        limit 1
                        """,
                        subBatchId
                );

                if (!subRows.isEmpty()) {
                    Map<String, Object> sub = subRows.get(0);
                    subBatchCode = asString(sub.get("code"));
                    parentBatchId = asUUID(sub.get("parent_batch_id"));
                    productId = asUUID(sub.get("product_id"));
                    expiry = asLocalDate(sub.get("expiry"));
                }
            }

            // 3) Load batch
            String batchCode = null;
            UUID supplierId = null;
            LocalDate bestBefore = null;

            if (parentBatchId != null) {
                List<Map<String, Object>> batchRows = jdbc.queryForList(
                        """
                        select id, code, supplier_id, best_before
                        from batches
                        where id = ?
                        limit 1
                        """,
                        parentBatchId
                );

                if (!batchRows.isEmpty()) {
                    Map<String, Object> batch = batchRows.get(0);
                    batchCode = asString(batch.get("code"));
                    supplierId = asUUID(batch.get("supplier_id"));
                    bestBefore = asLocalDate(batch.get("best_before"));
                }
            }

            // 4) Load supplier
            String supplierName = null;

            if (supplierId != null) {
                List<Map<String, Object>> supplierRows = jdbc.queryForList(
                        """
                        select id, name
                        from suppliers
                        where id = ?
                        limit 1
                        """,
                        supplierId
                );

                if (!supplierRows.isEmpty()) {
                    supplierName = asString(supplierRows.get(0).get("name"));
                }
            }

            // 5) Load product
            String productName = null;

            if (productId != null) {
                List<Map<String, Object>> productRows = jdbc.queryForList(
                        """
                        select id, name
                        from products
                        where id = ?
                        limit 1
                        """,
                        productId
                );

                if (!productRows.isEmpty()) {
                    productName = asString(productRows.get(0).get("name"));
                }
            }

            boolean assigned = false;
            String orderId = null, orderNumber = null, customerName = null;
            String customerEmail = null, assignedAt = null, returnedAt = null, dispatchedAt = null;

            if (subBatchId != null && serialNo != null) {
                List<Map<String, Object>> assignedRows = jdbc.queryForList(
                        """
                        select o.id::text            as order_id,
                               o.order_no            as order_no,
                               o.dispatched_at::text as dispatched_at,
                               c.name                as customer_name,
                               c.email               as customer_email,
                               au.returned_at::text  as returned_at,
                               oi.id::text           as order_item_id
                        from assigned_units au
                        join order_items oi on oi.id = au.order_item_id
                        join orders o on o.id = oi.order_id
                        left join customers c on c.id = o.customer_id
                        where au.sub_batch_id = ? and au.unit_serial_no = ?
                        limit 1
                        """,
                        subBatchId,
                        serialNo
                );

                if (!assignedRows.isEmpty()) {
                    Map<String, Object> row = assignedRows.get(0);
                    assigned = true;
                    orderId = asString(row.get("order_id"));
                    orderNumber = asString(row.get("order_no"));
                    customerName = asString(row.get("customer_name"));
                    customerEmail = asString(row.get("customer_email"));
                    returnedAt = asString(row.get("returned_at"));
                    dispatchedAt = asString(row.get("dispatched_at"));
                }
            }

            LocalDate effectiveBestBefore = expiry != null ? expiry : bestBefore;

            dto.setValid(true);
            dto.setMessage("Product verified.");
            dto.setProductName(productName);
            dto.setSubBatchCode(subBatchCode);
            dto.setBatchCode(batchCode);
            dto.setSupplierName(supplierName);

            if (effectiveBestBefore != null) {
                dto.setBestBefore(effectiveBestBefore.toString());
                dto.setExpired(effectiveBestBefore.isBefore(LocalDate.now()));
            } else {
                dto.setBestBefore(null);
                dto.setExpired(false);
            }

            dto.setAssigned(assigned);
            dto.setOrderId(orderId);
            dto.setOrderNumber(orderNumber);
            dto.setCustomerName(customerName);
            dto.setCustomerEmail(customerEmail);
            dto.setAssignedAt(assignedAt);
            dto.setReturnedAt(returnedAt);
            dto.setDispatchedAt(dispatchedAt);
            dto.setHistory(buildHistory(subBatchCode, serialNo, batchCode, supplierName,
                    effectiveBestBefore, orderNumber, customerName, dispatchedAt, returnedAt));

            if (returnedAt != null) {
                dto.setMessage("Returned by the customer and quarantined.");
            } else if (assigned) {
                dto.setMessage("Verified. This unit was sent to " + (customerName == null ? "a customer" : customerName) + ".");
            }

            return dto;

        } catch (Exception e) {
            e.printStackTrace();
            dto.setValid(false);
            dto.setMessage("Verification query failed: " + e.getMessage());
            dto.setExpired(false);
            dto.setAssigned(false);
            dto.setProductName(null);
            dto.setSubBatchCode(null);
            dto.setBatchCode(null);
            dto.setSupplierName(null);
            dto.setBestBefore(null);
            dto.setOrderId(null);
            dto.setOrderNumber(null);
            dto.setCustomerName(null);
            dto.setCustomerEmail(null);
            dto.setAssignedAt(null);
            return dto;
        }
    }

    private UUID asUUID(Object value) {
        if (value == null) return null;
        if (value instanceof UUID u) return u;
        return UUID.fromString(value.toString());
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private LocalDate asLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate d) return d;
        if (value instanceof Date d) return d.toLocalDate();
        return LocalDate.parse(value.toString());
    }

    private List<VerificationResultDto.HistoryEntry> buildHistory(
            String subBatchCode, Integer serialNo, String batchCode, String supplierName,
            LocalDate bestBefore, String orderNumber, String customerName,
            String dispatchedAt, String returnedAt) {

        List<VerificationResultDto.HistoryEntry> history = new java.util.ArrayList<>();

        if (batchCode != null) {
            history.add(new VerificationResultDto.HistoryEntry(
                    null, "Received from supplier",
                    "Batch " + batchCode + (supplierName == null ? "" : " from " + supplierName)));
        }
        if (subBatchCode != null) {
            history.add(new VerificationResultDto.HistoryEntry(
                    null, "Packed and labelled",
                    "Sub-batch " + subBatchCode + ", unit " + serialNo
                            + (bestBefore == null ? "" : ", best before " + bestBefore)));
        }
        if (orderNumber != null) {
            history.add(new VerificationResultDto.HistoryEntry(
                    null, "Picked for order",
                    orderNumber + (customerName == null ? "" : " - " + customerName)));
        }
        if (dispatchedAt != null) {
            history.add(new VerificationResultDto.HistoryEntry(
                    dispatchedAt, "Dispatched", "Left the warehouse"));
        }
        if (returnedAt != null) {
            history.add(new VerificationResultDto.HistoryEntry(
                    returnedAt, "Returned", "Quarantined, not returned to sellable stock"));
        }
        return history;
    }
}
