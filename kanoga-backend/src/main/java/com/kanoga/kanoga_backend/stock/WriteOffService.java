package com.kanoga.kanoga_backend.stock;

import com.kanoga.kanoga_backend.activity.ActivityService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Removing units from stock without inventing an order.
 *
 * Damage, samples and miscounts all reduce what is on the shelf. Without this the only
 * way to take a unit out was to assign it to a fake customer, which corrupts the
 * traceability record the system exists to keep.
 */
@Service
public class WriteOffService {

    private final JdbcTemplate jdbc;
    private final ActivityService activity;

    public WriteOffService(JdbcTemplate jdbc, ActivityService activity) {
        this.jdbc = jdbc;
        this.activity = activity;
    }

    @Transactional
    public int writeOff(WriteOffRequest req) {
        if (req == null || req.subBatchId() == null || req.subBatchId().isBlank()) {
            throw new IllegalArgumentException("A sub-batch is required");
        }
        String reason = req.reason() == null || req.reason().isBlank()
                ? null : req.reason().trim();
        if (reason == null) {
            throw new IllegalArgumentException("A reason is required so the adjustment can be audited");
        }

        UUID subBatchId = UUID.fromString(req.subBatchId());
        List<Integer> serials = req.serials();

        if (serials == null || serials.isEmpty()) {
            int quantity = req.quantity() == null ? 0 : req.quantity();
            if (quantity <= 0) {
                throw new IllegalArgumentException("Give either specific serials or a positive quantity");
            }
            serials = jdbc.queryForList("""
                select l.serial_no
                from labels l
                where l.sub_batch_id = ?
                  and l.written_off_at is null
                  and not exists (
                    select 1 from assigned_units au
                    where au.sub_batch_id = l.sub_batch_id and au.unit_serial_no = l.serial_no
                  )
                order by l.serial_no
                limit ?
                """, Integer.class, subBatchId, quantity);

            if (serials.size() < quantity) {
                throw new IllegalArgumentException(
                        "Only " + serials.size() + " unassigned unit(s) available to write off");
            }
        }

        int written = 0;
        for (Integer serial : serials) {
            int rows = jdbc.update("""
                update labels
                set written_off_at = now(), write_off_reason = ?
                where sub_batch_id = ? and serial_no = ? and written_off_at is null
                  and not exists (
                    select 1 from assigned_units au
                    where au.sub_batch_id = labels.sub_batch_id
                      and au.unit_serial_no = labels.serial_no
                  )
                """, reason, subBatchId, serial);
            written += rows;
        }

        if (written == 0) {
            throw new IllegalArgumentException(
                    "Nothing was written off. Those units are either already written off "
                            + "or assigned to an order.");
        }

        String code = jdbc.queryForObject(
                "select code from sub_batches where id = ?", String.class, subBatchId);
        activity.record("STOCK_WRITTEN_OFF", "sub_batch", subBatchId,
                written + " unit(s) from " + code + " written off: " + reason);

        return written;
    }

    public List<WrittenOffUnit> recent(int limit) {
        return jdbc.query("""
            select sb.code as sub_batch_code, p.name as product_name, l.serial_no,
                   l.written_off_at::text as written_off_at, l.write_off_reason
            from labels l
            join sub_batches sb on sb.id = l.sub_batch_id
            left join products p on p.id = sb.product_id
            where l.written_off_at is not null
            order by l.written_off_at desc
            limit ?
            """, (rs, n) -> new WrittenOffUnit(
                    rs.getString("sub_batch_code"), rs.getString("product_name"),
                    rs.getInt("serial_no"), rs.getString("written_off_at"),
                    rs.getString("write_off_reason")), Math.min(Math.max(limit, 1), 200));
    }

    public record WrittenOffUnit(String subBatchCode, String productName, int serialNo,
                                 String writtenOffAt, String reason) {}
}
