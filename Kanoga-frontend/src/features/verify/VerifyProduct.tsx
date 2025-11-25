import { useState, useRef } from "react";
import { apiGet } from "../../lib/api";
import type { VerificationResult } from "../../lib/api";
import { QrReader } from "react-qr-reader";
import jsQR from "jsqr";

export function VerifyProduct() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"manual" | "camera" | "image">("manual");

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    async function handleVerify(e?: React.FormEvent) {
        if (e) e.preventDefault();
        setError(null);
        setResult(null);

        if (!code.trim()) {
            setError("Please enter or scan a code.");
            return;
        }

        setLoading(true);
        try {
            const data = await apiGet<VerificationResult>(
                `/api/verify?code=${encodeURIComponent(code.trim())}`
            );
            setResult(data);
        } catch (err) {
            console.error(err);
            setError("Failed to verify code. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Called when camera scan succeeds
    function handleCameraResult(text?: string | null) {
        if (!text) return;
        setCode(text);
        // Optionally auto-verify:
        handleVerify();
    }

    // Called when user uploads an image
    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        setError(null);
        setResult(null);
        const file = e.target.files?.[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

            if (!qrCode) {
                setError("No QR code found in image.");
                return;
            }

            setCode(qrCode.data);
            // Optionally auto-verify:
            handleVerify();
        };
        img.onerror = () => {
            setError("Could not read image file.");
        };
        img.src = URL.createObjectURL(file);
    }

    const statusColor = result
        ? result.valid
            ? result.expired
                ? "orange"
                : "green"
            : "red"
        : "black";

    return (
        <section style={{ marginTop: 32 }}>
            <h2>Verify Product</h2>

            {/* Mode selector */}
            <div style={{ marginBottom: 12 }}>
                <button
                    type="button"
                    onClick={() => setMode("manual")}
                    style={{ marginRight: 8, fontWeight: mode === "manual" ? "bold" : "normal" }}
                >
                    Manual
                </button>
                <button
                    type="button"
                    onClick={() => setMode("camera")}
                    style={{ marginRight: 8, fontWeight: mode === "camera" ? "bold" : "normal" }}
                >
                    Camera
                </button>
                <button
                    type="button"
                    onClick={() => setMode("image")}
                    style={{ fontWeight: mode === "image" ? "bold" : "normal" }}
                >
                    Image Upload
                </button>
            </div>

            {/* Manual mode */}
            {mode === "manual" && (
                <form onSubmit={handleVerify} style={{ marginBottom: 16 }}>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Paste or type QR code value"
                        style={{ width: "60%", padding: 8, marginRight: 8 }}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? "Checking..." : "Verify"}
                    </button>
                </form>
            )}

            {/* Camera mode */}
            {mode === "camera" && (
                <div style={{ marginBottom: 16 }}>
                    <p>Point your camera at the QR code:</p>
                    <div style={{ width: 300, height: 300, maxWidth: "100%" }}>
                        <QrReader
                            constraints={{ facingMode: "environment" }}
                            scanDelay={500}
                            onResult={(result, error) => {
                                if (result) {
                                    const text = result.getText ? result.getText() : (result as any).text;
                                    handleCameraResult(text);
                                }
                                if (error) {
                                    // you can log errors if you want
                                    // console.info(error);
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Image upload mode */}
            {mode === "image" && (
                <div style={{ marginBottom: 16 }}>
                    <p>Upload an image that contains a QR code:</p>
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                    {/* Hidden canvas for jsQR to read from */}
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>
            )}

            {error && <p style={{ color: "red" }}>{error}</p>}

            {result && (
                <div
                    style={{
                        border: "1px solid #ccc",
                        padding: 16,
                        borderRadius: 8,
                        maxWidth: 600,
                    }}
                >
                    <h3 style={{ color: statusColor }}>
                        {result.valid
                            ? result.expired
                                ? "Product verified, but expired"
                                : " Product verified"
                            : "Invalid code"}
                    </h3>
                    <p>{result.message}</p>

                    {result.valid && (
                        <ul>
                            {result.productName && (
                                <li>
                                    <strong>Product:</strong> {result.productName}
                                </li>
                            )}
                            {result.subBatchCode && (
                                <li>
                                    <strong>Sub-batch:</strong> {result.subBatchCode}
                                </li>
                            )}
                            {result.batchCode && (
                                <li>
                                    <strong>Batch:</strong> {result.batchCode}
                                </li>
                            )}
                            {result.supplierName && (
                                <li>
                                    <strong>Supplier:</strong> {result.supplierName}
                                </li>
                            )}
                            {result.bestBefore && (
                                <li>
                                    <strong>Best before:</strong>{" "}
                                    {new Date(result.bestBefore).toLocaleDateString()}
                                </li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
}

