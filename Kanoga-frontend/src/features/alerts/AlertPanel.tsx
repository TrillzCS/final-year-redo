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

export default function AlertPanel() {
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

  function severityColor(severity: string) {
    switch (severity?.toLowerCase()) {
      case "critical": return { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" };
      case "high": return { background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c" };
      case "medium": return { background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309" };
      default: return { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" };
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Alerts Dashboard</h2>
      <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 14 }}>
        System alerts for expiry dates, low stock and other operational issues.
      </p>

      {error && (
        <div style={{ padding: 10, borderRadius: 8, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Loading alerts...</div>
      )}

      {!loading && alerts.length === 0 && !error && (
        <div style={{ padding: 16, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#6b7280" }}>
          No active alerts.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.map((a) => (
          <div
            key={a.id}
            style={{
              padding: 14,
              borderRadius: 10,
              fontSize: 13,
              ...severityColor(a.severity),
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>
                  {a.severity}
                </span>
                <span style={{ fontWeight: 600 }}>{a.type}</span>
                {a.targetType && (
                  <span style={{ color: "#6b7280", fontSize: 11 }}>
                    {a.targetType}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </div>
            <div>{a.message}</div>
            {a.resolvedAt && (
              <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
                Resolved: {new Date(a.resolvedAt).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}