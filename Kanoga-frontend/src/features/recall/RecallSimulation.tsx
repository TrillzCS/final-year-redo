import { useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type RecallAffectedUnitDto = {
  subBatchCode: string | null;
  serialNo: number | null;
  orderNo: string | null;
  customerName: string | null;
  customerEmail: string | null;
  expiry: string | null;
};

type RecallResultDto = {
  batchCode: string;
  affectedSubBatches: number;
  affectedUnits: number;
  affectedOrders: number;
  affectedCustomers: number;
  units: RecallAffectedUnitDto[];
};

export default function RecallSimulation() {
  const auth = useAuth();
  const [batchCode, setBatchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecallResultDto | null>(null);

  async function handleSimulate() {
    setError(null); setResult(null);
    if (!auth) return setError("Not authenticated.");
    if (!batchCode.trim()) return setError("Please enter a batch code.");
    try {
      setLoading(true);
      const data = await apiGet<RecallResultDto>(
        `/api/recall?batchCode=${encodeURIComponent(batchCode.trim())}`,
        auth
      );
      setResult(data);
    } catch (e) {
      console.error(e);
      setError("Recall simulation failed — check the batch code and try again.");
    } finally {
      setLoading(false);
    }
  }

  const thStyle: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e5e7eb" };
  const tdStyle: React.CSSProperties = { padding: "9px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Recall Simulation</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          Enter a batch code to trace all affected sub-batches, units, orders and customers.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16, padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>Batch code</label>
          <input
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            placeholder="e.g. KPG-25110001-7"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
        <button
          onClick={handleSimulate}
          disabled={loading}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Simulating…" : "Run recall simulation"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 16, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Batch", value: result.batchCode },
              { label: "Sub-batches affected", value: String(result.affectedSubBatches) },
              { label: "Units affected", value: String(result.affectedUnits) },
              { label: "Orders affected", value: String(result.affectedOrders) },
              { label: "Customers affected", value: String(result.affectedCustomers) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: 16, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 14, color: "#111827" }}>Affected units</h3>

            {result.units.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>No units found for this batch code.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={thStyle}>Sub-batch</th>
                      <th style={thStyle}>Serial</th>
                      <th style={thStyle}>Expiry</th>
                      <th style={thStyle}>Order number</th>
                      <th style={thStyle}>Customer name</th>
                      <th style={thStyle}>Customer email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.units.map((unit, index) => (
                      <tr key={index}>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{unit.subBatchCode ?? "—"}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{unit.serialNo ?? "—"}</td>
                        <td style={tdStyle}>{unit.expiry ?? "—"}</td>
                        <td style={tdStyle}>{unit.orderNo ?? <span style={{ color: "#9ca3af" }}>Not dispatched</span>}</td>
                        <td style={tdStyle}>{unit.customerName ?? <span style={{ color: "#9ca3af" }}>—</span>}</td>
                        <td style={tdStyle}>{unit.customerEmail ?? <span style={{ color: "#9ca3af" }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}