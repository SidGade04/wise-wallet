export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const apiBase = import.meta.env.VITE_API_URL ?? ""; // e.g. http://localhost:8000

export async function apiFetch<T>(
  path: string,
  options: { method?: HttpMethod; body?: any; token?: string; signal?: AbortSignal } = {}
): Promise<T> {
  const { method = "GET", body, token, signal } = options;
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
    signal,
  });

  const ctype = res.headers.get("content-type") || "";
  const data = ctype.includes("application/json") ? await res.json().catch(() => ({})) : await res.blob();

  if (!res.ok) {
    const msg = (data as any)?.detail || (data as any)?.message || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}
