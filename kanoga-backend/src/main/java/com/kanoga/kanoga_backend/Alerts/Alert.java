package com.kanoga.kanoga_backend.Alerts;



import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String alertType;
    private String message;
    private String severity;
    private LocalDateTime createdAt;
    private Long batchId;
    private Long subBatchId;

    public Alert() {}

    public Alert(String alertType, String message, String severity, Long subBatchId) {
        this.alertType = alertType;
        this.message = message;
        this.severity = severity;
        this.subBatchId = subBatchId;
        this.createdAt = LocalDateTime.now();
    }


    public Long getId() { return id; }
    public String getAlertType() { return alertType; }
    public String getMessage() { return message; }
    public String getSeverity() { return severity; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
