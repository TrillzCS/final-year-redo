package com.kanoga.kanoga_backend.subbatch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface SubBatchRepository extends JpaRepository<SubBatch, Long> {

    // find items whose expiry is before a threshold
    List<SubBatch> findByExpiryBefore(LocalDate date);
}


