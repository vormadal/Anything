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

// Re-export Kiota's error class so hooks can catch it for status-specific handling
export { DefaultApiError as ApiError };

// Kiota middleware that clears tokens and fires 'auth:unauthorized' on 401 responses
// from our API (skips auth endpoints where 401 is a valid credential-failure response).
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
      localStorage.getItem(ACCESS_TOKEN_KEY)
    ) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event("auth:unauthorized"));
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
