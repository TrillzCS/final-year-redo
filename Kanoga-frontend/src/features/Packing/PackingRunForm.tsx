import { supabase } from '../../lib/supabase';
import { humanRunNo } from '../../lib/code';
import { useEffect, useState } from 'react';

type Option = { id: string; label: string };

export function PackingRunForm({ onCreated }: { onCreated: (subBatchId: string) => void }) {
  const [batches, setBatches] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [batchId, setBatchId] = useState('');
  const [productId, setProductId] = useState('');
  const [units, setUnits] = useState(100);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('batches').select('id,code').order('created_at', { ascending: false })
      .then(({ data }) => setBatches((data ?? []).map(b => ({ id: b.id, label: b.code }))));
    supabase.from('products').select('id,name')
      .then(({ data }) => setProducts((data ?? []).map(p => ({ id: p.id, label: p.name }))));
  }, []);

  async function createRun() {
    if (!batchId || !productId || units <= 0) return alert('Pick a batch, a product, and a positive unit count');
    setLoading(true);
    const runNo = humanRunNo();
    const { data: prod, error: pe } = await supabase.from('products').select('net_weight_grams').eq('id', productId).single();
    if (pe || !prod) { setLoading(false); return alert('Pick a valid product'); }
    const { data: run, error: e1 } = await supabase.from('packing_runs').insert({ run_no: runNo, batch_id: batchId, product_id: productId, units_produced: units, unit_weight_grams: prod.net_weight_grams }).select().single();
    if (e1) { setLoading(false); return alert(e1.message); }
    const { data: parent } = await supabase.from('batches').select('code,best_before').eq('id', batchId).single();
    const { data: codeRow } = await supabase.rpc('gen_subbatch_code', { parent: parent!.code, run_no: runNo });
    const subCode = codeRow as unknown as string;
    const { data: sub, error: e2 } = await supabase.from('sub_batches').insert({ code: subCode, parent_batch_id: batchId, product_id: productId, expiry: parent!.best_before, total_units: units, units_available: units, packing_run_id: run.id }).select().single();
    if (e2) { setLoading(false); return alert(e2.message); }
    const labels = Array.from({ length: units }).map((_, i) => ({ sub_batch_id: sub.id, serial_no: i + 1, qr_payload: JSON.stringify({ sub: sub.code, s: i + 1 }) }));
    const { error: e3 } = await supabase.from('labels').insert(labels);
    if (e3) { setLoading(false); return alert(e3.message); }
    setLoading(false);
    onCreated(sub.id);
  }

  const selectStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 14, boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 13, fontWeight: 500 as const, color: "#374151", display: "block" as const, marginBottom: 6 };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Packing Run</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>Create a sub-batch and generate QR labels for packing.</p>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, display: "grid", gap: 16 }}>
        <div>
          <label style={labelStyle}>Source batch</label>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)} style={selectStyle}>
            <option value=''>Select a batch…</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Product</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={selectStyle}>
            <option value=''>Select a product…</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Units to produce</label>
          <input type="number" min={1} value={units} onChange={(e) => setUnits(parseInt(e.target.value || '0'))}
            style={{ ...selectStyle, width: "100%" }} />
        </div>

        <button onClick={createRun} disabled={loading}
          style={{ padding: "11px 20px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Creating run…" : "Create packing run"}
        </button>
      </div>
    </div>
  );
}