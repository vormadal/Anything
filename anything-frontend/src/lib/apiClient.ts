import {
  AllowedHostsValidator,
  BaseBearerTokenAuthenticationProvider,
  DefaultApiError,
  type AccessTokenProvider,
  type RequestOption,
} from "@microsoft/kiota-abstractions";
import {
  HttpClient,
  MiddlewareFactory,
  type Middleware,
} from "@microsoft/kiota-http-fetchlibrary";
import { DefaultRequestAdapter } from "@microsoft/kiota-bundle";
import { createApiClient } from "@/lib/api-client/apiClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const HOUSEHOLD_ID_KEY = "householdId";
const HOUSEHOLD_HEADER = "X-Household-Id";

// Re-export Kiota's error class so hooks can catch it for status-specific handling
export { DefaultApiError as ApiError };

export { HOUSEHOLD_ID_KEY, HOUSEHOLD_HEADER };

// Singleton refresh promise to prevent concurrent token refresh requests
let refreshPromise: Promise<string | null> | null = null;

// Attempts to refresh the access token using the stored refresh token.
// Returns the new access token on success, or null on failure.
export async function attemptTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const inner = (async () => {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem(REFRESH_TOKEN_KEY)
        : null;
    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (data?.accessToken && data?.refreshToken && typeof window !== "undefined") {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      return data.accessToken;
    }
    return null;
  })();

  // Use .finally() so the singleton is cleared after the request settles,
  // regardless of success or failure. This avoids a timing issue where the
  // finally block inside the async IIFE runs before the outer assignment.
  refreshPromise = inner.finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Kiota middleware that attempts a token refresh on 401 responses before logging out.
// Skips auth endpoints where 401 is a valid credential-failure response.
class UnauthorizedHandler implements Middleware {
  next: Middleware | undefined = undefined;

  async execute(
    url: string,
    requestInit: RequestInit,
    requestOptions?: Record<string, RequestOption>
  ): Promise<Response> {
    const response = await this.next?.execute(url, requestInit, requestOptions);
    if (!response) {
      throw new Error("No response from next middleware");
    }
    if (
      response.status === 401 &&
      !url.includes("/api/auth/") &&
      typeof window !== "undefined" &&
      localStorage.getItem(REFRESH_TOKEN_KEY)
    ) {
      const newToken = await attemptTokenRefresh();
      if (newToken) {
        // Retry the original request with the new access token
        const headers = new Headers(requestInit.headers as HeadersInit);
        headers.set("Authorization", `Bearer ${newToken}`);
        const retryResponse = await this.next?.execute(
          url,
          { ...requestInit, headers },
          requestOptions
        );
        if (retryResponse) return retryResponse;
      }
      // Refresh failed — clear session and signal logout
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return response;
  }
}

// Kiota middleware that injects the X-Household-Id header from localStorage.
export class HouseholdHeaderHandler implements Middleware {
  next: Middleware | undefined = undefined;

  async execute(
    url: string,
    requestInit: RequestInit,
    requestOptions?: Record<string, RequestOption>
  ): Promise<Response> {
    const householdId =
      typeof window !== "undefined"
        ? localStorage.getItem(HOUSEHOLD_ID_KEY)
        : null;
    if (householdId) {
      const headers = new Headers(requestInit.headers as HeadersInit);
      headers.set(HOUSEHOLD_HEADER, householdId);
      requestInit = { ...requestInit, headers };
    }
    const response = await this.next?.execute(url, requestInit, requestOptions);
    if (!response) {
      throw new Error("No response from next middleware");
    }
    return response;
  }
}

class LocalStorageAccessTokenProvider implements AccessTokenProvider {
  private readonly validator = new AllowedHostsValidator();

  async getAuthorizationToken(): Promise<string> {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
    }
    return "";
  }

  getAllowedHostsValidator(): AllowedHostsValidator {
    return this.validator;
  }
}

const httpClient = new HttpClient(
  undefined,
  new HouseholdHeaderHandler(),
  new UnauthorizedHandler(),
  ...MiddlewareFactory.getDefaultMiddlewares()
);

const adapter = new DefaultRequestAdapter(
  new BaseBearerTokenAuthenticationProvider(
    new LocalStorageAccessTokenProvider()
  ),
  undefined,
  undefined,
  httpClient
);
adapter.baseUrl = API_BASE_URL;

export const apiClient = createApiClient(adapter);
