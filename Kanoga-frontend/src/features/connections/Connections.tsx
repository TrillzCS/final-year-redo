import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type Connection = {
  id: string;
  platform: string;
  displayName: string;
  storeUrl: string | null;
  active: boolean;
  createdAt: string | null;
  lastOrderAt: string | null;
  ordersReceived: number;
  webhookUrl: string;
  webhookSecret: string;
  setupSteps: string;
};

const PLATFORMS = [
  {
    id: "woocommerce",
    label: "WooCommerce",
    note: "You choose the secret — we generate a strong one for you.",
    needsSecret: false,
  },
  {
    id: "shopify",
    label: "Shopify",
    note: "Shopify issues its own signing secret. Paste it below after creating the webhook.",
    needsSecret: true,
  },
  {
    id: "generic",
    label: "Other / custom",
    note: "For any platform that can POST canonical JSON.",
    needsSecret: false,
  },
];

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
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
  marginBottom: 4,
};

export default function Connections() {
  const auth = useAuth();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [platform, setPlatform] = useState("woocommerce");
  const [displayName, setDisplayName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const selectedPlatform = PLATFORMS.find((p) => p.id === platform);

  const load = useCallback(async () => {
    if (!auth) return;
    try {
      setConnections(await apiGet<Connection[]>("/api/connections", auth));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load connections.");
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      setError("Could not copy — select the text and copy manually.");
    }
  }

  async function createConnection() {
    setError(null);
    setSuccess(null);
    if (!auth) return;
    if (selectedPlatform?.needsSecret && !secret.trim()) {
      return setError("Shopify issues its own signing secret — paste it here.");
    }
    try {
      setBusy(true);
      const created = await apiPost<Record<string, unknown>, Connection>(
        "/api/connections",
        {
          platform,
          displayName: displayName.trim() || undefined,
          storeUrl: storeUrl.trim() || undefined,
          secret: secret.trim() || undefined,
        },
        auth
      );
      setSuccess(`Connected ${created.displayName}. Copy the URL and secret into your store.`);
      setRevealed((r) => ({ ...r, [created.id]: true }));
      setDisplayName("");
      setStoreUrl("");
      setSecret("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the connection.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: Connection) {
    if (!auth) return;
    try {
      await apiPatch(`/api/connections/${c.id}/active?active=${!c.active}`, {}, auth);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the connection.");
    }
  }

  async function rotate(c: Connection) {
    if (!auth) return;
    try {
      await apiPost(`/api/connections/${c.id}/rotate-secret`, {}, auth);
      setSuccess(`New secret issued for ${c.displayName}. Update it in your store admin.`);
      setRevealed((r) => ({ ...r, [c.id]: true }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rotate the secret.");
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
          Store Connections
        </h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          Connect a storefront so its orders arrive here automatically. Each connection gets
          its own address and its own signing secret, so several shops can feed one warehouse
          and one shop's secret can be replaced without disturbing the others.
        </p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {success && <Banner tone="success">{success}</Banner>}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#111827" }}>
          Connect a store
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
          <div>
            <label style={labelStyle}>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ ...inputStyle, background: "#fff" }}>
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Name for this store</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Main online shop" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Store URL</label>
            <input value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://example.com" style={inputStyle} />
          </div>
        </div>

        {selectedPlatform?.needsSecret && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Signing secret from {selectedPlatform.label}</label>
            <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Paste the secret shown in your store admin" style={inputStyle} />
          </div>
        )}

        {selectedPlatform && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>{selectedPlatform.note}</div>
        )}

        <button
          onClick={createConnection}
          disabled={busy}
          style={{
            marginTop: 14,
            padding: "9px 18px",
            borderRadius: 8,
            border: "none",
            background: "#4f46e5",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Connecting…" : "Create connection"}
        </button>
      </div>

      {connections.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, textAlign: "center", fontSize: 13, color: "#6b7280" }}>
          No stores connected yet. Orders can still be brought in from the Import Orders screen.
        </div>
      ) : (
        connections.map((c) => (
          <div key={c.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 12, opacity: c.active ? 1 : 0.65 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{c.displayName}</span>
                <span style={{ background: "#eef2ff", color: "#4338ca", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                  {c.platform}
                </span>
                <span style={{ background: c.active ? "#f0fdf4" : "#f3f4f6", color: c.active ? "#15803d" : "#6b7280", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                  {c.active ? "Active" : "Disabled"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                {c.ordersReceived} order(s) received
                {c.lastOrderAt ? ` · last ${new Date(c.lastOrderAt).toLocaleString()}` : ""}
              </div>
            </div>

            <CopyRow
              label="Webhook URL"
              value={c.webhookUrl}
              onCopy={() => copy(c.webhookUrl, `${c.id}-url`)}
              copied={copied === `${c.id}-url`}
            />

            <CopyRow
              label="Signing secret"
              value={revealed[c.id] ? c.webhookSecret : "•".repeat(Math.min(40, c.webhookSecret.length))}
              onCopy={() => copy(c.webhookSecret, `${c.id}-secret`)}
              copied={copied === `${c.id}-secret`}
              extra={
                <button onClick={() => setRevealed((r) => ({ ...r, [c.id]: !r[c.id] }))} style={miniBtn}>
                  {revealed[c.id] ? "Hide" : "Reveal"}
                </button>
              }
            />

            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#4f46e5" }}>
                Setup steps
              </summary>
              <pre style={{ margin: "8px 0 0", padding: 12, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#334155", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                {c.setupSteps}
              </pre>
            </details>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={() => toggleActive(c)} style={miniBtn}>
                {c.active ? "Disable" : "Enable"}
              </button>
              <button onClick={() => rotate(c)} style={miniBtn}>
                Issue new secret
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
  extra,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <code
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "monospace",
            color: "#334155",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </code>
        <button onClick={onCopy} style={miniBtn}>{copied ? "Copied" : "Copy"}</button>
        {extra}
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const c =
    tone === "error"
      ? { bg: "#fef2f2", fg: "#b91c1c", br: "#fecaca" }
      : { bg: "#ecfdf5", fg: "#065f46", br: "#a7f3d0" };
  return (
    <div style={{ padding: "10px 14px", borderRadius: 10, background: c.bg, color: c.fg, border: `1px solid ${c.br}`, marginBottom: 14, fontSize: 13 }}>
      {children}
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
