package com.kanoga.kanoga_backend.imports;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class CsvOrderAdapter implements StoreOrderAdapter {

    @Override
    public String source() {
        return "csv";
    }

    @Override
    public String description() {
        return "CSV export: order_no, customer_name, customer_email, sku, product_name, quantity";
    }

    @Override
    public List<InboundOrder> parse(String rawBody) {
        if (rawBody == null || rawBody.isBlank()) {
            throw new IllegalArgumentException("The CSV file is empty");
        }

        List<List<String>> rows = readCsv(rawBody);
        if (rows.size() < 2) {
            throw new IllegalArgumentException(
                    "The CSV needs a header row and at least one order row");
        }

        Map<String, Integer> col = new LinkedHashMap<>();
        List<String> header = rows.get(0);
        for (int i = 0; i < header.size(); i++) {
            col.put(header.get(i).trim().toLowerCase(Locale.ROOT).replace(' ', '_'), i);
        }

        requireColumn(col, "order_no");
        requireColumn(col, "quantity");
        if (!col.containsKey("sku") && !col.containsKey("product_name")) {
            throw new IllegalArgumentException(
                    "The CSV needs a 'sku' column, a 'product_name' column, or both");
        }

        Map<String, List<InboundLine>> linesByOrder = new LinkedHashMap<>();
        Map<String, InboundCustomer> customerByOrder = new LinkedHashMap<>();
        Map<String, String> statusByOrder = new LinkedHashMap<>();

        for (int r = 1; r < rows.size(); r++) {
            List<String> row = rows.get(r);
            int lineNo = r + 1; // 1-based, counting the header

            if (row.stream().allMatch(v -> v == null || v.isBlank())) {
                continue; // tolerate blank lines
            }

            String orderNo = value(row, col, "order_no");
            if (orderNo.isBlank()) {
                throw new IllegalArgumentException("Row " + lineNo + ": order_no is blank");
            }

            int quantity;
            String rawQty = value(row, col, "quantity");
            try {
                quantity = Integer.parseInt(rawQty.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException(
                        "Row " + lineNo + ": quantity '" + rawQty + "' is not a whole number");
            }
            if (quantity <= 0) {
                throw new IllegalArgumentException(
                        "Row " + lineNo + ": quantity must be greater than zero");
            }

            String sku = value(row, col, "sku");
            String productName = value(row, col, "product_name");
            if (sku.isBlank() && productName.isBlank()) {
                throw new IllegalArgumentException(
                        "Row " + lineNo + ": needs a sku or a product_name");
            }

            linesByOrder.computeIfAbsent(orderNo, k -> new ArrayList<>())
                    .add(new InboundLine(blankToNull(sku), blankToNull(productName), quantity));

            customerByOrder.putIfAbsent(orderNo, new InboundCustomer(
                    blankToNull(value(row, col, "customer_name")),
                    blankToNull(value(row, col, "customer_email")),
                    blankToNull(value(row, col, "phone")),
                    blankToNull(value(row, col, "address1")),
                    blankToNull(value(row, col, "address2")),
                    blankToNull(value(row, col, "city")),
                    blankToNull(value(row, col, "country")),
                    blankToNull(value(row, col, "postcode"))
            ));

            String status = value(row, col, "status");
            if (!status.isBlank()) {
                statusByOrder.putIfAbsent(orderNo, status.trim().toUpperCase(Locale.ROOT));
            }
        }

        List<InboundOrder> orders = new ArrayList<>();
        for (Map.Entry<String, List<InboundLine>> e : linesByOrder.entrySet()) {
            orders.add(new InboundOrder(
                    e.getKey(),
                    source(),
                    statusByOrder.get(e.getKey()),
                    null,
                    customerByOrder.get(e.getKey()),
                    e.getValue()
            ));
        }
        return orders;
    }

    private static void requireColumn(Map<String, Integer> col, String name) {
        if (!col.containsKey(name)) {
            throw new IllegalArgumentException("The CSV is missing a '" + name + "' column");
        }
    }

    private static String value(List<String> row, Map<String, Integer> col, String name) {
        Integer idx = col.get(name);
        if (idx == null || idx >= row.size() || row.get(idx) == null) return "";
        return row.get(idx).trim();
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v;
    }

    /** Minimal RFC 4180 reader: handles quoted fields, embedded commas, and "" escapes. */
    private static List<List<String>> readCsv(String input) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;

        String normalised = input.replace("\r\n", "\n").replace('\r', '\n');

        for (int i = 0; i < normalised.length(); i++) {
            char c = normalised.charAt(i);

            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < normalised.length() && normalised.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ',') {
                row.add(field.toString());
                field.setLength(0);
            } else if (c == '\n') {
                row.add(field.toString());
                field.setLength(0);
                rows.add(row);
                row = new ArrayList<>();
            } else {
                field.append(c);
            }
        }

        row.add(field.toString());
        if (row.stream().anyMatch(v -> !v.isBlank()) || !rows.isEmpty()) {
            rows.add(row);
        }
        return rows;
    }
}
