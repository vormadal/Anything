import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

const mockIsPushSupported = jest.fn();
const mockGetExistingSubscription = jest.fn();
const mockSubscribeToPush = jest.fn();

jest.mock("@/lib/push", () => ({
  isPushSupported: () => mockIsPushSupported(),
  getExistingSubscription: () => mockGetExistingSubscription(),
  subscribeToPush: (key: string) => mockSubscribeToPush(key),
  toSubscriptionKeys: (subscription: { endpoint: string }) => ({
    endpoint: subscription.endpoint,
    p256dhKey: "p256dh",
    authKey: "auth",
  }),
}));

const mockConfigGet = jest.fn();
const mockDevicesPost = jest.fn();
const mockRemovePost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notifications: {
        push: {
          config: { get: () => mockConfigGet() },
          devices: {
            post: (...args: unknown[]) => mockDevicesPost(...args),
            remove: { post: (...args: unknown[]) => mockRemovePost(...args) },
          },
        },
      },
    },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function setPermission(value: NotificationPermission) {
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    writable: true,
    value: { permission: value, requestPermission: jest.fn() },
  });
}

describe("usePushSubscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPushSupported.mockReturnValue(true);
    mockGetExistingSubscription.mockResolvedValue(null);
    mockConfigGet.mockResolvedValue({ enabled: true, publicKey: "vapid-public-key" });
    mockDevicesPost.mockResolvedValue(undefined);
    mockRemovePost.mockResolvedValue(undefined);
    setPermission("default");
  });

  it("reports unsupported without ever asking the server", async () => {
    mockIsPushSupported.mockReturnValue(false);

    const { result } = renderHook(() => usePushSubscription(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("unsupported"));
  });

  it("reports unavailable when the deployment has no VAPID keys", async () => {
    mockConfigGet.mockResolvedValue({ enabled: false, publicKey: null });

    const { result } = renderHook(() => usePushSubscription(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });

  it("reports off when supported, configured and not yet subscribed", async () => {
    const { result } = renderHook(() => usePushSubscription(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("off"));
  });

  it("reports denied when the user blocked notifications", async () => {
    setPermission("denied");

    const { result } = renderHook(() => usePushSubscription(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("denied"));
  });

  it("reports on when this browser already has a subscription", async () => {
    mockGetExistingSubscription.mockResolvedValue({ endpoint: "https://push.example/1" });

    const { result } = renderHook(() => usePushSubscription(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("on"));
  });

  it("still reports on when a subscription predates a later block", async () => {
    // Order matters in resolveStatus: an existing subscription wins over a
    // denied permission, so the UI doesn't flip to "blocked" while push works.
    setPermission("denied");
    mockGetExistingSubscription.mockResolvedValue({ endpoint: "https://push.example/1" });

    const { result } = renderHook(() => usePushSubscription(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("on"));
  });

  it("registers the subscription with the server when enabled", async () => {
    mockSubscribeToPush.mockResolvedValue({ endpoint: "https://push.example/new" });

    const { result } = renderHook(() => usePushSubscription(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("off"));

    await act(async () => {
      await result.current.enable();
    });

    expect(mockSubscribeToPush).toHaveBeenCalledWith("vapid-public-key");
    expect(mockDevicesPost).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://push.example/new",
        p256dhKey: "p256dh",
        authKey: "auth",
      })
    );
    expect(result.current.status).toBe("on");
  });

  it("does not report on when the user refuses the prompt", async () => {
    mockSubscribeToPush.mockResolvedValue(null);
    setPermission("denied");

    const { result } = renderHook(() => usePushSubscription(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("denied"));

    await act(async () => {
      await result.current.enable();
    });

    expect(mockDevicesPost).not.toHaveBeenCalled();
    expect(result.current.status).toBe("denied");
  });

  it("stays off rather than on when the server registration fails", async () => {
    // Otherwise the UI promises notifications the server can never send.
    mockSubscribeToPush.mockResolvedValue({ endpoint: "https://push.example/new" });
    mockDevicesPost.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => usePushSubscription(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("off"));

    await act(async () => {
      await result.current.enable().catch(() => {});
    });

    expect(result.current.status).toBe("off");
  });

  it("tells the server before dropping the local subscription", async () => {
    const unsubscribe = jest.fn().mockResolvedValue(true);
    mockGetExistingSubscription.mockResolvedValue({
      endpoint: "https://push.example/1",
      unsubscribe,
    });

    const { result } = renderHook(() => usePushSubscription(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("on"));

    await act(async () => {
      await result.current.disable();
    });

    // Order is load-bearing: once unsubscribed the endpoint is gone, and it's
    // the only thing identifying the row server-side.
    expect(mockRemovePost).toHaveBeenCalledWith({ endpoint: "https://push.example/1" });
    expect(mockRemovePost.mock.invocationCallOrder[0]).toBeLessThan(
      unsubscribe.mock.invocationCallOrder[0]
    );
    expect(result.current.status).toBe("off");
  });
});
