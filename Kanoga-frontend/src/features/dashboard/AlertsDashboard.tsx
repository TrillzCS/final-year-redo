import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

/** Shape returned by GET /api/alerts (AlertsDashboardController). */
type AlertRow = {
  id: string;
  type: string;
  target_type: string | null;
  target_id: string | null;
  message: string;
  severity: string;
  created_at: string | null;
  resolved_at: string | null;
};

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function severityStyle(severity: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", dot: "#ef4444", label: "Critical" };
    case "HIGH":
      return { background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", dot: "#f97316", label: "High" };
    case "MEDIUM":
      return { background: "#fefce8", border: "1px solid #fde68a", color: "#b45309", dot: "#eab308", label: "Medium" };
    default:
      return { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", dot: "#22c55e", label: "Low" };
  }
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

export default function AlertsDashboard() {
  const auth = useAuth();

  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!auth) return;

    setError(null);
    setLoading(true);
    try {
      const rows = await apiGet<AlertRow[]>("/api/alerts", auth);
      const sorted = [...rows].sort((a, b) => {
        const bySeverity =
          (SEVERITY_ORDER[a.severity?.toUpperCase()] ?? 99) -
          (SEVERITY_ORDER[b.severity?.toUpperCase()] ?? 99);
        if (bySeverity !== 0) return bySeverity;
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      });
      setAlerts(sorted);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Could not load alerts.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const counts = alerts.reduce<Record<string, number>>((acc, a) => {
    const key = a.severity?.toUpperCase() ?? "LOW";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Alerts Dashboard</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          Expiry and stock alerts raised by the background scheduler, which checks every 60 seconds.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={loadAlerts}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            background: "#111827",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Refreshing…" : "Refresh alerts"}
        </button>
        {lastRefreshed && (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Last refreshed {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
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

      {!error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => (
            <StatCard key={level} label={severityStyle(level).label} value={counts[level] ?? 0} />
          ))}
        </div>
      )}

      {loading && alerts.length === 0 && (
        <div style={{ fontSize: 13, color: "#9ca3af", padding: "20px 0" }}>Loading alerts…</div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#fff",
            fontSize: 13,
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          No unresolved alerts — nothing is expiring within the next 30 days.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.map((a) => {
          const s = severityStyle(a.severity);
          return (
            <div
              key={a.id}
              style={{ padding: "14px 16px", borderRadius: 12, fontSize: 13, background: s.background, border: s.border }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: s.color,
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontWeight: 600, color: s.color }}>{a.type}</span>
                  {a.target_type && <span style={{ color: "#9ca3af", fontSize: 11 }}>{a.target_type}</span>}
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                  {formatTimestamp(a.created_at)}
                </span>
              </div>
              <div style={{ color: "#374151" }}>{a.message}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  );
}
