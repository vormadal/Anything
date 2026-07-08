import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const mockReplayOutbox = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/offline/replay", () => ({
  replayOutbox: (...args: unknown[]) => mockReplayOutbox(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestQueryClientWrapper";
  return Wrapper;
}

describe("useOfflineSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("triggers a replay on mount", () => {
    renderHook(() => useOfflineSync(), { wrapper: createWrapper() });
    expect(mockReplayOutbox).toHaveBeenCalledTimes(1);
  });

  it("triggers a replay when the online event fires", () => {
    renderHook(() => useOfflineSync(), { wrapper: createWrapper() });
    mockReplayOutbox.mockClear();

    window.dispatchEvent(new Event("online"));

    expect(mockReplayOutbox).toHaveBeenCalledTimes(1);
  });

  it("triggers a replay when the window regains focus", () => {
    renderHook(() => useOfflineSync(), { wrapper: createWrapper() });
    mockReplayOutbox.mockClear();

    window.dispatchEvent(new Event("focus"));

    expect(mockReplayOutbox).toHaveBeenCalledTimes(1);
  });

  it("removes listeners on unmount", () => {
    const { unmount } = renderHook(() => useOfflineSync(), { wrapper: createWrapper() });
    mockReplayOutbox.mockClear();
    unmount();

    window.dispatchEvent(new Event("online"));

    expect(mockReplayOutbox).not.toHaveBeenCalled();
  });
});
