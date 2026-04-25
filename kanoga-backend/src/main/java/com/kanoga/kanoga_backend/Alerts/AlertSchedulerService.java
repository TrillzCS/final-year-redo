package com.kanoga.kanoga_backend.Alerts;

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

    public AlertSchedulerService(SubBatchRepository subBatchRepository,
                                 AlertRepository alertRepository,
                                 JdbcTemplate jdbc) {
        this.subBatchRepository = subBatchRepository;
        this.alertRepository = alertRepository;
        this.jdbc = jdbc;
    }

    @Scheduled(fixedRate = 60000)
    public void checkExpiringBatches() {
        LocalDate threshold = LocalDate.now().plusDays(30);
        List<SubBatch> expiring = subBatchRepository.findByExpiryBefore(threshold);

        for (SubBatch sub : expiring) {
            List<?> existing = jdbc.queryForList(
                    "select id from alerts where target_type = 'sub_batch' and target_id = ? and type = 'EXPIRY' and resolved_at is null limit 1",
                    sub.getId()
            );
            if (!existing.isEmpty()) continue;

            String severity = sub.getExpiry().isBefore(LocalDate.now().plusDays(7)) ? "CRITICAL" : "HIGH";
            String message = "Sub-batch " + sub.getCode() + " is expiring on " + sub.getExpiry()
                    + " (" + java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), sub.getExpiry()) + " days remaining)";

            jdbc.update(
                    "insert into alerts (id, type, target_type, target_id, message, severity, created_at) values (?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), "EXPIRY", "sub_batch", sub.getId(), message, severity, OffsetDateTime.now()
            );
        }
    }
}