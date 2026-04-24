package com.kanoga.kanoga_backend.Alerts;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "type")
    private String type;

    @Column(name = "target_type")
    private String targetType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "message")
    private String message;

    @Column(name = "severity")
    private String severity;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    public UUID getId() { return id; }
    public String getType() { return type; }
    public String getTargetType() { return targetType; }
    public UUID getTargetId() { return targetId; }
    public String getMessage() { return message; }
    public String getSeverity() { return severity; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
}