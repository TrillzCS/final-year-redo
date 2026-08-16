import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Barcode } from './Barcode';

type SubInfo = {
    id: string;
    code: string;
    expiry: string;
    product: { name: string; barcode: string | null } | null;
};
type LabelRow = { serial_no: number; qr_payload: string };
type RenderRow = {
    serial_no: number;
    qr_payload: string;
    subCode: string;
    product: string;
    productBarcode: string | null;
    expiry: string;
};

/** Printable label sheet. */
export function LabelSheet({ subBatchId }: { subBatchId: string | null }) {
    const [rows, setRows] = useState<RenderRow[]>([]);
    const [showBarcodes, setShowBarcodes] = useState(true);

    useEffect(() => {
        if (!subBatchId) return;

        supabase
            .from('sub_batches')
            .select('id,code,expiry,product:products(name,barcode)')
            .eq('id', subBatchId)
            .single()
            .then(async ({ data }) => {
                const sub = data as unknown as SubInfo | null;
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
                        product: sub.product?.name ?? 'Unknown product',
                        productBarcode: sub.product?.barcode ?? null,
                        expiry: sub.expiry,
                    }))
                );
            });
    }, [subBatchId]);

    if (!subBatchId) return <p style={{ color: '#6b7280', fontSize: 14 }}>Create a packing run to load labels.</p>;

    return (
        <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                <button
                    onClick={() => window.print()}
                    style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                    Print labels
                </button>
                <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={showBarcodes} onChange={(e) => setShowBarcodes(e.target.checked)} />
                    Include scanner barcodes
                </label>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{rows.length} label(s)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {rows.map((r, i) => (
                    <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, background: '#fff', textAlign: 'center' }}>
                        <QRCodeSVG value={r.qr_payload} width={96} height={96} />

                        {showBarcodes && (
                            <div style={{ marginTop: 6 }}>
                                <Barcode value={`${r.subCode}-${r.serial_no}`} format="CODE128" height={30} />
                            </div>
                        )}

                        <div style={{ fontSize: 12, marginTop: 6, color: '#374151' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{r.product}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                {r.subCode} • #{r.serial_no}
                            </div>
                            <div>BB {r.expiry ? new Date(r.expiry).toLocaleDateString() : '—'}</div>
                        </div>

                        {showBarcodes && r.productBarcode && (
                            <div style={{ marginTop: 6, borderTop: '1px dashed #e5e7eb', paddingTop: 6 }}>
                                <Barcode value={r.productBarcode} format="EAN13" height={26} showText />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
