const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

export async function apiGet<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`);
    if (!res.ok) {
        throw new Error(`API error ${res.status}`);
    }
    return res.json();

}
export type VerificationResult = {
    valid: boolean;
    message: string;
    productName?: string | null;
    subBatchCode?: string | null;
    batchCode?: string | null;
    supplierName?: string | null;
    bestBefore?: string | null;
    expired: boolean;
};

