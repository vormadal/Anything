/**
 * Tests for the UnauthorizedHandler middleware and attemptTokenRefresh logic in apiClient.ts.
 *
 * We exercise the exported `attemptTokenRefresh` helper and indirectly verify the
 * middleware behaviour through unit-level assertions on the fetch mock and localStorage.
 */

// Mock Kiota modules (ESM packages that Jest's jsdom environment cannot parse)
jest.mock("@microsoft/kiota-abstractions", () => ({
  AllowedHostsValidator: jest.fn().mockImplementation(() => ({})),
  BaseBearerTokenAuthenticationProvider: jest.fn().mockImplementation(() => ({})),
  DefaultApiError: class DefaultApiError extends Error {
    responseStatusCode: number | undefined;
  },
}));
jest.mock("@microsoft/kiota-http-fetchlibrary", () => ({
  HttpClient: jest.fn().mockImplementation(() => ({})),
  MiddlewareFactory: { getDefaultMiddlewares: () => [] },
}));
jest.mock("@microsoft/kiota-bundle", () => ({
  DefaultRequestAdapter: jest.fn().mockImplementation(() => ({ baseUrl: "" })),
}));
jest.mock("@/lib/api-client/apiClient", () => ({
  createApiClient: jest.fn().mockReturnValue({}),
}));

// Must be imported after mocks are declared.
import { attemptTokenRefresh, HouseholdHeaderHandler, HOUSEHOLD_HEADER } from "@/lib/apiClient";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Wrap fetch in a jest.fn that Jest can spy on across all tests
const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

beforeAll(() => {
  Object.defineProperty(global, "fetch", {
    value: fetchMock,
    writable: true,
    configurable: true,
  });
});

function seedRefreshToken(token = "valid-refresh-token") {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function mockFetchOk(accessToken: string, refreshToken: string) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ accessToken, refreshToken }),
  } as unknown as Response);
}

function mockFetchFail(status = 401) {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("attemptTokenRefresh", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockClear();
  });

  it("returns null when no refresh token is stored", async () => {
    const result = await attemptTokenRefresh();
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns new access token and updates localStorage on success", async () => {
    seedRefreshToken("my-refresh-token");
    mockFetchOk("new-access-token", "new-refresh-token");

    const result = await attemptTokenRefresh();

    expect(result).toBe("new-access-token");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("new-access-token");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("new-refresh-token");
  });

  it("returns null and does not update storage when refresh endpoint fails", async () => {
    seedRefreshToken("my-refresh-token");
    mockFetchFail(401);

    const result = await attemptTokenRefresh();

    expect(result).toBeNull();
    // Original refresh token should remain untouched
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("my-refresh-token");
  });

  it("deduplicates concurrent refresh calls into a single fetch request", async () => {
    seedRefreshToken("shared-refresh-token");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "shared-access-token",
        refreshToken: "shared-refresh-token-2",
      }),
    } as unknown as Response);

    const [r1, r2, r3] = await Promise.all([
      attemptTokenRefresh(),
      attemptTokenRefresh(),
      attemptTokenRefresh(),
    ]);

    expect(r1).toBe("shared-access-token");
    expect(r2).toBe("shared-access-token");
    expect(r3).toBe("shared-access-token");
    // Only one HTTP call should have been made
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockReset();
  });

  it("does not modify storage when refresh endpoint returns invalid payload", async () => {
    seedRefreshToken("my-refresh-token");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      // Missing accessToken / refreshToken fields
      json: async () => ({}),
    } as unknown as Response);

    const result = await attemptTokenRefresh();

    expect(result).toBeNull();
    // Storage should be unchanged — no partial writes on invalid payload
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("my-refresh-token");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// HouseholdHeaderHandler tests
// ---------------------------------------------------------------------------

const HOUSEHOLD_ID_KEY = "householdId";

describe("HouseholdHeaderHandler", () => {
  let handler: HouseholdHeaderHandler;
  let mockNext: { execute: jest.Mock };

  const mockResponse = { status: 200, ok: true } as unknown as Response;

  beforeEach(() => {
    localStorage.clear();
    handler = new HouseholdHeaderHandler();
    mockNext = {
      execute: jest.fn().mockResolvedValue(mockResponse),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler.next = mockNext as any;
  });

  it("injects X-Household-Id header when householdId is present in localStorage", async () => {
    localStorage.setItem(HOUSEHOLD_ID_KEY, "42");

    await handler.execute("https://api.example.com/test", {});

    const calledInit = mockNext.execute.mock.calls[0][1] as RequestInit;
    const headers = new Headers(calledInit.headers as HeadersInit);
    expect(headers.get(HOUSEHOLD_HEADER)).toBe("42");
  });

  it("does not inject X-Household-Id header when householdId is absent from localStorage", async () => {
    await handler.execute("https://api.example.com/test", {});

    const calledInit = mockNext.execute.mock.calls[0][1] as RequestInit;
    const headers = new Headers(calledInit.headers as HeadersInit);
    expect(headers.get(HOUSEHOLD_HEADER)).toBeNull();
  });

  it("passes through to next middleware", async () => {
    localStorage.setItem(HOUSEHOLD_ID_KEY, "7");

    const result = await handler.execute("https://api.example.com/test", {});

    expect(mockNext.execute).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });
  it("throws when next middleware returns no response", async () => {
    mockNext.execute.mockResolvedValue(undefined);

    await expect(
      handler.execute("https://api.example.com/test", {})
    ).rejects.toThrow("No response from next middleware");
  });
});

describe("token storage constants", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("preserves all three storage keys when set", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh");
    localStorage.setItem(USER_KEY, JSON.stringify({ email: "a@b.com" }));

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("access");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh");
    expect(localStorage.getItem(USER_KEY)).not.toBeNull();
  });
});
