package com.kanoga.kanoga_backend.subbatch;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.util.List;

@RestController
@RequestMapping("/api/sub-batches")
@CrossOrigin(origins = "http://localhost:5173")
public class SubBatchController {

    private final JdbcTemplate jdbc;

    public SubBatchController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/available")
    public List<SubBatchAvailableDto> available() {
        String sql = """
            select
                sb.id as sub_batch_id,
                sb.code as sub_batch_code,
                p.id as product_id,
                p.name as product_name,
                sb.best_before,
                count(l.id) as total_units,
                count(au.id) as assigned_units,
                count(l.id) - count(au.id) as available_units
            from sub_batches sb
            join labels l on l.sub_batch_id = sb.id
            left join assigned_units au on au.label_id = l.id
            left join products p on p.id = sb.product_id
            group by sb.id, sb.code, p.id, p.name, sb.best_before
            having count(l.id) - count(au.id) > 0
            order by sb.id desc
            """;

        return jdbc.query(sql, (rs, rowNum) -> new SubBatchAvailableDto(
                rs.getLong("sub_batch_id"),
                rs.getString("sub_batch_code"),
                rs.getObject("product_id") != null ? rs.getLong("product_id") : null,
                rs.getString("product_name"),
                rs.getObject("best_before", Date.class) != null
                        ? rs.getObject("best_before", Date.class).toLocalDate()
                        : null,
                rs.getLong("total_units"),
                rs.getLong("assigned_units"),
                rs.getLong("available_units")
        ));
    }
}
