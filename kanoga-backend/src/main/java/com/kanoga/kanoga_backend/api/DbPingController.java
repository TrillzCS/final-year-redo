// src/main/java/com/kanoga/kanoga_backend/api/DbPingController.java
package com.kanoga.kanoga_backend.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/db")
@CrossOrigin(origins = "http://localhost:5173")
public class DbPingController {

    private final JdbcTemplate jdbc;

    public DbPingController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/ping")
    public Map<String, Object> ping() {
        try {
            Object now = jdbc.queryForObject("select now()", Object.class);
            String version = jdbc.queryForObject("select version()", String.class);
            return Map.of(
                    "status", "ok",
                    "now", String.valueOf(now),
                    "version", version
            );
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of(
                    "status", "error",
                    "errorType", e.getClass().getSimpleName(),
                    "message", e.getMessage()
            );
        }
    }
}
