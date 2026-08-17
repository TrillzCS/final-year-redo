package com.kanoga.kanoga_backend.activity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ActivityService {

    private static final Logger log = LoggerFactory.getLogger(ActivityService.class);

    private final JdbcTemplate jdbc;

    public ActivityService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(String action, String entityType, UUID entityId, String detail) {
        try {
            jdbc.update("""
                insert into activity_log (id, actor, action, entity_type, entity_id, detail)
                values (?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), currentActor(), action, entityType, entityId, detail);
        } catch (Exception e) {
            // Never let logging break the operation it is describing.
            log.warn("Could not write activity entry for {} {}: {}", action, entityId, e.getMessage());
        }
    }

    public List<ActivityEntryDto> recent(int limit) {
        return jdbc.query("""
            select id::text as id, occurred_at::text as occurred_at, actor, action,
                   entity_type, entity_id::text as entity_id, detail
            from activity_log
            order by occurred_at desc
            limit ?
            """, this::map, Math.min(Math.max(limit, 1), 200));
    }

    public List<ActivityEntryDto> forEntity(String entityType, UUID entityId) {
        return jdbc.query("""
            select id::text as id, occurred_at::text as occurred_at, actor, action,
                   entity_type, entity_id::text as entity_id, detail
            from activity_log
            where entity_type = ? and entity_id = ?
            order by occurred_at desc
            """, this::map, entityType, entityId);
    }

    private ActivityEntryDto map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new ActivityEntryDto(
                rs.getString("id"), rs.getString("occurred_at"), rs.getString("actor"),
                rs.getString("action"), rs.getString("entity_type"),
                rs.getString("entity_id"), rs.getString("detail"));
    }

    private String currentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            return "system";
        }
        return auth.getName();
    }
}
