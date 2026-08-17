import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/apiClient";
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

type WrittenOff = {
  subBatchCode: string;
  productName: string | null;
  serialNo: number;
  writtenOffAt: string | null;
  reason: string | null;
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

type Tab = "products" | "batches" | "writeOffs";

export default function Stock() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [batches, setBatches] = useState<BatchStock[]>([]);
  const [writeOffs, setWriteOffs] = useState<WrittenOff[]>([]);
  const [woSubBatch, setWoSubBatch] = useState("");
  const [woQuantity, setWoQuantity] = useState("1");
  const [woReason, setWoReason] = useState("");
  const [woSaving, setWoSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const [p, b, w] = await Promise.all([
        apiGet<ProductStock[]>("/api/stock/products", auth),
        apiGet<BatchStock[]>("/api/stock/batches", auth),
        apiGet<WrittenOff[]>("/api/stock/write-offs?limit=50", auth),
      ]);
      setProducts(p);
      setBatches(b);
      setWriteOffs(w);
      setError(null);
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

  async function submitWriteOff() {
    setError(null);
    setSuccess(null);
    if (!auth) return;
    if (!woSubBatch) return setError("Choose a sub-batch.");
    if (!woReason.trim()) return setError("Give a reason — write-offs are audited.");
    const qty = parseInt(woQuantity, 10);
    if (isNaN(qty) || qty <= 0) return setError("Enter a quantity of at least one.");
    try {
      setWoSaving(true);
      const res = await apiPost<Record<string, unknown>, { unitsWrittenOff: number }>(
        "/api/stock/write-off",
        { subBatchId: woSubBatch, quantity: qty, reason: woReason.trim() },
        auth
      );
      setSuccess(`${res.unitsWrittenOff} unit(s) written off.`);
      setWoQuantity("1");
      setWoReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write off that stock.");
    } finally {
      setWoSaving(false);
    }
  }

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
        {(["products", "batches", "writeOffs"] as Tab[]).map((t) => (
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
            {t === "products" ? "By product" : t === "batches" ? "By batch" : "Write-offs"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", marginBottom: 14, fontSize: 13 }}>
          {success}
        </div>
      )}

      {tab === "writeOffs" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#111827" }}>Write stock off</h3>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
            Damaged, used as a sample, or miscounted. Units leave available stock without
            being attached to an order, and the reason is recorded.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 2fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Sub-batch</label>
              <select value={woSubBatch} onChange={(e) => setWoSubBatch(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, background: "#fff", boxSizing: "border-box" }}>
                <option value="">Select…</option>
                {batches.filter((b) => b.availableUnits > 0).map((b) => (
                  <option key={b.subBatchId} value={b.subBatchId}>
                    {b.subBatchCode} — {b.availableUnits} available
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Qty</label>
              <input type="number" min={1} value={woQuantity} onChange={(e) => setWoQuantity(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Reason</label>
              <input value={woReason} onChange={(e) => setWoReason(e.target.value)} placeholder="Damaged in transit"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <button onClick={submitWriteOff} disabled={woSaving}
              style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#b91c1c", color: "#fff", fontSize: 13, fontWeight: 600, cursor: woSaving ? "default" : "pointer", opacity: woSaving ? 0.7 : 1, whiteSpace: "nowrap" }}>
              {woSaving ? "Saving…" : "Write off"}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
        {tab === "writeOffs" ? (
          writeOffs.length === 0 ? (
            <Empty>Nothing has been written off.</Empty>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Sub-batch", "Product", "Serial", "When", "Reason"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {writeOffs.map((w, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{w.subBatchCode}</td>
                    <td style={td}>{w.productName ?? "—"}</td>
                    <td style={td}>#{w.serialNo}</td>
                    <td style={td}>{w.writtenOffAt ? new Date(w.writtenOffAt).toLocaleString() : "—"}</td>
                    <td style={{ ...td, whiteSpace: "normal" }}>{w.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : tab === "products" ? (
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
