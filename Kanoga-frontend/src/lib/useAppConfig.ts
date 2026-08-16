import { useEffect, useState } from "react";
import { apiGet } from "./apiClient";
import { useAuth } from "../features/auth/AuthContext";

/** Deployment settings served by GET /api/config. */
export type AppConfig = {
  companyName: string;
  productName: string;
  codePrefix: string;
  defaultShelfLifeMonths: number;
  batchUnit: string;
  productUnit: string;
};

const FALLBACK: AppConfig = {
  companyName: "Traceability",
  productName: "Stock & Traceability System",
  codePrefix: "",
  defaultShelfLifeMonths: 18,
  batchUnit: "kg",
  productUnit: "g",
};

export function useAppConfig(): AppConfig {
  const auth = useAuth();
  const [config, setConfig] = useState<AppConfig>(FALLBACK);

  useEffect(() => {
    if (!auth) return;
    apiGet<AppConfig>("/api/config", auth)
      .then(setConfig)
      .catch(() => setConfig(FALLBACK));
  }, [auth]);

  return config;
}
