import { useEffect, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type AlertItemDto = {
  subBatchId: number;
  subBatchCode: string;
  expiry: string | null;
  totalUnits: number;
  assignedUnits: number;
  availableUnits: number;
  severity: string;
  type: string;
  message: string;
};

type AlertsDashboardResponseDto = {
  expiredCount: number;
  expiringSoonCount: number;
  lowStockCount: number;
  expired: AlertItemDto[];
  expiringSoon: AlertItemDto[];
  lowStock: AlertItemDto[];
};

export default function AlertsDashboard() {
  const auth = useAuth();

  const [data, setData] = useState<AlertsDashboardResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    if (!auth) return;

    setError(null);
    try {
      setLoading(true);
      const result = await apiGet<AlertsDashboardResponseDto>(
        "/api/dashboard/alerts",
        auth
      );
      setData(result);
    } catch (e) {
      console.error(e);
      setError("Could not load alerts dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [auth]);

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Alerts Dashboard</h2>
      <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 14 }}>
        Live operational alerts for expiry risk and low stock.
      </p>

      <div style={{ marginBottom: 14 }}>
        <button
          onClick={loadDashboard}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            background: "#111827",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Refreshing..." : "Refresh alerts"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard label="Expired" value={String(data.expiredCount)} />
            <StatCard label="Expiring soon" value={String(data.expiringSoonCount)} />
            <StatCard label="Low stock" value={String(data.lowStockCount)} />
          </div>

          <AlertSection
            title="Expired sub-batches"
            items={data.expired}
            emptyMessage="No expired sub-batches."
          />

          <AlertSection
            title="Expiring soon"
            items={data.expiringSoon}
            emptyMessage="No sub-batches expiring soon."
          />

          <AlertSection
            title="Low stock"
            items={data.lowStock}
            emptyMessage="No low-stock sub-batches."
          />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
        {value}
      </div>
    </div>
  );
}

function AlertSection({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: AlertItemDto[];
  emptyMessage: string;
}) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#fff",
      }}
    >
      <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 10 }}>{title}</h3>

      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "#6b7280" }}>{emptyMessage}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={thStyle}>Sub-batch</th>
                <th style={thStyle}>Expiry</th>
                <th style={thStyle}>Available</th>
                <th style={thStyle}>Assigned</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Message</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.type}-${item.subBatchId}`}>
                  <td style={tdStyle}>{item.subBatchCode}</td>
                  <td style={tdStyle}>{item.expiry ?? "—"}</td>
                  <td style={tdStyle}>{item.availableUnits}</td>
                  <td style={tdStyle}>{item.assignedUnits}</td>
                  <td style={tdStyle}>{item.totalUnits}</td>
                  <td style={tdStyle}>{item.type}</td>
                  <td style={tdStyle}>{item.severity}</td>
                  <td style={tdStyle}>{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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