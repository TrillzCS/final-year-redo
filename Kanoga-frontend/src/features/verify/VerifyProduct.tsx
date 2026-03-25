import { useRef, useState } from "react";
import { QrReader } from "react-qr-reader";
import jsQR from "jsqr";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

type VerificationResult = {
  valid: boolean;
  message: string;
  productName: string | null;
  subBatchCode: string | null;
  batchCode: string | null;
  supplierName: string | null;
  bestBefore: string | null;
  expired: boolean;
  assigned?: boolean;
  orderId?: number | null;
  orderNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  assignedAt?: string | null;
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
    setError(null);
    setResult(null);

    const trimmed = (rawCode ?? code).trim();
    if (!trimmed) {
      setError("Enter or scan a code first.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/api/verify?code=${encodeURIComponent(trimmed)}`
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: VerificationResult = await res.json();
      setResult(data);
      setCode(trimmed);
    } catch (e) {
      console.error(e);
      setError("Verification failed – check your connection or try again.");
    } finally {
      setLoading(false);
    }
  }

  const status = (() => {
    if (!result) return null;
    if (!result.valid) {
      return { label: "Invalid", color: "#fee2e2", text: "#b91c1c" };
    }
    if (result.expired) {
      return { label: "Expired", color: "#fef3c7", text: "#92400e" };
    }
    return { label: "Valid", color: "#dcfce7", text: "#166534" };
  })();

  async function handleCameraScan(scanned: string | null) {
    if (!scanned) return;
    setCode(scanned);
    setMode("manual");
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
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Could not read image context");
          return;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imageData.data, canvas.width, canvas.height);

        if (qr?.data) {
          setCode(qr.data);
          setMode("manual");
          verifyCode(qr.data);
        } else {
          setError("No QR code found in image");
        }
      };

      if (typeof reader.result === "string") {
        img.src = reader.result;
      }
    };

    reader.readAsDataURL(file);
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Verify Product</h2>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 16 }}>
        Verify authenticity and traceability of a Kanoga product using QR scan,
        image upload, or the raw QR value.
      </p>

      <div
        style={{
          display: "inline-flex",
          borderRadius: 999,
          background: "#e5e7eb",
          padding: 2,
          marginBottom: 12,
        }}
      >
        <ModeButton
          label="Manual"
          active={mode === "manual"}
          onClick={() => setMode("manual")}
        />
        <ModeButton
          label="Camera"
          active={mode === "camera"}
          onClick={() => {
            setMode("camera");
            setCameraActive(true);
          }}
        />
        <ModeButton
          label="Image"
          active={mode === "image"}
          onClick={() => setMode("image")}
        />
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: "#ffffff",
          boxShadow: "0 4px 10px rgba(15,23,42,0.05)",
          marginBottom: 16,
        }}
      >
        {mode === "manual" && (
          <>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
              QR Code Value
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Example:\n{"sub":"KPG-25110004-1-RUN25112540488","s":1}`}
              rows={3}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontFamily: "monospace",
                fontSize: 12,
                resize: "vertical",
              }}
            />

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                Tip: scanning via camera or image will auto-fill this field.
              </span>
              <button
                onClick={() => verifyCode()}
                disabled={loading}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "#4f46e5",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Verifying…" : "Verify Code"}
              </button>
            </div>
          </>
        )}

        {mode === "camera" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13 }}>Point the QR code at the camera.</span>
              <button
                onClick={() => setCameraActive((v) => !v)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  background: "#f9fafb",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {cameraActive ? "Pause" : "Resume"}
              </button>
            </div>

            {cameraActive && (
              <div style={{ borderRadius: 12, overflow: "hidden" }}>
                <QrReader
                  constraints={{ facingMode: "environment" }}
                  onResult={(result, error) => {
                    if (result) {
                      const text =
                        typeof result.getText === "function"
                          ? result.getText()
                          : String(result);
                      handleCameraScan(text);
                    }
                    if (error) {
                      // ignore scanner noise
                    }
                  }}
                  containerStyle={{ width: "100%" }}
                  videoStyle={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        )}

        {mode === "image" && (
          <div>
            <p style={{ fontSize: 13, marginTop: 0 }}>
              Upload an image containing a QR code.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#fee2e2",
            color: "#b91c1c",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#ffffff",
            boxShadow: "0 4px 10px rgba(15,23,42,0.05)",
          }}
        >
          {status && (
            <div
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: 999,
                background: status.color,
                color: status.text,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {status.label}
            </div>
          )}

          <p style={{ marginTop: 0, color: "#374151" }}>{result.message}</p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <InfoCard label="Product" value={result.productName} />
            <InfoCard label="Supplier" value={result.supplierName} />
            <InfoCard label="Batch" value={result.batchCode} />
            <InfoCard label="Sub-batch" value={result.subBatchCode} />
            <InfoCard label="Best before" value={result.bestBefore} />
            <InfoCard
              label="Assigned"
              value={result.assigned ? "Yes" : "No"}
            />
            <InfoCard label="Order number" value={result.orderNumber ?? null} />
            <InfoCard label="Customer name" value={result.customerName ?? null} />
            <InfoCard label="Customer email" value={result.customerEmail ?? null} />
            <InfoCard label="Assigned at" value={result.assignedAt ?? null} />
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: active ? "#ffffff" : "transparent",
        padding: "8px 14px",
        borderRadius: 999,
        cursor: "pointer",
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 12,
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "#111827" }}>{value || "—"}</div>
    </div>
  );
}