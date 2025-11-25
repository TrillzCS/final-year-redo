import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type SubInfo = { id: string; code: string; expiry: string; product: { name: string } };
type LabelRow = { serial_no: number; qr_payload: string };
type RenderRow = { serial_no: number; qr_payload: string; subCode: string; product: string; expiry: string };

export function LabelSheet({ subBatchId }: { subBatchId: string | null }) {
    const [rows, setRows] = useState<RenderRow[]>([]);

    useEffect(() => {
        if (!subBatchId) return;

        supabase
            .from('sub_batches')
            .select('id,code,expiry,product:products(name)')
            .eq('id', subBatchId)
            .single()
            .then(async ({ data }) => {
                const sub = data as SubInfo | null;
                if (!sub) return;

                const { data: labels } = await supabase
                    .from('labels')
                    .select('serial_no,qr_payload')
                    .eq('sub_batch_id', sub.id)
                    .order('serial_no');

                const ls = (labels as LabelRow[]) ?? [];
                setRows(
                    ls.map((l) => ({
                        serial_no: l.serial_no,
                        qr_payload: l.qr_payload,
                        subCode: sub.code,
                        product: sub.product.name,
                        expiry: sub.expiry,
                    }))
                );
            });
    }, [subBatchId]);

    if (!subBatchId) return <p>Create a packing run to load labels.</p>;

    return (
        <div>
            <button onClick={() => window.print()}>Print labels</button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 12 }}>
                {rows.map((r, i) => (
                    <div key={i} style={{ border: '1px solid #ddd', padding: 8 }}>
                        <QRCodeSVG value={r.qr_payload} width={96} height={96} />
                        <div style={{ fontSize: 12, marginTop: 6 }}>
                            <div>{r.product}</div>
                            <div>
                                {r.subCode} • #{r.serial_no}
                            </div>
                            <div>BB {new Date(r.expiry).toLocaleDateString()}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
