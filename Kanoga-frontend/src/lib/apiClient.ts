const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

export type AuthState = {
  email: string;
  password: string;
} | null;

function buildAuthHeaders(auth: AuthState): Record<string, string> {
  if (!auth) return {};
  const token = btoa(`${auth.email}:${auth.password}`); // base64
  return {
    Authorization: `Basic ${token}`,
  };
}

/** Turns a failed response into an Error carrying the backend's own message. */
async function toError(res: Response, method: string, path: string): Promise<Error> {
  try {
    const body = await res.json();
    if (body && typeof body.message === "string" && body.message.trim()) {
      return new Error(body.message);
    }
  } catch {
  }

  if (res.status === 401 || res.status === 403) {
    return new Error("Not authorised — please log in again.");
  }
  return new Error(`${method} ${path} failed with ${res.status}`);
}

export async function apiGet<T>(path: string, auth: AuthState): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...buildAuthHeaders(auth),
    },
  });

  if (!res.ok) {
    throw await toError(res, "GET", path);
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
    throw await toError(res, "POST", path);
  }

  return res.json();
}

export async function apiPatch<TReq, TRes>(
  path: string,
  body: TReq,
  auth: AuthState
): Promise<TRes> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(auth),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await toError(res, "PATCH", path);
  }

  return res.json();
}

export async function apiPostRaw<TRes>(
  path: string,
  body: string,
  contentType: string,
  auth: AuthState
): Promise<TRes> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      ...buildAuthHeaders(auth),
    },
    body,
  });

  if (!res.ok) {
    throw await toError(res, "POST", path);
  }

  return res.json();
}

export async function apiPut<TReq, TRes>(
  path: string,
  body: TReq,
  auth: AuthState
): Promise<TRes> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(auth),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await toError(res, "PUT", path);
  }

  return res.json();
}
