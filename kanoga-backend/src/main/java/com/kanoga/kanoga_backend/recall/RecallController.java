package com.kanoga.kanoga_backend.recall;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/recall")
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
                l.serial_no,
                o.order_no,
                c.name as customer_name,
                c.email as customer_email,
                sb.expiry::text as expiry
            from batches b
            join sub_batches sb on sb.parent_batch_id = b.id
            join labels l on l.sub_batch_id = sb.id
            left join assigned_units au on au.sub_batch_id = sb.id and au.unit_serial_no = l.serial_no
            left join order_items oi on oi.id = au.order_item_id
            left join orders o on o.id = oi.order_id
            left join customers c on c.id = o.customer_id
            where b.code = ?
            order by sb.code asc, l.serial_no asc
            """;

        List<RecallAffectedUnitDto> units = jdbc.query(
                sql,
                (rs, rowNum) -> new RecallAffectedUnitDto(
                        rs.getString("sub_batch_code"),
                        rs.getObject("serial_no") != null ? rs.getInt("serial_no") : null,
                        rs.getString("order_no"),
                        rs.getString("customer_name"),
                        rs.getString("customer_email"),
                        rs.getString("expiry")
                ),
                batchCode.trim()
        );

        Set<String> subBatchCodes = new HashSet<>();
        Set<String> orderNumbers = new HashSet<>();
        Set<String> customerEmails = new HashSet<>();
        int affectedUnits = 0;

        for (RecallAffectedUnitDto unit : units) {
            if (unit.subBatchCode() != null) subBatchCodes.add(unit.subBatchCode());
            if (unit.serialNo() != null) affectedUnits++;
            if (unit.orderNo() != null) orderNumbers.add(unit.orderNo());
            if (unit.customerEmail() != null && !unit.customerEmail().isBlank()) {
                customerEmails.add(unit.customerEmail());
            }
        }

        return new RecallResultDto(
                batchCode.trim(),
                subBatchCodes.size(),
                affectedUnits,
                orderNumbers.size(),
                customerEmails.size(),
                units
        );
    }
}