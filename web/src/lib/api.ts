export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = "error", details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TOKEN_KEY = "@encartefacil:token";
const SESSION_ID_KEY = "@encartefacil:session-id";
const LOCALE_KEY = "locale";
const MARKET_KEY = "market";

export const storage = {
  getToken(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string): void {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* modo privado */
    }
  },
  clearToken(): void {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
  getLocale(): string {
    try {
      return window.localStorage.getItem(LOCALE_KEY) ?? "pt-br";
    } catch {
      return "pt-br";
    }
  },
  setLocale(locale: string): void {
    try {
      window.localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* ignore */
    }
  },
  getMarket(): string {
    try {
      return window.localStorage.getItem(MARKET_KEY) ?? "BR";
    } catch {
      return "BR";
    }
  },
  setMarket(market: string): void {
    try {
      window.localStorage.setItem(MARKET_KEY, market);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Gera o `x-session-id` exatamente como o cliente original:
 * UUID no primeiro uso, mantido em `sessionStorage`.
 */
function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.sessionStorage.setItem(SESSION_ID_KEY, generated);
    return generated;
  } catch {
    return "sess_desconhecido";
  }
}

function browserHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "x-session-id": getSessionId(),
    "x-platform": "web",
    "x-locale": storage.getLocale(),
    "x-market": storage.getMarket(),
  };

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) headers["X-Timezone"] = timezone;
    if (typeof window !== "undefined" && window.screen) {
      headers["X-Screen-Resolution"] = `${window.screen.width}x${window.screen.height}`;
    }
    if (typeof window !== "undefined" && window.location.hostname) {
      headers["x-forwarded-host"] = window.location.hostname;
    }
  } catch {
    /* navegador sem APIs de tela */
  }

  return headers;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

const API_BASE = "/api";

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;

  let url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { ...browserHeaders() };
  const token = storage.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, { method, headers, body: payload, signal, credentials: "include" });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok) {
    const message =
      (isJson && typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: unknown }).error)
        : typeof data === "string" && data.length > 0
          ? data
          : `Erro ${response.status}`) || `Erro ${response.status}`;
    const code =
      isJson && typeof data === "object" && data !== null && "code" in data
        ? String((data as { code?: unknown }).code)
        : "error";
    const details =
      isJson && typeof data === "object" && data !== null && "details" in data
        ? (data as { details?: unknown }).details
        : undefined;

    if (response.status === 401 && token) {
      storage.clearToken();
      window.dispatchEvent(new CustomEvent("encarte:session-expired"));
    }

    throw new ApiClientError(response.status, message, code, details);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "GET", query, signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
