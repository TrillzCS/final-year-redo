import { useRef, useState } from "react";
import { QrReader } from "react-qr-reader";
import jsQR from "jsqr";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

type VerificationResult = {
  valid: boolean; message: string; productName: string | null;
  subBatchCode: string | null; batchCode: string | null; supplierName: string | null;
  bestBefore: string | null; expired: boolean; assigned?: boolean;
  orderId?: number | null; orderNumber?: string | null;
  customerName?: string | null; customerEmail?: string | null; assignedAt?: string | null;
};

type Mode = "manual" | "camera" | "image";

export function VerifyProduct() {
  const [mode, setMode] = useState<Mode>("manual");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function verifyCode(rawCode?: string) {
    setError(null); setResult(null);
    const trimmed = (rawCode ?? code).trim();
    if (!trimmed) { setError("Enter or scan a code first."); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/verify?code=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: VerificationResult = await res.json();
      setResult(data); setCode(trimmed);
    } catch { setError("Verification failed – check your connection or try again."); }
    finally { setLoading(false); }
  }

  const status = (() => {
    if (!result) return null;
    if (!result.valid) return { label: "Invalid", bg: "#fef2f2", color: "#b91c1c", dot: "#ef4444" };
    if (result.expired) return { label: "Expired", bg: "#fefce8", color: "#92400e", dot: "#f59e0b" };
    return { label: "Verified", bg: "#f0fdf4", color: "#166534", dot: "#22c55e" };
  })();

  async function handleCameraScan(scanned: string | null) {
    if (!scanned) return;
    setCode(scanned); setMode("manual");
    await verifyCode(scanned);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { setError("Could not read image context"); return; }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imageData.data, canvas.width, canvas.height);
        if (qr?.data) { setCode(qr.data); setMode("manual"); verifyCode(qr.data); }
        else setError("No QR code found in image");
      };
      if (typeof reader.result === "string") img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Verify Product</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>Check authenticity and traceability of a Kanoga product.</p>
      </div>

      {/* Mode switcher */}
      <div style={{ display: "inline-flex", borderRadius: 10, background: "#f1f5f9", padding: 3, marginBottom: 16, gap: 2 }}>
        {(["manual", "camera", "image"] as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); if (m === "camera") setCameraActive(true); }}
            style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: mode === m ? 600 : 400, background: mode === m ? "#ffffff" : "transparent", color: mode === m ? "#111827" : "#6b7280", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        {mode === "manual" && (
          <>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 8 }}>QR Code Value</label>
            <textarea value={code} onChange={(e) => setCode(e.target.value)}
              placeholder={`{"sub":"KPG-25110004-1-RUN25112540488","s":1}`} rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: "monospace", fontSize: 12, resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Camera or image upload will auto-fill this field.</span>
              <button onClick={() => verifyCode()} disabled={loading}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Verifying…" : "Verify"}
              </button>
            </div>
          </>
        )}

        {mode === "camera" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "#374151" }}>Point the QR code at the camera.</span>
              <button onClick={() => setCameraActive((v) => !v)}
                style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", fontSize: 12, cursor: "pointer" }}>
                {cameraActive ? "Pause" : "Resume"}
              </button>
            </div>
            {cameraActive && (
              <div style={{ borderRadius: 10, overflow: "hidden" }}>
                <QrReader constraints={{ facingMode: "environment" }}
                  onResult={(result) => { if (result) { const text = typeof result.getText === "function" ? result.getText() : String(result); handleCameraScan(text); } }}
                  containerStyle={{ width: "100%" }} videoStyle={{ width: "100%" }} />
              </div>
            )}
          </div>
        )}

        {mode === "image" && (
          <div>
            <p style={{ fontSize: 13, color: "#374151", marginTop: 0, marginBottom: 12 }}>Upload an image containing a QR code.</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange}
              style={{ fontSize: 13 }} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 16, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {result && status && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: status.dot }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: status.color, background: status.bg, padding: "4px 12px", borderRadius: 999 }}>
              {status.label}
            </span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{result.message}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {[
              { label: "Product", value: result.productName },
              { label: "Supplier", value: result.supplierName },
              { label: "Batch", value: result.batchCode },
              { label: "Sub-batch", value: result.subBatchCode },
              { label: "Best before", value: result.bestBefore },
              { label: "Assigned", value: result.assigned ? "Yes" : "No" },
              { label: "Order number", value: result.orderNumber ?? null },
              { label: "Customer", value: result.customerName ?? null },
              { label: "Customer email", value: result.customerEmail ?? null },
              { label: "Assigned at", value: result.assignedAt ?? null },
            ].map(({ label, value }) => (
              <div key={label} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", background: "#fafafa" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}