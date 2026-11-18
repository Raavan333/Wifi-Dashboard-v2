export class ApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, message: string, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

const RUNTIME_BASE_STORAGE_KEY = "wifi_platform_api_base_url";

export function getConfiguredApiBaseUrl(): string {
  try {
    const stored = window.localStorage.getItem(RUNTIME_BASE_STORAGE_KEY);
    if (stored !== null && stored.trim() !== "") {
      return stored.trim().replace(/\/+$/, "");
    }
  } catch {
    // Ignore storage read errors
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
  return envUrl.replace(/\/+$/, "");
}

export function setConfiguredApiBaseUrl(url: string): void {
  try {
    const cleaned = url.trim().replace(/\/+$/, "");
    if (cleaned) {
      window.localStorage.setItem(RUNTIME_BASE_STORAGE_KEY, cleaned);
    } else {
      window.localStorage.removeItem(RUNTIME_BASE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage write errors
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = getConfiguredApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = `${baseUrl}${normalizedPath}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as {
        message?: string;
        detail?: string;
      };
      if (payload?.message) detail = payload.message;
      else if (payload?.detail) detail = payload.detail;
    } catch {
      // Response body was not JSON
    }
    throw new ApiError(response.status, detail, fullUrl);
  }

  return (await response.json()) as T;
}
