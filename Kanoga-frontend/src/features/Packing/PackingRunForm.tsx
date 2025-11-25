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

    useEffect(() => {
        supabase.from('batches').select('id,code').order('created_at', { ascending: false })
            .then(({ data }) => setBatches((data ?? []).map(b => ({ id: b.id, label: b.code }))));
        supabase.from('products').select('id,name')
            .then(({ data }) => setProducts((data ?? []).map(p => ({ id: p.id, label: p.name }))));
    }, []);

    async function createRun() {
        if (!batchId || !productId || units <= 0) return alert('Pick a batch, a product, and a positive unit count');
        const runNo = humanRunNo();

        const { data: prod, error: pe } = await supabase.from('products').select('net_weight_grams').eq('id', productId).single();
        if (pe || !prod) return alert('Pick a valid product');

        const { data: run, error: e1 } = await supabase.from('packing_runs').insert({
            run_no: runNo,
            batch_id: batchId,
            product_id: productId,
            units_produced: units,
            unit_weight_grams: prod.net_weight_grams
        }).select().single();
        if (e1) return alert(e1.message);

        const { data: parent } = await supabase.from('batches').select('code,best_before').eq('id', batchId).single();
        const { data: codeRow } = await supabase.rpc('gen_subbatch_code', { parent: parent!.code, run_no: runNo });
        const subCode = codeRow as unknown as string;

        const { data: sub, error: e2 } = await supabase.from('sub_batches').insert({
            code: subCode,
            parent_batch_id: batchId,
            product_id: productId,
            expiry: parent!.best_before,
            total_units: units,
            units_available: units,
            packing_run_id: run.id
        }).select().single();
        if (e2) return alert(e2.message);

        const labels = Array.from({ length: units }).map((_, i) => ({
            sub_batch_id: sub.id,
            serial_no: i + 1,
            qr_payload: JSON.stringify({ sub: sub.code, s: i + 1 })
        }));
        const { error: e3 } = await supabase.from('labels').insert(labels);
        if (e3) return alert(e3.message);

        alert(`Sub-batch ${sub.code} created with ${units} units`);
        onCreated(sub.id);
    }

    return (
        <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
            <label>Source batch
                <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                    <option value=''>Pick one</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
            </label>
            <label>Product
                <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                    <option value=''>Pick one</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
            </label>
            <label>Units to produce
                <input type="number" min={1} value={units} onChange={(e) => setUnits(parseInt(e.target.value || '0'))} />
            </label>
            <button onClick={createRun}>Create packing run</button>
        </div>
    );
}
