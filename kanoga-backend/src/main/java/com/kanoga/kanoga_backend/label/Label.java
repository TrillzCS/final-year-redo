package com.kanoga.kanoga_backend.label;

import jakarta.persistence.*;

@Entity
@Table(name = "labels")
public class Label {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name = "sub_batch_id", nullable = false)
    private Long subBatchId;


    @Column(name = "serial_no", nullable = false)
    private Integer serialNo;


    @Column(name = "qr_payload", nullable = false, length = 500)
    private String qrPayload;

    public Long getId() {
        return id;
    }

    public Long getSubBatchId() {
        return subBatchId;
    }

    public Integer getSerialNo() {
        return serialNo;
    }

    public String getQrPayload() {
        return qrPayload;
    }
}
