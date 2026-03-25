package com.kanoga.kanoga_backend.recall;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/recall")
@CrossOrigin(origins = "http://localhost:5173")
public class RecallController {

    private final JdbcTemplate jdbc;

    public RecallController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public RecallResultDto simulate(@RequestParam String batchCode) {
        if (batchCode == null || batchCode.trim().isEmpty()) {
            throw new IllegalArgumentException("batchCode is required");
        }

        String sql = """
            select
                sb.code as sub_batch_code,
                l.id as label_id,
                l.serial_no,
                au.order_id,
                o.order_number,
                o.customer_name,
                o.customer_email,
                au.assigned_at
            from batches b
            left join sub_batches sb on sb.parent_batch_id = b.id
            left join labels l on l.sub_batch_id = sb.id
            left join assigned_units au on au.label_id = l.id
            left join orders o on o.id = au.order_id
            where b.code = ?
            order by sb.code asc, l.serial_no asc
            """;

        List<RecallAffectedUnitDto> units = jdbc.query(
                sql,
                (rs, rowNum) -> {
                    Timestamp ts = rs.getTimestamp("assigned_at");
                    String assignedAt = null;
                    if (ts != null) {
                        OffsetDateTime odt = ts.toInstant().atOffset(ZoneOffset.UTC);
                        assignedAt = odt.toString();
                    }

                    Long orderId = rs.getObject("order_id") == null ? null : rs.getLong("order_id");
                    Long labelId = rs.getObject("label_id") == null ? null : rs.getLong("label_id");
                    Integer serialNo = rs.getObject("serial_no") == null ? null : rs.getInt("serial_no");

                    return new RecallAffectedUnitDto(
                            rs.getString("sub_batch_code"),
                            labelId,
                            serialNo,
                            orderId,
                            rs.getString("order_number"),
                            rs.getString("customer_name"),
                            rs.getString("customer_email"),
                            assignedAt
                    );
                },
                batchCode.trim()
        );

        Set<String> subBatchCodes = new HashSet<>();
        Set<Long> orderIds = new HashSet<>();
        Set<String> customerEmails = new HashSet<>();

        int affectedUnits = 0;

        for (RecallAffectedUnitDto unit : units) {
            if (unit.subBatchCode() != null) {
                subBatchCodes.add(unit.subBatchCode());
            }
            if (unit.labelId() != null) {
                affectedUnits++;
            }
            if (unit.orderId() != null) {
                orderIds.add(unit.orderId());
            }
            if (unit.customerEmail() != null && !unit.customerEmail().isBlank()) {
                customerEmails.add(unit.customerEmail());
            }
        }

        return new RecallResultDto(
                batchCode.trim(),
                subBatchCodes.size(),
                affectedUnits,
                orderIds.size(),
                customerEmails.size(),
                units
        );
    }
}