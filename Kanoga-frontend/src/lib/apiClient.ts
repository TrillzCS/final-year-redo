const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

export type AuthState = {
  email: string;
  password: string;
} | null;

function buildAuthHeaders(auth: AuthState) {
  if (!auth) return {};
  const token = btoa(`${auth.email}:${auth.password}`); // base64
  return {
    Authorization: `Basic ${token}`,
  };
}

export async function apiGet<T>(path: string, auth: AuthState): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...buildAuthHeaders(auth),
    },
  });

  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }

  return res.json();
}

export async function apiPost<TReq, TRes>(
  path: string,
  body: TReq,
  auth: AuthState
): Promise<TRes> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(auth),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`POST ${path} failed with ${res.status}`);
  }

  return res.json();
}
