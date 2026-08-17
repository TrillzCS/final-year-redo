import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type ProductStock = {
  productId: string;
  productName: string;
  sku: string | null;
  barcode: string | null;
  totalUnits: number;
  availableUnits: number;
  assignedUnits: number;
  returnedUnits: number;
  lowStockThreshold: number | null;
  belowThreshold: boolean;
  earliestExpiry: string | null;
};

type BatchStock = {
  subBatchId: string;
  subBatchCode: string;
  batchCode: string | null;
  supplierName: string | null;
  productName: string | null;
  expiry: string | null;
  totalUnits: number;
  availableUnits: number;
  assignedUnits: number;
  expired: boolean;
};

type Tab = "products" | "batches";

export default function Stock() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [batches, setBatches] = useState<BatchStock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const [p, b] = await Promise.all([
        apiGet<ProductStock[]>("/api/stock/products", auth),
        apiGet<BatchStock[]>("/api/stock/batches", auth),
      ]);
      setProducts(p);
      setBatches(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load stock.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const totalAvailable = products.reduce((sum, p) => sum + p.availableUnits, 0);

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Stock</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            Counted from labelled units, not a stored total — {totalAvailable} unit(s) available across{" "}
            {products.length} product(s).
          </p>
        </div>
        <button onClick={load} disabled={loading} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, whiteSpace: "nowrap" }}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "inline-flex", borderRadius: 8, background: "#f1f5f9", padding: 3, gap: 2, marginBottom: 14 }}>
        {(["products", "batches"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "#111827" : "#6b7280",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t === "products" ? "By product" : "By batch"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
        {tab === "products" ? (
          products.length === 0 ? (
            <Empty>No products yet. Add them under Catalogue.</Empty>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Product", "SKU", "Available", "With customers", "Returned", "Total made", "Earliest expiry", "Status"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.productId}>
                    <td style={{ ...td, fontWeight: 600, color: "#111827" }}>{p.productName}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{p.sku ?? "—"}</td>
                    <td style={{ ...td, fontWeight: 700, color: "#111827" }}>{p.availableUnits}</td>
                    <td style={td}>{p.assignedUnits}</td>
                    <td style={td}>{p.returnedUnits > 0 ? p.returnedUnits : "—"}</td>
                    <td style={td}>{p.totalUnits}</td>
                    <td style={td}>{p.earliestExpiry ?? "—"}</td>
                    <td style={td}>
                      {p.lowStockThreshold == null ? (
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>No reorder point</span>
                      ) : p.availableUnits === 0 ? (
                        <Chip state="critical">Out of stock</Chip>
                      ) : p.belowThreshold ? (
                        <Chip state="warning">Reorder</Chip>
                      ) : (
                        <Chip state="good">In stock</Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : batches.length === 0 ? (
          <Empty>No packing runs yet.</Empty>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Sub-batch", "Product", "From batch", "Supplier", "Expiry", "Available", "With customers", "Status"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.subBatchId} style={{ opacity: b.expired ? 0.6 : 1 }}>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#111827" }}>{b.subBatchCode}</td>
                  <td style={td}>{b.productName ?? "—"}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{b.batchCode ?? "—"}</td>
                  <td style={td}>{b.supplierName ?? "—"}</td>
                  <td style={td}>{b.expiry ?? "—"}</td>
                  <td style={{ ...td, fontWeight: 700, color: "#111827" }}>{b.availableUnits}</td>
                  <td style={td}>{b.assignedUnits}</td>
                  <td style={td}>
                    {b.expired ? (
                      <Chip state="critical">Expired</Chip>
                    ) : b.availableUnits === 0 ? (
                      <Chip state="good">Fully allocated</Chip>
                    ) : (
                      <Chip state="good">Available</Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Chip({ state, children }: { state: "good" | "warning" | "critical"; children: React.ReactNode }) {
  const c =
    state === "critical"
      ? { bg: "#fef2f2", fg: "#b91c1c", br: "#fecaca" }
      : state === "warning"
      ? { bg: "#fffbeb", fg: "#b45309", br: "#fde68a" }
      : { bg: "#f0fdf4", fg: "#15803d", br: "#bbf7d0" };
  return (
    <span style={{ background: c.bg, color: c.fg, border: `1px solid ${c.br}`, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: "#9ca3af", padding: "24px 0", textAlign: "center" }}>{children}</div>;
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };

const th: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "9px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#374151",
  whiteSpace: "nowrap",
};
