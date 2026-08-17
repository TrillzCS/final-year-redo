import { useEffect, useRef, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

type Hit = { type: string; id: string; title: string; subtitle: string };

const TYPE_LABELS: Record<string, string> = {
  order: "Order",
  product: "Product",
  subBatch: "Sub-batch",
  unit: "Unit",
};

export function SearchBar() {
  const auth = useAuth();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!auth || q.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        setHits(await apiGet<Hit[]>(`/api/search?q=${encodeURIComponent(q.trim())}`, auth));
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, auth]);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div ref={boxRef} style={{ position: "relative", width: 340 }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder="Search orders, products, batches or scan a code"
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          fontSize: 13,
          boxSizing: "border-box",
        }}
      />

      {open && q.trim().length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            zIndex: 30,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {searching && hits.length === 0 && (
            <div style={{ padding: 12, fontSize: 13, color: "#9ca3af" }}>Searching…</div>
          )}
          {!searching && hits.length === 0 && (
            <div style={{ padding: 12, fontSize: 13, color: "#9ca3af" }}>No matches.</div>
          )}
          {hits.map((h) => (
            <div key={`${h.type}-${h.id}`} style={{ padding: "9px 12px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ background: "#eef2ff", color: "#4338ca", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                {TYPE_LABELS[h.type] ?? h.type}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{h.title}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{h.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
