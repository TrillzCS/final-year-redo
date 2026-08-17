import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPostRaw } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type ImportSource = { source: string; description: string; manualUpload: boolean };

type ImportResult = {
  source: string;
  importedCount: number;
  skippedCount: number;
  imported: string[];
  skipped: string[];
  warnings: string[];
};

const CSV_TEMPLATE = `order_no,customer_name,customer_email,sku,product_name,quantity
ORD-1001,Jane Doe,jane@example.com,SKU-001,Example Product A,2
ORD-1001,Jane Doe,jane@example.com,SKU-002,Example Product B,1
ORD-1002,Liam Murphy,liam@example.com,SKU-001,Example Product A,3`;

const JSON_TEMPLATE = `{
  "orders": [
    {
      "orderNo": "SHOP-2001",
      "customer": { "name": "Jane Doe", "email": "jane@example.com" },
      "lines": [
        { "sku": "SKU-001", "productName": "Example Product A", "quantity": 2 }
      ]
    }
  ]
}`;

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600 as const,
  color: "#374151",
  display: "block" as const,
  marginBottom: 5,
};

export default function OrderImport() {
  const auth = useAuth();

  const [sources, setSources] = useState<ImportSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("csv");
  const [payload, setPayload] = useState<string>(CSV_TEMPLATE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSources = useCallback(async () => {
    if (!auth) return;
    try {
      const data = await apiGet<ImportSource[]>("/api/imports/sources", auth);
      setSources(data);
    } catch (e) {
      console.error(e);
      setError("Could not load the list of import sources.");
    }
  }, [auth]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Webhook sources sign their payloads, so they cannot be pasted in here.
  const manualSources = useMemo(() => sources.filter((s) => s.manualUpload), [sources]);

  const activeDescription = useMemo(
    () => sources.find((s) => s.source === selectedSource)?.description ?? "",
    [sources, selectedSource]
  );

  function useTemplate(source: string) {
    setSelectedSource(source);
    setPayload(source === "json" ? JSON_TEMPLATE : CSV_TEMPLATE);
    setFileName(null);
    setResult(null);
    setError(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPayload(String(reader.result ?? ""));
      setFileName(file.name);
      setResult(null);
      setError(null);
      if (file.name.toLowerCase().endsWith(".json")) setSelectedSource("json");
      else if (file.name.toLowerCase().endsWith(".csv")) setSelectedSource("csv");
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  async function handleImport() {
    setError(null);
    setResult(null);
    if (!auth) return setError("Not authenticated.");
    if (!payload.trim()) return setError("Paste some data or choose a file first.");

    try {
      setImporting(true);
      const contentType = selectedSource === "json" ? "application/json" : "text/csv";
      const data = await apiPostRaw<ImportResult>(
        `/api/imports/${selectedSource}`,
        payload,
        contentType,
        auth
      );
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
          Import Orders
        </h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          Bring orders in from any store. Upload a CSV export, or post the canonical JSON
          from a platform integration. Imports are idempotent — re-importing the same file
          skips orders that already exist rather than duplicating them.
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Format</label>
            <select
              value={selectedSource}
              onChange={(e) => useTemplate(e.target.value)}
              style={{ ...inputStyle, background: "#fff" }}
            >
              {manualSources.map((s) => (
                <option key={s.source} value={s.source}>
                  {s.source.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Choose a file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFile}
              style={{ ...inputStyle, padding: "7px 10px" }}
            />
          </div>
        </div>

        {activeDescription && (
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 12,
              fontFamily: "monospace",
            }}
          >
            {activeDescription}
          </div>
        )}

        <label style={labelStyle}>
          Data {fileName ? `(loaded from ${fileName})` : "(paste or edit below)"}
        </label>
        <textarea
          value={payload}
          onChange={(e) => {
            setPayload(e.target.value);
            setFileName(null);
          }}
          rows={12}
          spellCheck={false}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontFamily: "monospace",
            fontSize: 12,
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />

        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: "#4f46e5",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: importing ? "default" : "pointer",
              opacity: importing ? 0.7 : 1,
            }}
          >
            {importing ? "Importing…" : "Import orders"}
          </button>
          <button
            onClick={() => useTemplate(selectedSource)}
            style={{
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              color: "#374151",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Reset to sample
          </button>
        </div>
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
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "#111827" }}>
            Import complete
          </h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <Pill label="Imported" value={result.importedCount} tone="good" />
            <Pill label="Already present" value={result.skippedCount} tone="neutral" />
            <Pill label="Warnings" value={result.warnings.length} tone={result.warnings.length ? "warn" : "neutral"} />
          </div>

          {result.imported.length > 0 && (
            <Section title="Imported">
              {result.imported.map((o) => (
                <code key={o} style={codeChip}>{o}</code>
              ))}
            </Section>
          )}

          {result.skipped.length > 0 && (
            <Section title="Skipped — already in the system">
              {result.skipped.map((o) => (
                <code key={o} style={codeChip}>{o}</code>
              ))}
            </Section>
          )}

          {result.warnings.length > 0 && (
            <Section title="Warnings">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#92400e" }}>
                {result.warnings.map((w, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{w}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "neutral" }) {
  const colours =
    tone === "good"
      ? { bg: "#f0fdf4", fg: "#15803d", br: "#bbf7d0" }
      : tone === "warn"
      ? { bg: "#fffbeb", fg: "#b45309", br: "#fde68a" }
      : { bg: "#f8fafc", fg: "#475569", br: "#e2e8f0" };
  return (
    <div style={{ background: colours.bg, border: `1px solid ${colours.br}`, borderRadius: 10, padding: "8px 14px" }}>
      <div style={{ fontSize: 11, color: colours.fg, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: colours.fg }}>{value}</div>
    </div>
  );
}

const codeChip: React.CSSProperties = {
  background: "#f1f5f9",
  color: "#334155",
  borderRadius: 6,
  padding: "3px 9px",
  fontSize: 12,
  fontFamily: "monospace",
};
