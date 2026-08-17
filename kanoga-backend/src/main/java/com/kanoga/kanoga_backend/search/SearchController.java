package com.kanoga.kanoga_backend.search;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * One box for anything an operator has in their hand: an order number, a customer
 * email, a SKU, a scanned barcode, a batch code or a sub-batch code.
 */
@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final JdbcTemplate jdbc;

    public SearchController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Hit(String type, String id, String title, String subtitle) {}

    @GetMapping
    public List<Hit> search(@RequestParam String q) {
        if (q == null || q.trim().length() < 2) {
            throw new IllegalArgumentException("Enter at least two characters");
        }
        String like = "%" + q.trim() + "%";
        List<Hit> hits = new ArrayList<>();

        hits.addAll(jdbc.query("""
            select o.id::text as id, o.order_no, o.status::text as status,
                   c.name as customer_name, c.email as customer_email
            from orders o
            left join customers c on c.id = o.customer_id
            where o.order_no ilike ? or c.name ilike ? or c.email ilike ?
            order by o.created_at desc
            limit 10
            """, (rs, n) -> new Hit("order", rs.getString("id"), rs.getString("order_no"),
                        (rs.getString("customer_name") == null ? "No customer" : rs.getString("customer_name"))
                                + " - " + rs.getString("status")),
                like, like, like));

        hits.addAll(jdbc.query("""
            select id::text as id, name, sku, barcode
            from products
            where name ilike ? or sku ilike ? or barcode ilike ?
            order by name
            limit 10
            """, (rs, n) -> new Hit("product", rs.getString("id"), rs.getString("name"),
                        "SKU " + (rs.getString("sku") == null ? "-" : rs.getString("sku"))
                                + (rs.getString("barcode") == null ? "" : " / " + rs.getString("barcode"))),
                like, like, like));

        hits.addAll(jdbc.query("""
            select sb.id::text as id, sb.code, sb.expiry::text as expiry,
                   b.code as batch_code, p.name as product_name
            from sub_batches sb
            left join batches b on b.id = sb.parent_batch_id
            left join products p on p.id = sb.product_id
            where sb.code ilike ? or b.code ilike ?
            order by sb.expiry asc nulls last
            limit 10
            """, (rs, n) -> new Hit("subBatch", rs.getString("id"), rs.getString("code"),
                        (rs.getString("product_name") == null ? "Unknown product" : rs.getString("product_name"))
                                + (rs.getString("expiry") == null ? "" : " - expires " + rs.getString("expiry"))),
                like, like));

        hits.addAll(jdbc.query("""
            select l.id::text as id, l.serial_no, sb.code as sub_batch_code, p.name as product_name
            from labels l
            join sub_batches sb on sb.id = l.sub_batch_id
            left join products p on p.id = sb.product_id
            where l.qr_payload ilike ?
            limit 10
            """, (rs, n) -> new Hit("unit", rs.getString("id"),
                        rs.getString("sub_batch_code") + " #" + rs.getInt("serial_no"),
                        rs.getString("product_name") == null ? "Unit" : rs.getString("product_name")),
                like));

        return hits;
    }
}
