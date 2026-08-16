package com.kanoga.kanoga_backend.label;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** One printed label, identifying a single physical unit within a sub-batch. */
@Entity
@Table(name = "labels")
public class Label {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "sub_batch_id")
    private UUID subBatchId;

    @Column(name = "serial_no")
    private Integer serialNo;

    @Column(name = "qr_payload")
    private String qrPayload;

    public UUID getId() { return id; }
    public UUID getSubBatchId() { return subBatchId; }
    public Integer getSerialNo() { return serialNo; }
    public String getQrPayload() { return qrPayload; }
}
