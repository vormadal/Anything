import { renderHook, act } from "@testing-library/react";
import { useBackInterceptor } from "./useBackInterceptor";

jest.mock("sonner", () => {
  const toastFn = jest.fn().mockReturnValue("mock-toast-id");
  toastFn.dismiss = jest.fn();
  return { toast: toastFn };
});

import { toast } from "sonner";

const mockToast = toast as jest.Mock;
const mockDismiss = (toast as unknown as { dismiss: jest.Mock }).dismiss;

const SENTINEL = { appSentinel: true };
const EXIT_PROMPT = "Press back again to exit";

describe("useBackInterceptor", () => {
  let pushStateSpy: jest.SpyInstance;
  let popstateHandlers: EventListener[];
  // Simulated current value of window.history.state. The pushState mock updates
  // it to a sentinel (mirroring the browser) and individual tests set it to
  // mimic the entry the browser lands on after a back press.
  let historyState: unknown;

  beforeEach(() => {
    jest.useFakeTimers();
    historyState = null;
    popstateHandlers = [];

    Object.defineProperty(window.history, "state", {
      configurable: true,
      get: () => historyState,
    });

    pushStateSpy = jest
      .spyOn(window.history, "pushState")
      .mockImplementation((state) => {
        historyState = state;
      });

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

    mockToast.mockClear();
    mockDismiss.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    Reflect.deleteProperty(window.history, "state");
  });

  // Simulates a back press. `landedOn` is the history entry the browser exposes
  // via window.history.state after the pop (defaults to a non-sentinel entry).
  const firePopState = (landedOn: unknown = null) => {
    historyState = landedOn;
    act(() => {
      popstateHandlers.forEach((h) => h(new PopStateEvent("popstate")));
    });
  };

  it("pushes a sentinel on mount when on the home page", () => {
    renderHook(() => useBackInterceptor({ isRoot: true }));

    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  it("does NOT push a sentinel on mount when not on the home page", () => {
    renderHook(() => useBackInterceptor({ isRoot: false }));

    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("arms a sentinel when navigating into the home page", () => {
    const { rerender } = renderHook(
      ({ isRoot }) => useBackInterceptor({ isRoot }),
      { initialProps: { isRoot: false } }
    );
    expect(pushStateSpy).not.toHaveBeenCalled();

    rerender({ isRoot: true });

    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  // The core bug: pressing back on a non-home page (a list overview, a detail
  // page, etc.) must NOT show the exit prompt — it should let the browser
  // navigate back to the previous page.
  it("does nothing on back when not on the home page (normal navigation)", () => {
    renderHook(() => useBackInterceptor({ isRoot: false }));

    pushStateSpy.mockClear();
    firePopState(); // landed on a regular (non-sentinel) page entry

    expect(mockToast).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  // Backing into home from a deeper page lands on the sentinel entry: the user
  // should arrive at home cleanly without the exit prompt.
  it("does nothing when a back press lands on the sentinel (arriving at home)", () => {
    renderHook(() => useBackInterceptor({ isRoot: false }));

    pushStateSpy.mockClear();
    firePopState(SENTINEL); // landed back on the armed sentinel

    expect(mockToast).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("calls the first active handler and re-arms the sentinel", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({
        handlers: [{ isActive: true, onBack }],
        isRoot: true,
      })
    );

    pushStateSpy.mockClear();
    firePopState();

    expect(onBack).toHaveBeenCalled();
    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
    expect(mockToast).not.toHaveBeenCalled();
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
        isRoot: true,
      })
    );

    firePopState();

    expect(onBack1).not.toHaveBeenCalled();
    expect(onBack2).toHaveBeenCalled();
  });

  it("shows the exit toast and re-arms on the first back press while on home", () => {
    renderHook(() => useBackInterceptor({ isRoot: true }));

    pushStateSpy.mockClear();
    mockToast.mockClear();
    firePopState(); // backed off the sentinel onto the real home entry

    expect(mockToast).toHaveBeenCalledWith(EXIT_PROMPT, { duration: 2000 });
    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  it("allows exit on the second back press within 2s (no re-arm, dismisses toast)", () => {
    renderHook(() => useBackInterceptor({ isRoot: true }));

    firePopState(); // first press at home — shows toast, re-arms
    pushStateSpy.mockClear();
    mockToast.mockClear();

    firePopState(); // second press within 2s

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockDismiss).toHaveBeenCalledWith("mock-toast-id");
  });

  it("treats back as a first press again after the 2s timeout expires", () => {
    renderHook(() => useBackInterceptor({ isRoot: true }));

    firePopState(); // first press
    mockToast.mockClear();
    pushStateSpy.mockClear();

    act(() => {
      jest.advanceTimersByTime(2001);
    });

    firePopState(); // back after timeout — treated as a first press again

    expect(mockToast).toHaveBeenCalledWith(EXIT_PROMPT, { duration: 2000 });
    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  it("removes the popstate listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useBackInterceptor({ isRoot: true }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("popstate", expect.any(Function));
  });
});
