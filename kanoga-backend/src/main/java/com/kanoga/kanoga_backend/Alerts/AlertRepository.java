package com.kanoga.kanoga_backend.Alerts;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID> {
}