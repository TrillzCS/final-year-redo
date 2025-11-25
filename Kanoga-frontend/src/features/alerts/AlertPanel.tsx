import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";

type Alert = {
    id: number;
    alertType: string;
    message: string;
    severity: string;
    createdAt: string;
};

export function AlertPanel() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiGet<Alert[]>("/api/alerts")
            .then(setAlerts)
            .catch((err) => {
                console.error(err);
                setError("Failed to load alerts");
            });
    }, []);

    return (
        <section>
            <h2>Alerts</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {alerts.length === 0 && !error && <p>No alerts yet.</p>}
            <ul>
                {alerts.map((a) => (
                    <li key={a.id}>
                        <strong>[{a.severity}] {a.alertType}</strong> – {a.message}{" "}
                        <small>{new Date(a.createdAt).toLocaleString()}</small>
                    </li>
                ))}
            </ul>
        </section>
    );
}
