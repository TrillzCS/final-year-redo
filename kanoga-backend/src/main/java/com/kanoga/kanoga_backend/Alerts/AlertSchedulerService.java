package com.kanoga.kanoga_backend.Alerts;

import com.kanoga.kanoga_backend.config.AppProperties;
import com.kanoga.kanoga_backend.subbatch.SubBatch;
import com.kanoga.kanoga_backend.subbatch.SubBatchRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AlertSchedulerService {

    private final SubBatchRepository subBatchRepository;
    private final AlertRepository alertRepository;
    private final JdbcTemplate jdbc;
    private final AppProperties app;

    public AlertSchedulerService(SubBatchRepository subBatchRepository,
                                 AlertRepository alertRepository,
                                 JdbcTemplate jdbc,
                                 AppProperties app) {
        this.subBatchRepository = subBatchRepository;
        this.alertRepository = alertRepository;
        this.jdbc = jdbc;
        this.app = app;
    }

    @Scheduled(fixedRate = 60000)
    public void checkExpiringBatches() {
        int alertDays = app.getDefaults().getExpiryAlertDays();
        int criticalDays = app.getDefaults().getExpiryCriticalDays();
        LocalDate threshold = LocalDate.now().plusDays(alertDays);
        List<SubBatch> expiring = subBatchRepository.findByExpiryBefore(threshold);

        for (SubBatch sub : expiring) {
            Integer productWindow = productWarningDays(sub.getId());
            int window = productWindow != null ? productWindow : alertDays;
            if (sub.getExpiry() == null
                    || sub.getExpiry().isAfter(LocalDate.now().plusDays(window))) {
                continue;
            }

            List<?> existing = jdbc.queryForList(
                    "select id from alerts where target_type = 'sub_batch' and target_id = ? and type = 'EXPIRY' and resolved_at is null limit 1",
                    sub.getId()
            );
            if (!existing.isEmpty()) continue;

            String severity = sub.getExpiry().isBefore(LocalDate.now().plusDays(criticalDays)) ? "CRITICAL" : "HIGH";
            String message = "Sub-batch " + sub.getCode() + " is expiring on " + sub.getExpiry()
                    + " (" + java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), sub.getExpiry()) + " days remaining)";

            jdbc.update(
                    "insert into alerts (id, type, target_type, target_id, message, severity, created_at) values (?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), "EXPIRY", "sub_batch", sub.getId(), message, severity, OffsetDateTime.now()
            );
        }
    }

    /** Per-product expiry warning window, or null to use the application default. */
    private Integer productWarningDays(java.util.UUID subBatchId) {
        java.util.List<java.util.Map<String, Object>> rows = jdbc.queryForList("""
            select p.expiry_warning_days as days
            from sub_batches sb
            join products p on p.id = sb.product_id
            where sb.id = ?
            limit 1
            """, subBatchId);
        if (rows.isEmpty()) return null;
        Object v = rows.get(0).get("days");
        return v instanceof Number n ? n.intValue() : null;
    }
}
