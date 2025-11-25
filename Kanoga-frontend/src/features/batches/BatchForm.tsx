import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

export function BatchForm() {
    const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
    const [supplierId, setSupplierId] = useState<string | null>(null);
    const [netKg, setNetKg] = useState('5.000');
    const [bestBefore, setBestBefore] = useState(dayjs().add(18, 'month').format('YYYY-MM-DD'));
    const [notes, setNotes] = useState('');

    useEffect(() => {
        supabase.from('suppliers').select('id,name').order('name')
            .then(({ data, error }) => { if (!error) setSuppliers(data ?? []); });
    }, []);

    async function createBatch() {
        const { data: codeRow, error: e0 } = await supabase.rpc('gen_batch_code');
        if (e0) return alert(e0.message);
        const code = codeRow as unknown as string;

        const { data, error } = await supabase.from('batches').insert({
            code,
            supplier_id: supplierId,
            received_date: dayjs().format('YYYY-MM-DD'),
            best_before: bestBefore,
            net_kg: netKg,
            notes
        }).select().single();

        if (error) return alert(error.message);
        alert(`Batch created: ${data.code}`);
    }

    return (
        <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
            <label>Supplier
                <select value={supplierId ?? ''} onChange={(e) => setSupplierId(e.target.value || null)}>
                    <option value=''>None</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </label>
            <label>Net kg
                <input value={netKg} onChange={(e) => setNetKg(e.target.value)} />
            </label>
            <label>Best before
                <input type="date" value={bestBefore} onChange={(e) => setBestBefore(e.target.value)} />
            </label>
            <label>Notes
                <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <button onClick={createBatch}>Create batch</button>
        </div>
    );
}
