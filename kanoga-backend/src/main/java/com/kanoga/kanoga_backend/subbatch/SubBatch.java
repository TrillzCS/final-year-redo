package com.kanoga.kanoga_backend.subbatch;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

/** A sub-batch: the output of one packing run, from which individual units are labelled. */
@Entity
@Table(name = "sub_batches")
public class SubBatch {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "parent_batch_id", nullable = false)
    private UUID parentBatchId;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "expiry")
    private LocalDate expiry;

    @Column(name = "total_units")
    private Integer totalUnits;

    /** Retained for backwards compatibility only. */
    @Column(name = "units_available")
    private Integer unitsAvailable;

    @Column(name = "packing_run_id")
    private UUID packingRunId;

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public UUID getParentBatchId() { return parentBatchId; }
    public UUID getProductId() { return productId; }
    public LocalDate getExpiry() { return expiry; }
    public Integer getTotalUnits() { return totalUnits; }
    public Integer getUnitsAvailable() { return unitsAvailable; }
    public UUID getPackingRunId() { return packingRunId; }
}
