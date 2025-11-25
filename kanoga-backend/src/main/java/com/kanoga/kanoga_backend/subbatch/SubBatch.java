package com.kanoga.kanoga_backend.subbatch;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "sub_batches")
public class SubBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "parent_batch_id", nullable = false)
    private Long parentBatchId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "expiry")
    private LocalDate expiry;

    @Column(name = "total_units")
    private Integer totalUnits;

    @Column(name = "units_available")
    private Integer unitsAvailable;

    @Column(name = "packing_run_id")
    private Long packingRunId;

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public Long getParentBatchId() {
        return parentBatchId;
    }

    public Long getProductId() {
        return productId;
    }

    public LocalDate getExpiry() {
        return expiry;
    }

    public Integer getTotalUnits() {
        return totalUnits;
    }

    public Integer getUnitsAvailable() {
        return unitsAvailable;
    }

    public Long getPackingRunId() {
        return packingRunId;
    }
}
