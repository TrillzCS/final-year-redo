import { useEffect, useState } from "react";
import { LoginPage } from "./features/auth/LoginPage";
import { BatchForm } from "./features/batches/BatchForm";
import { PackingRunForm } from "./features/Packing/PackingRunForm";
import { LabelSheet } from "./features/Labels/LabelSheetForm";
import { VerifyProduct } from "./features/verify/VerifyProduct";
import OrderAssign from "./features/orders/OrderAssign";
import RecallSimulation from "./features/recall/RecallSimulation";
import AlertsDashboard from "./features/dashboard/AlertsDashboard";
import OrderImport from "./features/imports/OrderImport";
import Catalogue from "./features/catalogue/Catalogue";
import Connections from "./features/connections/Connections";
import { AuthProvider } from "./features/auth/AuthContext";
import { useAppConfig } from "./lib/useAppConfig";

type LoggedInUser = { email: string; role: string; password: string };
type View = "catalogue" | "receiveStock" | "packingRun" | "printLabels" | "verify" | "connections" | "importOrders" | "orderAssign" | "recall" | "alerts";

const navItems: { view: View; label: string }[] = [
  { view: "catalogue", label: "Catalogue" },
  { view: "receiveStock", label: "Receive Stock" },
  { view: "packingRun", label: "Packing Run" },
  { view: "printLabels", label: "Print Labels" },
  { view: "verify", label: "Verify Product" },
  { view: "connections", label: "Store Connections" },
  { view: "importOrders", label: "Import Orders" },
  { view: "orderAssign", label: "Order Fulfilment" },
  { view: "recall", label: "Recall Simulation" },
  { view: "alerts", label: "Alerts" },
];

function App() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [activeView, setActiveView] = useState<View>("receiveStock");
  const [lastSubBatchId, setLastSubBatchId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("kanoga_admin");
    if (raw) {
      try { setUser(JSON.parse(raw) as LoggedInUser); } catch {}
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("kanoga_admin", JSON.stringify(user));
    else localStorage.removeItem("kanoga_admin");
  }, [user]);

  function handleLogout() {
    setUser(null);
    setActiveView("receiveStock");
    setLastSubBatchId(null);
  }

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <AuthProvider value={{ email: user.email, password: user.password }}>
      <Shell user={user} activeView={activeView} setActiveView={setActiveView}
             lastSubBatchId={lastSubBatchId} setLastSubBatchId={setLastSubBatchId}
             onLogout={handleLogout} />
    </AuthProvider>
  );
}

/** The application shell. */
function Shell({ user, activeView, setActiveView, lastSubBatchId, setLastSubBatchId, onLogout }: {
  user: LoggedInUser;
  activeView: View;
  setActiveView: (v: View) => void;
  lastSubBatchId: string | null;
  setLastSubBatchId: (v: string | null) => void;
  onLogout: () => void;
}) {
  const config = useAppConfig();
  const activeLabel = navItems.find(n => n.view === activeView)?.label ?? "";

  return (
    <>
      <div style={{ minHeight: "100vh", display: "flex", fontFamily: "system-ui, -apple-system, sans-serif", background: "#f8fafc" }}>

        {/* Sidebar */}
        <aside style={{ width: 230, background: "#111827", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #1f2937" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{config.companyName}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>Admin Panel</div>
          </div>

          <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map(({ view, label }) => {
              const active = activeView === view;
              return (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    textAlign: "left", padding: "9px 12px", borderRadius: 8,
                    border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
                    background: active ? "#4f46e5" : "transparent",
                    color: active ? "#ffffff" : "#9ca3af",
                    transition: "all 0.1s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <div style={{ padding: "12px 16px", borderTop: "1px solid #1f2937" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#4b5563", background: "#1f2937", padding: "2px 8px", borderRadius: 999 }}>{user.role}</span>
              <button onClick={onLogout} style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Log out
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header style={{ padding: "14px 24px", borderBottom: "1px solid #e5e7eb", background: "#ffffff", display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{activeLabel}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{config.productName}</div>
            </div>
          </header>

          <section style={{ padding: 24, flex: 1, overflowY: "auto" }}>
            {activeView === "receiveStock" && <BatchForm />}
            {activeView === "packingRun" && (
              <PackingRunForm onCreated={(subBatchId) => { setLastSubBatchId(subBatchId); setActiveView("printLabels"); }} />
            )}
            {activeView === "printLabels" && <LabelSheet subBatchId={lastSubBatchId} />}
            {activeView === "verify" && <VerifyProduct />}
            {activeView === "catalogue" && <Catalogue />}
            {activeView === "connections" && <Connections />}
            {activeView === "importOrders" && <OrderImport />}
            {activeView === "orderAssign" && <OrderAssign />}
            {activeView === "recall" && <RecallSimulation />}
            {activeView === "alerts" && <AlertsDashboard />}
          </section>
        </main>
      </div>
    </>
  );
}

export default App;