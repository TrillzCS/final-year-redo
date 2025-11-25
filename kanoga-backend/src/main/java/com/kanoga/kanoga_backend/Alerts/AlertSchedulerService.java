package com.kanoga.kanoga_backend.Alerts;

import com.kanoga.kanoga_backend.subbatch.SubBatch;
import com.kanoga.kanoga_backend.subbatch.SubBatchRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class AlertSchedulerService {

    private final SubBatchRepository subBatchRepository;
    private final AlertRepository alertRepository;

    public AlertSchedulerService(SubBatchRepository subBatchRepository,
                                 AlertRepository alertRepository) {
        this.subBatchRepository = subBatchRepository;
        this.alertRepository = alertRepository;
    }

    // TEMP FOR TESTING: run every 10 seconds
    @Scheduled(fixedRate = 10000)
    public void checkExpiringBatches() {

        LocalDate threshold = LocalDate.now().plusDays(14);

        // IMPORTANT: your DB uses "expiry" not "best_before"
        List<SubBatch> expiring = subBatchRepository.findByExpiryBefore(threshold);

        for (SubBatch sub : expiring) {
            String message = "Sub-batch " + sub.getCode() +
                    " is expiring soon (expiry: " + sub.getExpiry() + ")";

            Alert alert = new Alert(
                    "EXPIRY",
                    message,
                    "WARNING",
                    sub.getId()
            );

            alertRepository.save(alert);
        }
    }
}
