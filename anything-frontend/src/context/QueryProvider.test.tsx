import { renderHook, waitFor, act } from "@testing-library/react";
import { useMutation } from "@tanstack/react-query";
import { QueryProvider } from "@/context/QueryProvider";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

// React Query's default networkMode ("online") pauses mutationFn until the
// browser's online event fires, based on its own onlineManager rather than
// the app's isOffline() checks. Our offline queueing (useShoppingLists.ts:
// isOffline() -> enqueueAdd/enqueueUpdate/enqueueDelete) relies on mutationFn
// actually running while offline, so QueryProvider must opt mutations out of
// that gating. Jest/jsdom-only tests that merely stub navigator.onLine
// (without dispatching a real event) can't catch a regression here because
// React Query's onlineManager only reacts to the actual browser event —
// exactly what Playwright's context().setOffline(true) fires for real,
// which is what originally exposed this in e2e/offline.spec.ts.
describe("QueryProvider mutation network mode", () => {
  afterEach(() => {
    setOnline(true);
    window.dispatchEvent(new Event("online"));
  });

  it("still invokes mutationFn after a real browser offline event", async () => {
    const mutationFn = jest.fn<Promise<string>, []>().mockResolvedValue("done");
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: QueryProvider,
    });

    // QueryClientProvider subscribes to React Query's onlineManager only once
    // mounted (in a useEffect), so the offline event must be dispatched after
    // that mount — otherwise it's missed and isOnline() never flips, making
    // this assert true regardless of networkMode.
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(result.current.isPaused).toBe(false);
  });
});
