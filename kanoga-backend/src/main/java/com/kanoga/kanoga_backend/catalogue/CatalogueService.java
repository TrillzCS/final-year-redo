package com.kanoga.kanoga_backend.catalogue;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Managing the product and supplier catalogue. */
@Service
public class CatalogueService {

    private final JdbcTemplate jdbc;

    public CatalogueService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ProductDto> listProducts(boolean includeInactive) {
        String sql = """
            select id::text as id, name, sku, barcode,
                   unit_size, unit_of_measure, shelf_life_months, active
            from products
            """ + (includeInactive ? "" : " where active is true ") + " order by name asc";

        return jdbc.query(sql, (rs, n) -> new ProductDto(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("sku"),
                rs.getString("barcode"),
                rs.getBigDecimal("unit_size"),
                rs.getString("unit_of_measure"),
                (Integer) rs.getObject("shelf_life_months"),
                rs.getBoolean("active")
        ));
    }

    @Transactional
    public ProductDto createProduct(ProductUpsertRequest req) {
        String name = required(req == null ? null : req.name(), "Product name");
        String sku = trimToNull(req.sku());
        String barcode = trimToNull(req.barcode());

        requireUnique("sku", sku, null);
        requireUnique("barcode", barcode, null);

        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into products (id, name, sku, barcode, unit_size, unit_of_measure,
                                  shelf_life_months, active)
            values (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                id, name, sku, barcode,
                req.unitSize(), defaultUnit(req.unitOfMeasure()),
                req.shelfLifeMonths(), req.active() == null || req.active());

        return getProduct(id);
    }

    @Transactional
    public ProductDto updateProduct(String productId, ProductUpsertRequest req) {
        UUID id = parseId(productId, "product");
        requireExists("products", id, "Product");

        String name = required(req == null ? null : req.name(), "Product name");
        String sku = trimToNull(req.sku());
        String barcode = trimToNull(req.barcode());

        requireUnique("sku", sku, id);
        requireUnique("barcode", barcode, id);

        jdbc.update("""
            update products
            set name = ?, sku = ?, barcode = ?, unit_size = ?, unit_of_measure = ?,
                shelf_life_months = ?, active = ?
            where id = ?
            """,
                name, sku, barcode, req.unitSize(), defaultUnit(req.unitOfMeasure()),
                req.shelfLifeMonths(), req.active() == null || req.active(), id);

        return getProduct(id);
    }

    private ProductDto getProduct(UUID id) {
        return jdbc.queryForObject("""
            select id::text as id, name, sku, barcode,
                   unit_size, unit_of_measure, shelf_life_months, active
            from products where id = ?
            """, (rs, n) -> new ProductDto(
                rs.getString("id"), rs.getString("name"), rs.getString("sku"),
                rs.getString("barcode"), rs.getBigDecimal("unit_size"),
                rs.getString("unit_of_measure"),
                (Integer) rs.getObject("shelf_life_months"), rs.getBoolean("active")), id);
    }

    public ProductDto findByCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("A barcode, SKU or name is required");
        }
        String needle = code.trim();

        List<ProductDto> hits = jdbc.query("""
            select id::text as id, name, sku, barcode,
                   unit_size, unit_of_measure, shelf_life_months, active
            from products
            where barcode = ? or sku = ? or lower(name) = lower(?)
            limit 1
            """, (rs, n) -> new ProductDto(
                rs.getString("id"), rs.getString("name"), rs.getString("sku"),
                rs.getString("barcode"), rs.getBigDecimal("unit_size"),
                rs.getString("unit_of_measure"),
                (Integer) rs.getObject("shelf_life_months"), rs.getBoolean("active")),
                needle, needle, needle);

        if (hits.isEmpty()) {
            throw new IllegalArgumentException("No product matches '" + needle + "'");
        }
        return hits.get(0);
    }

    public List<SupplierDto> listSuppliers(boolean includeInactive) {
        String sql = """
            select id::text as id, name, contact_email, contact_phone, country, active
            from suppliers
            """ + (includeInactive ? "" : " where active is true ") + " order by name asc";

        return jdbc.query(sql, (rs, n) -> new SupplierDto(
                rs.getString("id"), rs.getString("name"), rs.getString("contact_email"),
                rs.getString("contact_phone"), rs.getString("country"), rs.getBoolean("active")));
    }

    @Transactional
    public SupplierDto createSupplier(SupplierUpsertRequest req) {
        String name = required(req == null ? null : req.name(), "Supplier name");
        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into suppliers (id, name, contact_email, contact_phone, country, active)
            values (?, ?, ?, ?, ?, ?)
            """, id, name, trimToNull(req.contactEmail()), trimToNull(req.contactPhone()),
                trimToNull(req.country()), req.active() == null || req.active());
        return getSupplier(id);
    }

    @Transactional
    public SupplierDto updateSupplier(String supplierId, SupplierUpsertRequest req) {
        UUID id = parseId(supplierId, "supplier");
        requireExists("suppliers", id, "Supplier");
        String name = required(req == null ? null : req.name(), "Supplier name");
        jdbc.update("""
            update suppliers
            set name = ?, contact_email = ?, contact_phone = ?, country = ?, active = ?
            where id = ?
            """, name, trimToNull(req.contactEmail()), trimToNull(req.contactPhone()),
                trimToNull(req.country()), req.active() == null || req.active(), id);
        return getSupplier(id);
    }

    private SupplierDto getSupplier(UUID id) {
        return jdbc.queryForObject("""
            select id::text as id, name, contact_email, contact_phone, country, active
            from suppliers where id = ?
            """, (rs, n) -> new SupplierDto(
                rs.getString("id"), rs.getString("name"), rs.getString("contact_email"),
                rs.getString("contact_phone"), rs.getString("country"),
                rs.getBoolean("active")), id);
    }

    private void requireUnique(String column, String value, UUID excludeId) {
        if (value == null) return;
        List<?> clash = excludeId == null
                ? jdbc.queryForList("select id from products where " + column + " = ? limit 1", value)
                : jdbc.queryForList(
                        "select id from products where " + column + " = ? and id <> ? limit 1",
                        value, excludeId);
        if (!clash.isEmpty()) {
            throw new IllegalArgumentException(
                    "Another product already uses the " + column + " '" + value + "'");
        }
    }

    private void requireExists(String table, UUID id, String label) {
        if (jdbc.queryForList("select id from " + table + " where id = ? limit 1", id).isEmpty()) {
            throw new IllegalArgumentException(label + " not found");
        }
    }

    private static UUID parseId(String raw, String label) {
        try {
            return UUID.fromString(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException("'" + raw + "' is not a valid " + label + " id");
        }
    }

    private static String required(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " is required");
        }
        return value.trim();
    }

    private static String trimToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static String defaultUnit(String unit) {
        return unit == null || unit.isBlank() ? "unit" : unit.trim().toLowerCase(Locale.ROOT);
    }

    @SuppressWarnings("unused")
    private static BigDecimal unusedMarker() {
        return null;
    }
}
