package com.kanoga.kanoga_backend.dashboard;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertsDashboardController {

    private final JdbcTemplate jdbc;

    public AlertsDashboardController(JdbcTemplate jdbc) {
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
