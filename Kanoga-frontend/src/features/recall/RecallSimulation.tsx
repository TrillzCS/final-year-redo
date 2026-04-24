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
    setError(null);
    setResult(null);
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

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Recall Simulation</h2>
      <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 14 }}>
        Enter a batch code to trace all affected sub-batches, units, orders and customers.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", marginBottom: 16, padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Batch code</label>
          <input
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            placeholder="e.g. BATCH-001"
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </div>
        <button
          onClick={handleSimulate}
          disabled={loading}
          style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Simulating..." : "Run recall simulation"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 10, borderRadius: 8, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
            <StatCard label="Batch" value={result.batchCode} />
            <StatCard label="Affected sub-batches" value={String(result.affectedSubBatches)} />
            <StatCard label="Affected units" value={String(result.affectedUnits)} />
            <StatCard label="Affected orders" value={String(result.affectedOrders)} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <StatCard label="Affected customers" value={String(result.affectedCustomers)} />
          </div>

          <div style={{ padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}>
            <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 10 }}>Affected units</h3>
            {result.units.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>No units found for this batch code.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
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
                        <td style={tdStyle}>{unit.subBatchCode ?? "—"}</td>
                        <td style={tdStyle}>{unit.serialNo ?? "—"}</td>
                        <td style={tdStyle}>{unit.expiry ?? "—"}</td>
                        <td style={tdStyle}>{unit.orderNo ?? "—"}</td>
                        <td style={tdStyle}>{unit.customerName ?? "—"}</td>
                        <td style={tdStyle}>{unit.customerEmail ?? "—"}</td>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 6px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 6px",
  borderBottom: "1px solid #f3f4f6",
  whiteSpace: "nowrap",
};