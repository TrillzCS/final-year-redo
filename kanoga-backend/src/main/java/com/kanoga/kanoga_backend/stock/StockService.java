package com.kanoga.kanoga_backend.stock;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StockService {

    private final JdbcTemplate jdbc;

    public StockService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Stock on hand per product, counted from labels rather than a stored total. */
    public List<StockDtos.ProductStock> byProduct() {
        return jdbc.query("""
            select p.id::text as product_id,
                   p.name as product_name,
                   p.sku,
                   p.barcode,
                   p.low_stock_threshold,
                   count(l.serial_no) as total_units,
                   count(l.serial_no) filter (where au.id is null) as available_units,
                   count(au.id) filter (where au.returned_at is null) as assigned_units,
                   count(au.id) filter (where au.returned_at is not null) as returned_units,
                   min(sb.expiry)::text as earliest_expiry
            from products p
            left join sub_batches sb on sb.product_id = p.id
            left join labels l on l.sub_batch_id = sb.id
            left join assigned_units au
                   on au.sub_batch_id = l.sub_batch_id
                  and au.unit_serial_no = l.serial_no
            where p.active is true
            group by p.id, p.name, p.sku, p.barcode, p.low_stock_threshold
            order by p.name
            """, (rs, n) -> {
                long available = rs.getLong("available_units");
                Integer threshold = (Integer) rs.getObject("low_stock_threshold");
                return new StockDtos.ProductStock(
                        rs.getString("product_id"),
                        rs.getString("product_name"),
                        rs.getString("sku"),
                        rs.getString("barcode"),
                        rs.getLong("total_units"),
                        available,
                        rs.getLong("assigned_units"),
                        rs.getLong("returned_units"),
                        threshold,
                        threshold != null && available <= threshold,
                        rs.getString("earliest_expiry"));
            });
    }

    /** Stock broken down by sub-batch, so a specific batch can be traced or recalled. */
    public List<StockDtos.BatchStock> byBatch() {
        return jdbc.query("""
            select sb.id::text as sub_batch_id,
                   sb.code as sub_batch_code,
                   b.code as batch_code,
                   s.name as supplier_name,
                   p.name as product_name,
                   sb.expiry::text as expiry,
                   sb.expiry < current_date as expired,
                   count(l.serial_no) as total_units,
                   count(l.serial_no) filter (where au.id is null) as available_units,
                   count(au.id) filter (where au.returned_at is null) as assigned_units
            from sub_batches sb
            left join batches b on b.id = sb.parent_batch_id
            left join suppliers s on s.id = b.supplier_id
            left join products p on p.id = sb.product_id
            left join labels l on l.sub_batch_id = sb.id
            left join assigned_units au
                   on au.sub_batch_id = l.sub_batch_id
                  and au.unit_serial_no = l.serial_no
            group by sb.id, sb.code, b.code, s.name, p.name, sb.expiry
            order by sb.expiry nulls last, sb.code
            """, (rs, n) -> new StockDtos.BatchStock(
                    rs.getString("sub_batch_id"),
                    rs.getString("sub_batch_code"),
                    rs.getString("batch_code"),
                    rs.getString("supplier_name"),
                    rs.getString("product_name"),
                    rs.getString("expiry"),
                    rs.getLong("total_units"),
                    rs.getLong("available_units"),
                    rs.getLong("assigned_units"),
                    rs.getBoolean("expired")));
    }

    public StockDtos.DashboardSummary dashboard() {
        List<StockDtos.ProductStock> products = byProduct();

        long availableUnits = products.stream().mapToLong(StockDtos.ProductStock::availableUnits).sum();
        long withCustomers = products.stream().mapToLong(StockDtos.ProductStock::assignedUnits).sum();
        List<StockDtos.ProductStock> low = products.stream()
                .filter(StockDtos.ProductStock::belowThreshold).toList();

        return new StockDtos.DashboardSummary(
                products.size(),
                availableUnits,
                withCustomers,
                countOrders("NEW"),
                countOrders("PICKING"),
                countOrders("DISPATCHED"),
                scalar("select count(*) from alerts where resolved_at is null"),
                scalar("select count(*) from alerts where resolved_at is null and severity = 'CRITICAL'"),
                scalar("select count(*) from sub_batches where expiry is not null "
                        + "and expiry <= current_date + 30 and expiry >= current_date"),
                low);
    }

    private long countOrders(String status) {
        Long v = jdbc.queryForObject(
                "select count(*) from orders where status::text = ?", Long.class, status);
        return v == null ? 0 : v;
    }

    private long scalar(String sql) {
        Long v = jdbc.queryForObject(sql, Long.class);
        return v == null ? 0 : v;
    }
}
