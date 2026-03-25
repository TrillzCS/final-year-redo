package com.kanoga.kanoga_backend.verification;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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
                    select id, sub_batch_id
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
            Object labelId = label.get("id");
            Object subBatchId = label.get("sub_batch_id");

            // 2) Load sub-batch
            String subBatchCode = null;
            Object parentBatchId = null;
            Object productId = null;
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
                    parentBatchId = sub.get("parent_batch_id");
                    productId = sub.get("product_id");
                    expiry = asLocalDate(sub.get("expiry"));
                }
            }

            // 3) Load batch
            String batchCode = null;
            Object supplierId = null;
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
                    supplierId = batch.get("supplier_id");
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

            // 6) Check assignment only (no assigned_at / no id ordering for now)
            boolean assigned = false;

            if (labelId != null) {
                List<Map<String, Object>> assignedRows = jdbc.queryForList(
                        """
                        select order_id
                        from assigned_units
                        where label_id = ?
                        limit 1
                        """,
                        labelId
                );

                assigned = !assignedRows.isEmpty();
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

            // Leave destination details empty for now until Step 2
            dto.setOrderId(null);
            dto.setOrderNumber(null);
            dto.setCustomerName(null);
            dto.setCustomerEmail(null);
            dto.setAssignedAt(null);

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

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private LocalDate asLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate d) return d;
        if (value instanceof Date d) return d.toLocalDate();
        return LocalDate.parse(value.toString());
    }
}