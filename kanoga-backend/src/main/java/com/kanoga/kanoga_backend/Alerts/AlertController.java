package com.kanoga.kanoga_backend.Alerts;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final JdbcTemplate jdbc;

    public AlertController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> getAlerts() {
        return jdbc.queryForList("""
            select
                id::text,
                type::text,
                target_type,
                target_id::text,
                message,
                severity::text,
                created_at,
                resolved_at
            from alerts
            where resolved_at is null
            order by created_at desc
            """);
    }
}