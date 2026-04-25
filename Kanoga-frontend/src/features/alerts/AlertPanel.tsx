import { useEffect, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type Alert = {
  id: string;
  type: string;
  targetType: string | null;
  targetId: string | null;
  message: string;
  severity: string;
  createdAt: string;
  resolvedAt: string | null;
};

export default function AlertsDashboard() {
  const auth = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    apiGet<Alert[]>("/api/alerts", auth)
      .then(setAlerts)
      .catch((err) => {
        console.error(err);
        setError("Failed to load alerts");
      })
      .finally(() => setLoading(false));
  }, [auth]);

  function severityStyle(severity: string) {
    switch (severity?.toUpperCase()) {
      case "CRITICAL": return { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", dot: "#ef4444", label: "Critical" };
      case "HIGH":     return { background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", dot: "#f97316", label: "High" };
      case "MEDIUM":   return { background: "#fefce8", border: "1px solid #fde68a", color: "#b45309", dot: "#eab308", label: "Medium" };
      default:         return { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", dot: "#22c55e", label: "Low" };
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Alerts Dashboard</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          System alerts for expiring batches and low stock. Checked every 60 seconds.
        </p>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 16, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 13, color: "#9ca3af", padding: "20px 0" }}>Loading alerts…</div>
      )}

      {!loading && alerts.length === 0 && !error && (
        <div style={{ padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#6b7280", textAlign: "center" }}>
          No active alerts — everything looks good.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.map((a) => {
          const s = severityStyle(a.severity);
          return (
            <div key={a.id} style={{ padding: "14px 16px", borderRadius: 12, fontSize: 13, background: s.background, border: s.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: s.color }}>{s.label}</span>
                  <span style={{ fontWeight: 600, color: s.color }}>{a.type}</span>
                  {a.targetType && <span style={{ color: "#9ca3af", fontSize: 11 }}>{a.targetType}</span>}
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
              <div style={{ color: "#374151" }}>{a.message}</div>
              {a.resolvedAt && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>
                  Resolved: {new Date(a.resolvedAt).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}