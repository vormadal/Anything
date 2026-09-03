import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

jest.mock("@/hooks/useAuth", () => ({
  getAccessToken: jest.fn(() => "test-token"),
}));

const mockIssueTicket = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      events: {
        ticket: { post: (...args: unknown[]) => mockIssueTicket(...args) },
      },
    },
  },
}));

import { getAccessToken } from "@/hooks/useAuth";

const mockedGetAccessToken = getAccessToken as jest.MockedFunction<
  typeof getAccessToken
>;

// Minimal fake EventSource: captures handlers, tracks instances and readyState.
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static readonly CLOSED = 2;

  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  emitOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }

  close() {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function setHidden(value: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, value });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: value ? "hidden" : "visible",
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateSpy };
}

async function renderRealtimeSync() {
  const { wrapper, invalidateSpy } = createWrapper();
  const view = renderHook(() => useRealtimeSync(), { wrapper });
  // Minting the connect ticket is async (an apiClient call) — flush it so the
  // EventSource exists before assertions run.
  await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(0));
  return { ...view, invalidateSpy };
}

describe("useRealtimeSync", () => {
  const originalEventSource = global.EventSource;

  beforeEach(() => {
    FakeEventSource.instances = [];
    mockedGetAccessToken.mockReturnValue("test-token");
    mockIssueTicket.mockResolvedValue({ ticket: "test-ticket" });
    setOnline(true);
    setHidden(false);
    (global as unknown as { EventSource: unknown }).EventSource =
      FakeEventSource;
  });

  afterEach(() => {
    (global as unknown as { EventSource: unknown }).EventSource =
      originalEventSource;
    jest.clearAllMocks();
  });

  it("does not connect when there is no access token", async () => {
    mockedGetAccessToken.mockReturnValue(null);
    const { wrapper } = createWrapper();
    renderHook(() => useRealtimeSync(), { wrapper });
    // Nothing to await here — connect() bails synchronously before the
    // ticket call, so there's no pending async work to flush.
    await act(async () => {});
    expect(mockIssueTicket).not.toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("does not connect when minting a ticket fails", async () => {
    mockIssueTicket.mockRejectedValue(new Error("not a household member"));
    const { wrapper } = createWrapper();
    renderHook(() => useRealtimeSync(), { wrapper });

    await waitFor(() => expect(mockIssueTicket).toHaveBeenCalled());
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("connects with the ticket in the query string", async () => {
    await renderRealtimeSync();
    const es = FakeEventSource.instances[0];

    expect(es.url).toContain("ticket=test-ticket");
  });

  it("invalidates the matching items key on a shoppingListItems message", async () => {
    const { invalidateSpy } = await renderRealtimeSync();
    const es = FakeEventSource.instances[0];

    act(() => {
      es.emitMessage({ type: "shoppingListItems", listId: 42 });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["shoppingListItems", 42],
    });
  });

  it("does not invalidate on the first connection but does on reconnect", async () => {
    const { invalidateSpy } = await renderRealtimeSync();
    const es = FakeEventSource.instances[0];

    act(() => {
      es.emitOpen();
    });
    expect(invalidateSpy).not.toHaveBeenCalled();

    act(() => {
      es.emitOpen();
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["shoppingLists"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["shoppingListItems"],
    });
  });

  it("revalidates when the app becomes visible again while online", async () => {
    const { invalidateSpy } = await renderRealtimeSync();

    act(() => {
      setHidden(false);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["shoppingLists"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["shoppingListTemplates"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["shoppingList"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["shoppingListItems"],
    });
  });

  it("does not revalidate on resume while offline", async () => {
    const { invalidateSpy } = await renderRealtimeSync();

    act(() => {
      setOnline(false);
      setHidden(false);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("does not revalidate when the visibilitychange leaves the document hidden", async () => {
    const { invalidateSpy } = await renderRealtimeSync();

    act(() => {
      setHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("reconnects on resume when the connection was closed", async () => {
    await renderRealtimeSync();
    const first = FakeEventSource.instances[0];
    first.close();

    act(() => {
      setHidden(false);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
  });

  it("closes the connection and mints a fresh ticket when the stream errors", async () => {
    jest.useFakeTimers();
    try {
      await renderRealtimeSync();
      const first = FakeEventSource.instances[0];

      act(() => {
        first.onerror?.();
      });
      expect(first.closed).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(5000);
        // Let the reconnect's ticket promise resolve.
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockIssueTicket).toHaveBeenCalledTimes(2);
      expect(FakeEventSource.instances).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("closes the connection and removes listeners on unmount", async () => {
    const removeSpy = jest.spyOn(document, "removeEventListener");
    const { unmount } = await renderRealtimeSync();
    const es = FakeEventSource.instances[0];

    unmount();

    expect(es.closed).toBe(true);
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});
