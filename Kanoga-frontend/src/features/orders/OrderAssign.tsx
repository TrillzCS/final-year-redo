import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type Order = { id: string; orderNumber?: string; customerName?: string; customerEmail?: string };
type AssignedLabelDto = { labelId: number; serialNo: number; subBatchId: string };
type OrderAssignedUnitDto = { serialNo: number; subBatchId: string; subBatchCode: string; productName: string | null; expiry: string | null };
type SubBatchAvailableDto = { subBatchId: string; code: string; expiry: string | null; totalUnits: number; assignedUnits: number; availableUnits: number };
type AssignByQrResponse = { orderId: string; labelId: number; serialNo: number; subBatchId: number; assignedAt: string };
type CreateOrderRequest = { orderNumber: string; customerName: string; customerEmail: string };
type Mode = "quantity" | "scan";

const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" as const };
const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: "#374151", display: "block" as const, marginBottom: 5 };

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

  const selectedSubBatch = useMemo(() => subBatches.find((s) => s.subBatchId === selectedSubBatchId) ?? null, [selectedSubBatchId, subBatches]);

  async function loadOrders() {
    if (!auth) return;
    setError(null);
    try { setLoadingOrders(true); const data = await apiGet<Order[]>("/api/orders", auth); setOrders(data); }
    catch { setError("Could not load orders."); }
    finally { setLoadingOrders(false); }
  }

  async function refreshAssigned(orderId: string) {
    if (!auth) return;
    setError(null);
    try { setLoadingAssignedList(true); const data = await apiGet<OrderAssignedUnitDto[]>(`/api/orders/${orderId}/assigned-units`, auth); setAssignedForOrder(data); }
    catch { setError("Could not load assigned units."); }
    finally { setLoadingAssignedList(false); }
  }

  async function refreshSubBatches() {
    if (!auth) return;
    try {
      setLoadingSubBatches(true);
      const data = await apiGet<SubBatchAvailableDto[]>("/api/sub-batches/available", auth);
      setSubBatches(data);
      if (data.length > 0 && !selectedSubBatchId) setSelectedSubBatchId(data[0].subBatchId);
    } catch { setError("Could not load inventory."); }
    finally { setLoadingSubBatches(false); }
  }

  useEffect(() => { if (auth) loadOrders(); }, [auth]);
  useEffect(() => { if (auth) refreshSubBatches(); }, [auth]);
  useEffect(() => {
    if (!auth) return;
    if (!selectedOrderId) { setAssignedForOrder([]); return; }
    refreshAssigned(selectedOrderId);
  }, [auth, selectedOrderId]);

  async function handleCreateOrder() {
    setError(null); setSuccess(null);
    if (!auth) return setError("Not authenticated.");
    const orderNumber = newOrderNumber.trim();
    const customerName = newCustomerName.trim();
    const customerEmail = newCustomerEmail.trim();
    if (!orderNumber) return setError("Order number is required.");
    try {
      setCreatingOrder(true);
      const created = await apiPost<CreateOrderRequest, Order>("/api/orders", { orderNumber, customerName, customerEmail }, auth);
      setOrders((prev) => prev.some((o) => o.id === created.id) ? prev : [created, ...prev]);
      setSelectedOrderId(created.id);
      setSuccess(`Order ${created.orderNumber || created.id} created successfully.`);
      setNewOrderNumber(""); setNewCustomerName(""); setNewCustomerEmail("");
    } catch { setError("Could not create order."); }
    finally { setCreatingOrder(false); }
  }

  async function handleAssignByQuantity() {
    setError(null); setSuccess(null); setAssignedNow(null); setLastScan(null);
    if (!auth) return setError("Not authenticated.");
    if (!selectedOrderId) return setError("Select an order first.");
    const qty = parseInt(quantity, 10);
    if (!selectedSubBatchId || isNaN(qty) || qty <= 0) return setError("Select a sub-batch and enter a valid quantity.");
    if (selectedSubBatch && qty > selectedSubBatch.availableUnits) return setError(`Only ${selectedSubBatch.availableUnits} units available.`);
    try {
      setLoadingAssign(true);
      const data = await apiPost<{ subBatchId: string; quantity: number }, AssignedLabelDto[]>(`/api/orders/${selectedOrderId}/assign`, { subBatchId: selectedSubBatchId, quantity: qty }, auth);
      setAssignedNow(data);
      setSuccess(`${data.length} unit(s) assigned successfully.`);
      await Promise.all([refreshAssigned(selectedOrderId), refreshSubBatches()]);
    } catch (e: any) { setError(e.message || "Assignment failed."); }
    finally { setLoadingAssign(false); }
  }

  async function handleAssignByScan() {
    setError(null); setSuccess(null); setAssignedNow(null); setLastScan(null);
    if (!auth) return setError("Not authenticated.");
    if (!selectedOrderId) return setError("Select an order first.");
    if (!qrPayload.trim()) return setError("Paste the QR payload first.");
    try {
      setLoadingAssign(true);
      const resp = await apiPost<{ qrPayload: string }, AssignByQrResponse>(`/api/orders/${selectedOrderId}/assign-by-qr`, { qrPayload: qrPayload.trim() }, auth);
      setLastScan(resp); setQrPayload("");
      setSuccess(`Serial ${resp.serialNo} assigned to order.`);
      await Promise.all([refreshAssigned(selectedOrderId), refreshSubBatches()]);
    } catch (e: any) { setError(e.message || "Scan assign failed."); }
    finally { setLoadingAssign(false); }
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Order Fulfilment</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>Create orders and assign physical units using scan or quantity mode.</p>
      </div>

      {/* Create order */}
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#111827" }}>Create Manual Order</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <div><label style={labelStyle}>Order number</label><input value={newOrderNumber} onChange={(e) => setNewOrderNumber(e.target.value)} placeholder="KAN-1001" style={inputStyle} /></div>
          <div><label style={labelStyle}>Customer name</label><input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Jane Doe" style={inputStyle} /></div>
          <div><label style={labelStyle}>Customer email</label><input value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} placeholder="jane@example.com" style={inputStyle} /></div>
        </div>
        <button onClick={handleCreateOrder} disabled={creatingOrder}
          style={{ marginTop: 12, padding: "9px 18px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: creatingOrder ? 0.7 : 1 }}>
          {creatingOrder ? "Creating…" : "Create order"}
        </button>
      </div>

      {/* Order selector + mode toggle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end", marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Order {loadingOrders ? "(loading…)" : ""}</label>
          <select value={selectedOrderId ?? ""} onChange={(e) => setSelectedOrderId(e.target.value || null)} style={{ ...inputStyle, background: "#fff" }}>
            <option value="">Select an order…</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber || `Order #${o.id}`}{o.customerName ? ` — ${o.customerName}` : ""}</option>)}
          </select>
        </div>
        <div style={{ display: "inline-flex", borderRadius: 8, background: "#f1f5f9", padding: 3, gap: 2 }}>
          {(["scan", "quantity"] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: mode === m ? 600 : 400, background: mode === m ? "#ffffff" : "transparent", color: mode === m ? "#111827" : "#6b7280", boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              {m === "scan" ? " Scan" : " Quantity"}
            </button>
          ))}
        </div>
      </div>

      {/* Assign panel */}
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 14 }}>
        {mode === "scan" ? (
          <>
            <label style={labelStyle}>QR Payload</label>
            <textarea value={qrPayload} onChange={(e) => setQrPayload(e.target.value)} placeholder='{"sub":"SUB123","s":1}' rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: "monospace", fontSize: 12, boxSizing: "border-box", resize: "vertical" }} />
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={handleAssignByScan} disabled={loadingAssign}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loadingAssign ? 0.7 : 1 }}>
                {loadingAssign ? "Assigning…" : "Assign scanned unit"}
              </button>
              {lastScan && <span style={{ fontSize: 13, color: "#166534" }}> Serial <strong>{lastScan.serialNo}</strong> assigned</span>}
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
            <div>
              <label style={labelStyle}>Sub-batch {loadingSubBatches ? "(loading…)" : ""}</label>
              <select value={selectedSubBatchId ?? ""} onChange={(e) => setSelectedSubBatchId(e.target.value || null)} style={{ ...inputStyle, background: "#fff" }}>
                <option value="">Select a sub-batch…</option>
                {subBatches.map((s) => <option key={s.subBatchId} value={s.subBatchId}>{s.code} — {s.availableUnits} available</option>)}
              </select>
              {selectedSubBatch && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", background: "#f8fafc", padding: "8px 10px", borderRadius: 8 }}>
                  <span style={{ color: "#111827", fontWeight: 600 }}>{selectedSubBatch.availableUnits}</span> available &nbsp;·&nbsp;
                  <span>{selectedSubBatch.assignedUnits} assigned</span> &nbsp;·&nbsp;
                  <span>Total: {selectedSubBatch.totalUnits}</span>
                  {selectedSubBatch.expiry && <span> &nbsp;·&nbsp; Expires: {selectedSubBatch.expiry}</span>}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Quantity</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
              <button onClick={handleAssignByQuantity} disabled={loadingAssign}
                style={{ marginTop: 10, width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loadingAssign ? 0.7 : 1 }}>
                {loadingAssign ? "Assigning…" : "Assign units"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontSize: 13, marginBottom: 12 }}> {error}</div>}
      {success && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontSize: 13, marginBottom: 12 }}> {success}</div>}

      {assignedNow && assignedNow.length > 0 && (
        <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>Just assigned ({assignedNow.length} units)</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {assignedNow.map((r, i) => (
              <span key={i} style={{ background: "#e0e7ff", color: "#3730a3", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>Serial {r.serialNo}</span>
            ))}
          </div>
        </div>
      )}

      {selectedOrderId && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" }}>Assigned Units {loadingAssignedList ? "(loading…)" : ""}</h3>
            <span style={{ background: "#f1f5f9", color: "#374151", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{assignedForOrder.length} total</span>
          </div>
          {assignedForOrder.length === 0 ? (
           <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No units assigned to this order yet.</div>
                     ) : (
                       <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                         <thead>
                           <tr style={{ background: "#f8fafc" }}>
                             {["Serial", "Sub-batch", "Product", "Expiry"].map(h => (
                               <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.5, borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {assignedForOrder.map((r, i) => (
                             <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                               <td style={{ padding: "9px 10px", fontWeight: 600 }}>{r.serialNo}</td>
                               <td style={{ padding: "9px 10px", color: "#374151", fontSize: 12, fontFamily: "monospace" }}>{r.subBatchCode}</td>
                               <td style={{ padding: "9px 10px", color: "#374151" }}>{r.productName ?? "—"}</td>
                               <td style={{ padding: "9px 10px", color: "#374151" }}>{r.expiry ?? "—"}</td>
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