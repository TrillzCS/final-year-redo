
import { useState } from 'react';
import { VerifyProduct } from "./features/verify/VerifyProduct";
import { AlertPanel } from "./features/alerts/AlertPanel";
import { BatchForm } from './features/batches/BatchForm';
import { PackingRunForm } from './features/Packing/PackingRunForm';
import { LabelSheet } from './features/Labels/LabelSheetForm';
//import { OrderAssign } from './features/orders/OrderAssign';

export default function App() {
    const [subBatchId, setSubBatchId] = useState<string | null>(null);

    return (
        <div style={{ maxWidth: 1100, margin: '24px auto', padding: 16 }}>
            <h1>Kanoga Inventory & Batch Tracking</h1>
            <section>
                <h2>Receive Stock</h2>
                <BatchForm />
            </section>
            <section>
                <h2>Packing Run</h2>
                <PackingRunForm onCreated={(id) => setSubBatchId(id)} />
            </section>
            <section>
                <h2>Print Labels</h2>
                <LabelSheet subBatchId={subBatchId} />
            </section>
            <AlertPanel />
            <VerifyProduct />
            {/*<section>
              <h2>Assign to Order</h2>
            <OrderAssign />
             </section>*/}


        </div>
    );
}

