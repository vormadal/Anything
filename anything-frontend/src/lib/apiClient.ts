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

// Re-export Kiota's error class so hooks can catch it for status-specific handling
export { DefaultApiError as ApiError };

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
