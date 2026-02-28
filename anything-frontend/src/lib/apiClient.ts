import {
  AllowedHostsValidator,
  BaseBearerTokenAuthenticationProvider,
  DefaultApiError,
  type AccessTokenProvider,
} from "@microsoft/kiota-abstractions";
import { DefaultRequestAdapter } from "@microsoft/kiota-bundle";
import { createApiClient } from "@/lib/api-client/apiClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

// Re-export Kiota's error class so hooks can catch it for status-specific handling
export { DefaultApiError as ApiError };

// Intercept fetch responses to detect expired tokens (401 on non-auth endpoints)
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      const url =
        args[0] instanceof Request
          ? args[0].url
          : typeof args[0] === "string"
            ? args[0]
            : "";
      const isOurApiRequest = url.startsWith(API_BASE_URL);
      const isAuthEndpoint = url.includes("/api/auth/");
      const hasToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (isOurApiRequest && !isAuthEndpoint && hasToken) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
    }
    return response;
  };
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

const adapter = new DefaultRequestAdapter(
  new BaseBearerTokenAuthenticationProvider(
    new LocalStorageAccessTokenProvider()
  )
);
adapter.baseUrl = API_BASE_URL;

export const apiClient = createApiClient(adapter);
