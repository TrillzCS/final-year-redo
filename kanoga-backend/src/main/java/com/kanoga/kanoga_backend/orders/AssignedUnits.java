package com.kanoga.kanoga_backend.orders;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "assigned_units")
public class AssignedUnits {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "label_id", nullable = false)
    private Long labelId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "assigned_at")
    private OffsetDateTime assignedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getLabelId() { return labelId; }
    public void setLabelId(Long labelId) { this.labelId = labelId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public OffsetDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(OffsetDateTime assignedAt) { this.assignedAt = assignedAt; }
}
