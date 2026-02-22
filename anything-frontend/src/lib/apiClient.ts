const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ACCESS_TOKEN_KEY = "accessToken";

function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return null;
}

function buildHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...buildHeaders(), ...(options.headers as Record<string, string>) },
  });
  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // body not available
    }
    throw new ApiError(
      `Request failed: ${response.statusText}`,
      response.status,
      body
    );
  }
  if (response.status === 204 || response.headers?.get("content-length") === "0") {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function requestVoid(
  path: string,
  options: RequestInit = {}
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...buildHeaders(), ...(options.headers as Record<string, string>) },
  });
  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // body not available
    }
    throw new ApiError(
      `Request failed: ${response.statusText}`,
      response.status,
      body
    );
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    requestVoid(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => requestVoid(path, { method: "DELETE" }),
};
