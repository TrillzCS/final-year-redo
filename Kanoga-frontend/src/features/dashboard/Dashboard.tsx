import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type ProductStock = {
  productId: string;
  productName: string;
  sku: string | null;
  availableUnits: number;
  lowStockThreshold: number | null;
  belowThreshold: boolean;
  earliestExpiry: string | null;
};

type Summary = {
  productCount: number;
  availableUnits: number;
  unitsWithCustomers: number;
  ordersAwaitingPicking: number;
  ordersPicking: number;
  ordersDispatched: number;
  openAlerts: number;
  criticalAlerts: number;
  expiringSoon: number;
  lowStock: ProductStock[];
};

type Activity = {
  id: string;
  occurredAt: string | null;
  actor: string | null;
  action: string;
  detail: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  ORDER_CREATED: "Order created",
  ORDER_STATUS_CHANGED: "Status changed",
  ORDER_DELETED: "Order deleted",
  UNITS_ASSIGNED: "Units picked",
  UNIT_RETURNED: "Unit returned",
  ORDERS_IMPORTED: "Orders imported",
};

export default function Dashboard({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const auth = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const [s, a] = await Promise.all([
        apiGet<Summary>("/api/stock/dashboard", auth),
        apiGet<Activity[]>("/api/activity?limit=12", auth),
      ]);
      setSummary(s);
      setActivity(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !summary) {
    return <div style={{ fontSize: 13, color: "#9ca3af", padding: "24px 0" }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Overview</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            Stock on hand, orders in progress and anything needing attention.
          </p>
        </div>
        <button onClick={load} disabled={loading} style={refreshBtn(loading)}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {summary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 12 }}>
            <Tile label="Units available" value={summary.availableUnits} hint={`${summary.productCount} active product(s)`} />
            <Tile label="With customers" value={summary.unitsWithCustomers} hint="Picked or dispatched" />
            <Tile
              label="Expiring within 30 days"
              value={summary.expiringSoon}
              hint={summary.expiringSoon > 0 ? "Sub-batches" : "Nothing near expiry"}
              state={summary.expiringSoon > 0 ? "warning" : undefined}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 20 }}>
            <Tile label="Awaiting picking" value={summary.ordersAwaitingPicking} hint="Status NEW" />
            <Tile label="Being picked" value={summary.ordersPicking} hint="Status PICKING" />
            <Tile
              label="Open alerts"
              value={summary.openAlerts}
              hint={summary.criticalAlerts > 0 ? `${summary.criticalAlerts} critical` : "None critical"}
              state={summary.criticalAlerts > 0 ? "critical" : summary.openAlerts > 0 ? "warning" : undefined}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Panel
              title="Needs reordering"
              action={onNavigate ? { label: "View stock", onClick: () => onNavigate("stock") } : undefined}
            >
              {summary.lowStock.length === 0 ? (
                <Empty>
                  Nothing is below its reorder point. Products with no reorder point set on
                  the Catalogue screen are not monitored.
                </Empty>
              ) : (
                summary.lowStock.map((p) => (
                  <div key={p.productId} style={rowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{p.productName}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{p.sku ?? "No SKU"}</div>
                    </div>
                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <StatusChip state={p.availableUnits === 0 ? "critical" : "warning"}>
                        {p.availableUnits === 0 ? "Out of stock" : `${p.availableUnits} left`}
                      </StatusChip>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
                        Reorder at {p.lowStockThreshold}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Panel>

            <Panel title="Recent activity">
              {activity.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : (
                activity.map((a) => (
                  <div key={a.id} style={rowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>
                        {ACTION_LABELS[a.action] ?? a.action}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{a.detail ?? "—"}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                      {a.occurredAt ? new Date(a.occurredAt).toLocaleString() : ""}
                      <div>{a.actor}</div>
                    </div>
                  </div>
                ))
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  state,
}: {
  label: string;
  value: number;
  hint?: string;
  state?: "warning" | "critical";
}) {
  return (
    <div style={{ padding: 16, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>{value}</div>
      {hint && (
        <div style={{ marginTop: 8 }}>
          {state ? <StatusChip state={state}>{hint}</StatusChip> : <span style={{ fontSize: 12, color: "#9ca3af" }}>{hint}</span>}
        </div>
      )}
    </div>
  );
}

function StatusChip({ state, children }: { state: "warning" | "critical" | "good"; children: React.ReactNode }) {
  const c =
    state === "critical"
      ? { bg: "#fef2f2", fg: "#b91c1c", br: "#fecaca" }
      : state === "warning"
      ? { bg: "#fffbeb", fg: "#b45309", br: "#fde68a" }
      : { bg: "#f0fdf4", fg: "#15803d", br: "#bbf7d0" };
  return (
    <span style={{ background: c.bg, color: c.fg, border: `1px solid ${c.br}`, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</h3>
        {action && (
          <button onClick={action.onClick} style={{ background: "none", border: "none", color: "#4f46e5", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            {action.label}
          </button>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: "#9ca3af", padding: "14px 0", textAlign: "center" }}>{children}</div>;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "9px 0",
  borderTop: "1px solid #f1f5f9",
  fontSize: 13,
};

function refreshBtn(loading: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
    cursor: loading ? "default" : "pointer",
    opacity: loading ? 0.6 : 1,
    whiteSpace: "nowrap",
  };
}
