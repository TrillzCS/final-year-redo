import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useAppConfig } from "../../lib/useAppConfig";

type Outstanding = {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
  qtyOrdered: number;
  qtyPicked: number;
  source: string | null;
  sourceName: string | null;
};

type PickLine = {
  productName: string | null;
  sku: string | null;
  barcode: string | null;
  subBatchCode: string;
  expiry: string | null;
  quantity: number;
  serials: number[];
  orderNumbers: string[];
};

type PickingList = {
  generatedAt: string;
  orderCount: number;
  unitCount: number;
  orderNumbers: string[];
  lines: PickLine[];
};

type DispatchResult = {
  dispatchedCount: number;
  dispatched: string[];
  failures: { orderNumber: string; reason: string }[];
};

export default function Picking() {
  const auth = useAuth();
  const config = useAppConfig();

  const [orders, setOrders] = useState<Outstanding[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sheet, setSheet] = useState<PickingList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await apiGet<Outstanding[]>("/api/picking/outstanding", auth));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load outstanding orders.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
    setSheet(null);
  }

  function selectAll() {
    const next: Record<string, boolean> = {};
    orders.forEach((o) => (next[o.orderId] = true));
    setSelected(next);
    setSheet(null);
  }

  async function buildSheet() {
    setError(null);
    if (!auth) return;
    if (selectedIds.length === 0) return setError("Select at least one order.");
    try {
      setBuilding(true);
      setSheet(await apiPost<string[], PickingList>("/api/picking/list", selectedIds, auth));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the picking list.");
    } finally {
      setBuilding(false);
    }
  }

  async function dispatchSelected() {
    setError(null);
    setNotice(null);
    if (!auth) return;
    if (selectedIds.length === 0) return setError("Select the orders you have packed.");
    if (!window.confirm(`Mark ${selectedIds.length} order(s) as dispatched?`)) return;
    try {
      setDispatching(true);
      const r = await apiPost<string[], DispatchResult>("/api/picking/dispatch", selectedIds, auth);
      const parts = [`${r.dispatchedCount} order(s) dispatched.`];
      if (r.failures.length > 0) {
        parts.push(r.failures.map((f) => `${f.orderNumber}: ${f.reason}`).join(" · "));
      }
      setNotice(parts.join(" "));
      setSelected({});
      setSheet(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not dispatch those orders.");
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="no-print" style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Picking</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          Select the orders you are packing, then print one sheet. Lines are grouped by
          sub-batch and ordered by expiry, so the shelves are walked once and the oldest
          stock goes first.
        </p>
      </div>

      {error && (
        <div className="no-print" style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {notice && (
        <div className="no-print" style={{ padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", marginBottom: 14, fontSize: 13 }}>
          {notice}
        </div>
      )}

      <div className="no-print" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>
            Orders awaiting dispatch {loading ? "(loading…)" : `(${orders.length})`}
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={selectAll} style={secondaryBtn}>Select all</button>
            <button onClick={load} style={secondaryBtn}>Refresh</button>
            <button onClick={buildSheet} disabled={building} style={primaryBtn(building)}>
              {building ? "Building…" : `Build sheet (${selectedIds.length})`}
            </button>
            <button onClick={dispatchSelected} disabled={dispatching} style={dispatchBtn(dispatching)}>
              {dispatching ? "Dispatching…" : "Mark dispatched"}
            </button>
          </div>
        </div>

        {orders.length === 0 && !loading ? (
          <div style={{ fontSize: 13, color: "#9ca3af", padding: "18px 0", textAlign: "center" }}>
            Nothing waiting. Orders appear here while their status is NEW or PICKING.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["", "Order", "Store", "Customer", "Status", "Picked"].map((h, i) => (
                  <th key={i} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderId}>
                  <td style={{ ...td, width: 30 }}>
                    <input type="checkbox" checked={!!selected[o.orderId]} onChange={() => toggle(o.orderId)} />
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: "#111827" }}>{o.orderNumber}</td>
                  <td style={td}>
                    <span style={{ background: "#eef2ff", color: "#4338ca", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
                      {storeLabel(o)}
                    </span>
                  </td>
                  <td style={td}>{o.customerName ?? "—"}</td>
                  <td style={td}>{o.status}</td>
                  <td style={td}>
                    {o.qtyOrdered > 0 ? `${o.qtyPicked} of ${o.qtyOrdered}` : `${o.qtyPicked}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sheet && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                {config.companyName} — Picking sheet
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                {new Date(sheet.generatedAt).toLocaleString()} · {sheet.orderCount} order(s) ·{" "}
                {sheet.unitCount} unit(s)
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                {sheet.orderNumbers.join(", ")}
              </div>
            </div>
            <button className="no-print" onClick={() => window.print()} style={primaryBtn(false)}>
              Print sheet
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["✓", "Product", "SKU", "Sub-batch", "Expiry", "Qty", "Serials", "For orders"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ ...td, width: 26 }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "1.5px solid #9ca3af", borderRadius: 3 }} />
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: "#111827" }}>{l.productName ?? "—"}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{l.sku ?? "—"}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{l.subBatchCode}</td>
                  <td style={td}>{l.expiry ?? "—"}</td>
                  <td style={{ ...td, fontWeight: 700, color: "#111827" }}>{l.quantity}</td>
                  <td style={{ ...td, whiteSpace: "normal", fontFamily: "monospace", fontSize: 11 }}>
                    {formatSerials(l.serials)}
                  </td>
                  <td style={{ ...td, whiteSpace: "normal", fontSize: 12 }}>{l.orderNumbers.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// An order that predates the source column has nothing recorded, which is not the same
// as one that was keyed in by hand.
function storeLabel(o: Outstanding): string {
  if (o.sourceName) return o.sourceName;
  if (!o.source) return "Not recorded";
  if (o.source === "manual") return "Entered manually";
  return o.source.toUpperCase();
}

// 1,2,3,7,8 reads better as 1-3, 7-8 on a printed sheet.
function formatSerials(serials: number[]): string {
  if (serials.length === 0) return "—";
  const sorted = [...serials].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const n = sorted[i];
    if (n !== prev + 1) {
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = n;
    }
    prev = n;
  }
  return parts.join(", ");
}

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
  verticalAlign: "top",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
    whiteSpace: "nowrap",
  };
}

function dispatchBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
    whiteSpace: "nowrap",
  };
}

const secondaryBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  color: "#374151",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
