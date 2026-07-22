import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

jest.mock("@/hooks/useAuth", () => ({
  getAccessToken: jest.fn(() => "test-token"),
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

function renderRealtimeSync() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useRealtimeSync(), { wrapper });
  return { ...view, invalidateSpy };
}

describe("useRealtimeSync", () => {
  const originalEventSource = global.EventSource;

  beforeEach(() => {
    FakeEventSource.instances = [];
    mockedGetAccessToken.mockReturnValue("test-token");
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

  it("does not connect when there is no access token", () => {
    mockedGetAccessToken.mockReturnValue(null);
    renderRealtimeSync();
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("invalidates the matching items key on a shoppingListItems message", () => {
    const { invalidateSpy } = renderRealtimeSync();
    const es = FakeEventSource.instances[0];

    act(() => {
      es.emitMessage({ type: "shoppingListItems", listId: 42 });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["shoppingListItems", 42],
    });
  });

  it("does not invalidate on the first connection but does on reconnect", () => {
    const { invalidateSpy } = renderRealtimeSync();
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

  it("revalidates when the app becomes visible again while online", () => {
    const { invalidateSpy } = renderRealtimeSync();

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

  it("does not revalidate on resume while offline", () => {
    const { invalidateSpy } = renderRealtimeSync();

    act(() => {
      setOnline(false);
      setHidden(false);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("does not revalidate when the visibilitychange leaves the document hidden", () => {
    const { invalidateSpy } = renderRealtimeSync();

    act(() => {
      setHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("reconnects on resume when the connection was closed", () => {
    renderRealtimeSync();
    const first = FakeEventSource.instances[0];
    first.close();

    act(() => {
      setHidden(false);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it("closes the connection and removes listeners on unmount", () => {
    const removeSpy = jest.spyOn(document, "removeEventListener");
    const { unmount } = renderRealtimeSync();
    const es = FakeEventSource.instances[0];

    unmount();

    expect(es.closed).toBe(true);
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});
