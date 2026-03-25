package com.kanoga.kanoga_backend.dashboard;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard/alerts")
@CrossOrigin(origins = "http://localhost:5173")
public class AlertsDashboardController {

    private final JdbcTemplate jdbc;

    public AlertsDashboardController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public AlertsDashboardResponseDto getAlerts(
            @RequestParam(defaultValue = "30") int expiringDays,
            @RequestParam(defaultValue = "10") int lowStockThreshold
    ) {
        LocalDate today = LocalDate.now();
        LocalDate expiringCutoff = today.plusDays(expiringDays);

        String sql = """
            select
                sb.id as sub_batch_id,
                sb.code as sub_batch_code,
                sb.expiry,
                count(l.id) as total_units,
                count(au.id) as assigned_units,
                (count(l.id) - count(au.id)) as available_units
            from sub_batches sb
            left join labels l on l.sub_batch_id = sb.id
            left join assigned_units au on au.label_id = l.id
            group by sb.id, sb.code, sb.expiry
            order by sb.expiry asc nulls last, sb.code asc
            """;

        List<RowData> rows = jdbc.query(
                sql,
                (rs, rowNum) -> new RowData(
                        rs.getLong("sub_batch_id"),
                        rs.getString("sub_batch_code"),
                        rs.getObject("expiry", Date.class) != null
                                ? rs.getObject("expiry", Date.class).toLocalDate()
                                : null,
                        rs.getInt("total_units"),
                        rs.getInt("assigned_units"),
                        rs.getInt("available_units")
                )
        );

        List<AlertItemDto> expired = rows.stream()
                .filter(r -> r.expiry != null && r.expiry.isBefore(today))
                .map(r -> toAlert(
                        r,
                        "high",
                        "expired",
                        "This sub-batch is expired and should not be shipped."
                ))
                .toList();

        List<AlertItemDto> expiringSoon = rows.stream()
                .filter(r ->
                        r.expiry != null &&
                                (!r.expiry.isBefore(today)) &&
                                (!r.expiry.isAfter(expiringCutoff))
                )
                .map(r -> toAlert(
                        r,
                        "medium",
                        "expiring_soon",
                        "This sub-batch is approaching expiry."
                ))
                .toList();

        List<AlertItemDto> lowStock = rows.stream()
                .filter(r -> r.availableUnits <= lowStockThreshold)
                .map(r -> toAlert(
                        r,
                        "medium",
                        "low_stock",
                        "Available units are at or below the low stock threshold."
                ))
                .toList();

        return new AlertsDashboardResponseDto(
                expired.size(),
                expiringSoon.size(),
                lowStock.size(),
                expired,
                expiringSoon,
                lowStock
        );
    }

    private AlertItemDto toAlert(RowData r, String severity, String type, String message) {
        return new AlertItemDto(
                r.subBatchId,
                r.subBatchCode,
                r.expiry != null ? r.expiry.toString() : null,
                r.totalUnits,
                r.assignedUnits,
                r.availableUnits,
                severity,
                type,
                message
        );
    }

    private record RowData(
            Long subBatchId,
            String subBatchCode,
            LocalDate expiry,
            Integer totalUnits,
            Integer assignedUnits,
            Integer availableUnits
    ) {
    }
}
