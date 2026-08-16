package com.kanoga.kanoga_backend.subbatch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SubBatchRepository extends JpaRepository<SubBatch, UUID> {

    /** Sub-batches expiring before the given date, used by the expiry alert scheduler. */
    List<SubBatch> findByExpiryBefore(LocalDate date);
}
