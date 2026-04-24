import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type Order = {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
};

type AssignedLabelDto = {
  labelId: number;
  serialNo: number;
  subBatchId: string;
};

type OrderAssignedUnitDto = {
  serialNo: number;
  subBatchId: string;
  subBatchCode: string;
  productName: string | null;
  expiry: string | null;
};

type SubBatchAvailableDto = {
  subBatchId: string;
  code: string;
  expiry: string | null;
  totalUnits: number;
  assignedUnits: number;
  availableUnits: number;
};

type AssignByQrResponse = {
  orderId: string;
  labelId: number;
  serialNo: number;
  subBatchId: number;
  assignedAt: string;
};

type CreateOrderRequest = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
};

type Mode = "quantity" | "scan";

export default function OrderAssign() {
  const auth = useAuth();

  const [mode, setMode] = useState<Mode>("scan");
  const [orders, setOrders] = useState<Order[]>([]);
  const [subBatches, setSubBatches] = useState<SubBatchAvailableDto[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedSubBatchId, setSelectedSubBatchId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [qrPayload, setQrPayload] = useState("");
  const [newOrderNumber, setNewOrderNumber] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [assignedNow, setAssignedNow] = useState<AssignedLabelDto[] | null>(null);
  const [lastScan, setLastScan] = useState<AssignByQrResponse | null>(null);
  const [assignedForOrder, setAssignedForOrder] = useState<OrderAssignedUnitDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingSubBatches, setLoadingSubBatches] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [loadingAssignedList, setLoadingAssignedList] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const selectedSubBatch = useMemo(() => {
    if (!selectedSubBatchId) return null;
    return subBatches.find((s) => s.subBatchId === selectedSubBatchId) ?? null;
  }, [selectedSubBatchId, subBatches]);

  async function loadOrders() {
    if (!auth) return;
    setError(null);
    try {
      setLoadingOrders(true);
      const data = await apiGet<Order[]>("/api/orders", auth);
      setOrders(data);
    } catch (e) {
      console.error(e);
      setError("Could not load orders (are you logged in?)");
    } finally {
      setLoadingOrders(false);
    }
  }

  async function refreshAssigned(orderId: string) {
    if (!auth) return;
    setError(null);
    try {
      setLoadingAssignedList(true);
      const data = await apiGet<OrderAssignedUnitDto[]>(
        `/api/orders/${orderId}/assigned-units`,
        auth
      );
      setAssignedForOrder(data);
    } catch (e) {
      console.error(e);
      setError("Could not load assigned units for this order.");
    } finally {
      setLoadingAssignedList(false);
    }
  }

  async function refreshSubBatches() {
    if (!auth) return;
    try {
      setLoadingSubBatches(true);
      const data = await apiGet<SubBatchAvailableDto[]>("/api/sub-batches/available", auth);
      setSubBatches(data);
      if (data.length > 0 && !selectedSubBatchId) {
        setSelectedSubBatchId(data[0].subBatchId);
      }
    } catch (e) {
      console.error(e);
      setError("Could not load sub-batches (available inventory).");
    } finally {
      setLoadingSubBatches(false);
    }
  }

  useEffect(() => {
    if (!auth) return;
    loadOrders();
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    refreshSubBatches();
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    if (!selectedOrderId) {
      setAssignedForOrder([]);
      return;
    }
    refreshAssigned(selectedOrderId);
  }, [auth, selectedOrderId]);

  async function handleCreateOrder() {
    setError(null);
    setSuccess(null);
    if (!auth) return setError("Not authenticated.");
    const orderNumber = newOrderNumber.trim();
    const customerName = newCustomerName.trim();
    const customerEmail = newCustomerEmail.trim();
    if (!orderNumber) return setError("Order number is required.");
    try {
      setCreatingOrder(true);
      const created = await apiPost<CreateOrderRequest, Order>(
        "/api/orders",
        { orderNumber, customerName, customerEmail },
        auth
      );
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === created.id);
        if (exists) return prev;
        return [created, ...prev];
      });
      setSelectedOrderId(created.id);
      setSuccess(`Order created: ${created.orderNumber || `#${created.id}`}`);
      setNewOrderNumber("");
      setNewCustomerName("");
      setNewCustomerEmail("");
    } catch (e) {
      console.error(e);
      setError("Could not create order.");
    } finally {
      setCreatingOrder(false);
    }
  }

  async function handleAssignByQuantity() {
    setError(null);
    setSuccess(null);
    setAssignedNow(null);
    setLastScan(null);
    if (!auth) return setError("Not authenticated.");
    if (!selectedOrderId) return setError("Select an order first");
    const qty = parseInt(quantity, 10);
    if (!selectedSubBatchId || isNaN(qty) || qty <= 0) {
      return setError("Select a sub-batch and enter a valid quantity");
    }
    if (selectedSubBatch && qty > selectedSubBatch.availableUnits) {
      return setError(`Not enough available units. Available: ${selectedSubBatch.availableUnits}`);
    }
    try {
      setLoadingAssign(true);
      const data = await apiPost<{ subBatchId: string; quantity: number }, AssignedLabelDto[]>(
        `/api/orders/${selectedOrderId}/assign`,
        { subBatchId: selectedSubBatchId, quantity: qty },
        auth
      );
      setAssignedNow(data);
      setSuccess(`Assigned ${data.length} unit(s) to the order.`);
      await Promise.all([refreshAssigned(selectedOrderId), refreshSubBatches()]);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Assignment failed.");
    } finally {
      setLoadingAssign(false);
    }
  }

  async function handleAssignByScan() {
    setError(null);
    setSuccess(null);
    setAssignedNow(null);
    setLastScan(null);
    if (!auth) return setError("Not authenticated.");
    if (!selectedOrderId) return setError("Select an order first");
    if (!qrPayload.trim()) return setError("Paste/enter the QR payload first");
    try {
      setLoadingAssign(true);
      const resp = await apiPost<{ qrPayload: string }, AssignByQrResponse>(
        `/api/orders/${selectedOrderId}/assign-by-qr`,
        { qrPayload: qrPayload.trim() },
        auth
      );
      setLastScan(resp);
      setQrPayload("");
      setSuccess(`Assigned scanned unit ${resp.serialNo} to the order.`);
      await Promise.all([refreshAssigned(selectedOrderId), refreshSubBatches()]);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Scan assign failed.");
    } finally {
      setLoadingAssign(false);
    }
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Order Fulfilment</h2>
      <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 14 }}>
        Create manual orders, then use <strong>Scan</strong> for real packing or <strong>Quantity</strong> for bulk assignment.
      </p>

      <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}>
        <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 10 }}>Create manual order</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Order number</label>
            <input value={newOrderNumber} onChange={(e) => setNewOrderNumber(e.target.value)} placeholder="KAN-1001" style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Customer name</label>
            <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Jane Doe" style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Customer email</label>
            <input value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} placeholder="jane@example.com" style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }} />
          </div>
        </div>
        <button onClick={handleCreateOrder} disabled={creatingOrder} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 999, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: creatingOrder ? 0.7 : 1 }}>
          {creatingOrder ? "Creating…" : "Create order"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode("scan")} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: mode === "scan" ? "#e0e7ff" : "#fff", cursor: "pointer", fontSize: 13 }}>Scan mode</button>
        <button onClick={() => setMode("quantity")} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: mode === "quantity" ? "#e0e7ff" : "#fff", cursor: "pointer", fontSize: 13 }}>Quantity mode</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Order {loadingOrders ? "(loading…)" : ""}</label>
        <select value={selectedOrderId ?? ""} onChange={(e) => setSelectedOrderId(e.target.value ? e.target.value : null)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}>
          <option value="">Select…</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNumber || `Order #${o.id}`}{o.customerName ? ` – ${o.customerName}` : ""}
            </option>
          ))}
        </select>
      </div>

      {mode === "scan" ? (
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", marginBottom: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 8, color: "#374151" }}>Paste the QR payload exactly.</div>
          <textarea value={qrPayload} onChange={(e) => setQrPayload(e.target.value)} placeholder='{"sub":"SUB123","s":1}' rows={3} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db", fontFamily: "monospace", fontSize: 12 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={handleAssignByScan} disabled={loadingAssign} style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loadingAssign ? 0.7 : 1 }}>
              {loadingAssign ? "Assigning…" : "Assign scanned unit"}
            </button>
          </div>
          {lastScan && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#374151" }}>
              ✅ Assigned serial <strong>{lastScan.serialNo}</strong>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Sub-batch {loadingSubBatches ? "(loading…)" : ""}</label>
            <select value={selectedSubBatchId ?? ""} onChange={(e) => setSelectedSubBatchId(e.target.value ? e.target.value : null)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}>
              <option value="">Select…</option>
              {subBatches.map((s) => (
                <option key={s.subBatchId} value={s.subBatchId}>
                  {s.code} — {s.availableUnits} available
                </option>
              ))}
            </select>
            {selectedSubBatch && (
              <div style={{ fontSize: 12, color: "#374151", marginTop: 6 }}>
                <div><strong>Available:</strong> {selectedSubBatch.availableUnits} <span style={{ color: "#9ca3af" }}>(Assigned: {selectedSubBatch.assignedUnits}, Total: {selectedSubBatch.totalUnits})</span></div>
                <div><strong>Expiry:</strong> {selectedSubBatch.expiry ?? "— (not set)"}</div>
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Quantity</label>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }} />
            <button onClick={handleAssignByQuantity} disabled={loadingAssign} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 999, border: "none", background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loadingAssign ? 0.7 : 1 }}>
              {loadingAssign ? "Assigning…" : "Assign units"}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ marginTop: 8, color: "#b91c1c", fontSize: 12 }}>{error}</p>}
      {success && <p style={{ marginTop: 8, color: "#166534", fontSize: 12 }}>{success}</p>}

      {assignedNow && assignedNow.length > 0 && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Assigned this action</h3>
          <ul style={{ fontSize: 13, color: "#374151" }}>
            {assignedNow.map((r, i) => (
              <li key={i}>Serial {r.serialNo} — Sub-batch {r.subBatchId}</li>
            ))}
          </ul>
        </div>
      )}

      {selectedOrderId && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Assigned units for this order {loadingAssignedList ? "(loading…)" : ""}</h3>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Total assigned: <strong>{assignedForOrder.length}</strong></div>
          {assignedForOrder.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>No units assigned yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: "6px 4px", borderBottom: "1px solid #e5e7eb" }}>Serial</th>
                  <th style={{ padding: "6px 4px", borderBottom: "1px solid #e5e7eb" }}>Sub-batch</th>
                  <th style={{ padding: "6px 4px", borderBottom: "1px solid #e5e7eb" }}>Product</th>
                  <th style={{ padding: "6px 4px", borderBottom: "1px solid #e5e7eb" }}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {assignedForOrder.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f4f6" }}>{r.serialNo}</td>
                    <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f4f6" }}>{r.subBatchCode}</td>
                    <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f4f6" }}>{r.productName ?? "—"}</td>
                    <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f4f6" }}>{r.expiry ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}