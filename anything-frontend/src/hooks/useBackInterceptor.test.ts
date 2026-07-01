import { renderHook, act } from "@testing-library/react";
import { useBackInterceptor } from "./useBackInterceptor";

const SENTINEL = { backInterceptorSentinel: true };

describe("useBackInterceptor", () => {
  let pushStateSpy: jest.SpyInstance;
  let backSpy: jest.SpyInstance;
  let popstateHandlers: EventListener[];

  beforeEach(() => {
    popstateHandlers = [];

    pushStateSpy = jest
      .spyOn(window.history, "pushState")
      .mockImplementation(() => {});
    backSpy = jest
      .spyOn(window.history, "back")
      .mockImplementation(() => {});

    const originalAdd = window.addEventListener.bind(window);
    jest.spyOn(window, "addEventListener").mockImplementation((type, handler, ...rest) => {
      if (type === "popstate") {
        popstateHandlers.push(handler as EventListener);
      }
      return originalAdd(type, handler, ...rest);
    });

    const originalRemove = window.removeEventListener.bind(window);
    jest.spyOn(window, "removeEventListener").mockImplementation((type, handler, ...rest) => {
      if (type === "popstate") {
        popstateHandlers = popstateHandlers.filter((h) => h !== handler);
      }
      return originalRemove(type, handler, ...rest);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const firePopState = () => {
    act(() => {
      popstateHandlers.forEach((h) => h(new PopStateEvent("popstate")));
    });
  };

  it("does not push a sentinel on mount when no handlers are active", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({ handlers: [{ isActive: false, onBack }] })
    );
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("pushes a sentinel when first rendered with an active handler", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({ handlers: [{ isActive: true, onBack }] })
    );
    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  it("pushes a sentinel when a handler transitions from inactive to active", () => {
    const onBack = jest.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useBackInterceptor({ handlers: [{ isActive: active, onBack }] }),
      { initialProps: { active: false } }
    );
    expect(pushStateSpy).not.toHaveBeenCalled();

    rerender({ active: true });

    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  it("calls the active handler on popstate", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({ handlers: [{ isActive: true, onBack }] })
    );
    pushStateSpy.mockClear();

    firePopState();

    expect(onBack).toHaveBeenCalled();
  });

  it("does not re-push a sentinel after the active handler is called", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({ handlers: [{ isActive: true, onBack }] })
    );
    pushStateSpy.mockClear();

    firePopState();

    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("skips inactive handlers and fires the first active one", () => {
    const onBack1 = jest.fn();
    const onBack2 = jest.fn();
    renderHook(() =>
      useBackInterceptor({
        handlers: [
          { isActive: false, onBack: onBack1 },
          { isActive: true, onBack: onBack2 },
        ],
      })
    );

    firePopState();

    expect(onBack1).not.toHaveBeenCalled();
    expect(onBack2).toHaveBeenCalled();
  });

  it("does not call any handler when popstate fires and no handler is active", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({ handlers: [{ isActive: false, onBack }] })
    );

    firePopState();

    expect(onBack).not.toHaveBeenCalled();
  });

  it("calls history.back to pop the sentinel when handler deactivates via UI", () => {
    const onBack = jest.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useBackInterceptor({ handlers: [{ isActive: active, onBack }] }),
      { initialProps: { active: true } }
    );

    rerender({ active: false });

    expect(backSpy).toHaveBeenCalled();
  });

  it("suppresses the popstate that follows a programmatic close", () => {
    const onBack = jest.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useBackInterceptor({ handlers: [{ isActive: active, onBack }] }),
      { initialProps: { active: true } }
    );

    rerender({ active: false }); // triggers history.back()
    firePopState(); // simulates the popstate that history.back() would fire

    expect(onBack).not.toHaveBeenCalled();
  });

  it("does not call history.back when skipCleanup was called before deactivating", () => {
    // e.g. a nav item that both closes the drawer and routes to a new page —
    // popping here would undo that navigation instead of discarding the
    // sentinel. router.push() commits its URL change asynchronously (via a
    // React transition), so callers must signal intent explicitly via
    // skipCleanup() rather than relying on window.location having already
    // changed by the time this hook's effect runs.
    const onBack = jest.fn();
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useBackInterceptor({ handlers: [{ isActive: active, onBack }] }),
      { initialProps: { active: true } }
    );

    result.current.skipCleanup();
    rerender({ active: false });

    expect(backSpy).not.toHaveBeenCalled();
  });

  it("calls history.back when deactivating without skipCleanup, even if the URL has not changed yet", () => {
    // Mirrors the real-world timing of router.push(): the URL update lands
    // in a later transition commit, so it must not be used as the signal.
    const onBack = jest.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useBackInterceptor({ handlers: [{ isActive: active, onBack }] }),
      { initialProps: { active: true } }
    );

    rerender({ active: false });

    expect(backSpy).toHaveBeenCalled();
  });

  it("does not call history.back when deactivating without a prior sentinel", () => {
    // Handlers that were never active should not trigger cleanup.
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({ handlers: [{ isActive: false, onBack }] })
    );

    expect(backSpy).not.toHaveBeenCalled();
  });

  it("removes the popstate listener on unmount", () => {
    const { unmount } = renderHook(() => useBackInterceptor());
    expect(popstateHandlers).toHaveLength(1);

    unmount();

    expect(popstateHandlers).toHaveLength(0);
  });
});
