import { useEffect, useState } from "react";

import { LoginPage } from "./features/auth/LoginPage";
import { BatchForm } from "./features/batches/BatchForm";
import { PackingRunForm } from "./features/Packing/PackingRunForm";
import { LabelSheet } from "./features/Labels/LabelSheetForm";
import { VerifyProduct } from "./features/verify/VerifyProduct";
import OrderAssign from "./features/orders/OrderAssign";
import RecallSimulation from "./features/recall/RecallSimulation";
import AlertsDashboard from "./features/dashboard/AlertsDashboard";
import { AuthProvider } from "./features/auth/AuthContext";

type LoggedInUser = {
  email: string;
  role: string;
  password: string;
};

type View =
  | "receiveStock"
  | "packingRun"
  | "printLabels"
  | "verify"
  | "orderAssign"
  | "recall"
  | "alerts";

function App() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [activeView, setActiveView] = useState<View>("receiveStock");
  const [lastSubBatchId, setLastSubBatchId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("kanoga_admin");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LoggedInUser;
        setUser(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("kanoga_admin", JSON.stringify(user));
    } else {
      localStorage.removeItem("kanoga_admin");
    }
  }, [user]);

  function handleLogout() {
    setUser(null);
    setActiveView("receiveStock");
    setLastSubBatchId(null);
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <AuthProvider value={{ email: user.email, password: user.password }}>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#f3f4f6",
        }}
      >
        <aside
          style={{
            width: 220,
            padding: 16,
            borderRight: "1px solid #ddd",
            background: "#ffffff",
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Kanoga Admin</h2>
          <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => setActiveView("receiveStock")}
              style={navButtonStyle(activeView === "receiveStock")}
            >
              Receive Stock
            </button>

            <button
              onClick={() => setActiveView("packingRun")}
              style={navButtonStyle(activeView === "packingRun")}
            >
              Packing Run
            </button>

            <button
              onClick={() => setActiveView("printLabels")}
              style={navButtonStyle(activeView === "printLabels")}
            >
              Print Labels
            </button>

            <button
              onClick={() => setActiveView("verify")}
              style={navButtonStyle(activeView === "verify")}
            >
              Verify Product
            </button>

            <button
              onClick={() => setActiveView("orderAssign")}
              style={navButtonStyle(activeView === "orderAssign")}
            >
              Order Assign
            </button>

            <button
              onClick={() => setActiveView("recall")}
              style={navButtonStyle(activeView === "recall")}
            >
              Recall Simulation
            </button>

            <button
              onClick={() => setActiveView("alerts")}
              style={navButtonStyle(activeView === "alerts")}
            >
              Alerts Dashboard
            </button>
          </nav>
        </aside>

        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <header
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #ddd",
              background: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 14 }}>Logged in as</div>
              <div style={{ fontSize: 13, color: "#4b5563" }}>
                {user.email} ({user.role})
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                padding: "6px 10px",
                fontSize: 13,
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </header>

          <section style={{ padding: 16, flex: 1 }}>
            {activeView === "receiveStock" && <BatchForm />}

            {activeView === "packingRun" && (
              <PackingRunForm
                onCreated={(subBatchId) => {
                  setLastSubBatchId(subBatchId);
                  setActiveView("printLabels");
                }}
              />
            )}

            {activeView === "printLabels" && (
              <LabelSheet subBatchId={lastSubBatchId} />
            )}

            {activeView === "verify" && <VerifyProduct />}

            {activeView === "orderAssign" && <OrderAssign />}

            {activeView === "recall" && <RecallSimulation />}

            {activeView === "alerts" && <AlertsDashboard />}
          </section>
        </main>
      </div>
    </AuthProvider>
  );
}

function navButtonStyle(active: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    padding: 8,
    borderRadius: 6,
    border: "none",
    background: active ? "#e0e7ff" : "transparent",
    cursor: "pointer",
  };
}

export default App;