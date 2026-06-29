import { renderHook, act } from "@testing-library/react";
import { useBackInterceptor } from "./useBackInterceptor";

const mockNav = { pathname: "/" };

jest.mock("next/navigation", () => ({
  usePathname: () => mockNav.pathname,
}));

jest.mock("sonner", () => {
  const toastFn = jest.fn().mockReturnValue("mock-toast-id");
  toastFn.dismiss = jest.fn();
  return { toast: toastFn };
});

import { toast } from "sonner";

const mockToast = toast as jest.Mock;
const mockDismiss = (toast as unknown as { dismiss: jest.Mock }).dismiss;

const SENTINEL = { appSentinel: true };
const ENTRY = { appSentinel: false }; // a real (non-sentinel) page entry
const EXIT_PROMPT = "Press back again to exit";

describe("useBackInterceptor", () => {
  let pushStateSpy: jest.SpyInstance;
  let popstateHandlers: EventListener[];
  // Simulated current value of window.history.state. The pushState mock mirrors
  // the browser by storing the pushed state; individual tests set it to mimic
  // the entry the browser lands on after a back press.
  let historyState: unknown;

  beforeEach(() => {
    jest.useFakeTimers();
    historyState = null;
    mockNav.pathname = "/";
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

  // Dispatches a popstate event after positioning history.state on the entry the
  // browser landed on (defaults to a real, non-sentinel page entry).
  const firePopState = (landedOn: unknown = ENTRY) => {
    historyState = landedOn;
    act(() => {
      popstateHandlers.forEach((h) => h(new PopStateEvent("popstate")));
    });
  };

  // Simulates a forward (router.push) navigation to a new in-app page, which
  // re-runs the pathname effect with a non-sentinel history entry.
  const navigateForward = (
    rerender: (props?: unknown) => void,
    path: string
  ) => {
    mockNav.pathname = path;
    historyState = ENTRY;
    act(() => rerender());
  };

  it("pushes a sentinel buffer on mount", () => {
    renderHook(() => useBackInterceptor());

    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  // A directly-opened page (deep link) is the app's entry point, so the first
  // back press there would exit the app and must be guarded.
  it("shows the exit prompt on the first back at the entry point (any page)", () => {
    mockNav.pathname = "/recipes/new";
    renderHook(() => useBackInterceptor());

    pushStateSpy.mockClear();
    mockToast.mockClear();
    firePopState(ENTRY); // popped the sentinel off the entry point

    expect(mockToast).toHaveBeenCalledWith(EXIT_PROMPT, { duration: 2000 });
    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  it("allows exit on the second back within 2s (no re-arm, dismisses toast)", () => {
    renderHook(() => useBackInterceptor());

    firePopState(ENTRY); // first press at the entry point — prompt + re-arm
    pushStateSpy.mockClear();
    mockToast.mockClear();

    firePopState(ENTRY); // second press within 2s

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockDismiss).toHaveBeenCalledWith("mock-toast-id");
  });

  it("treats back as a first press again after the 2s timeout expires", () => {
    renderHook(() => useBackInterceptor());

    firePopState(ENTRY); // first press
    mockToast.mockClear();
    pushStateSpy.mockClear();

    act(() => {
      jest.advanceTimersByTime(2001);
    });

    firePopState(ENTRY); // back after timeout — treated as a first press again

    expect(mockToast).toHaveBeenCalledWith(EXIT_PROMPT, { duration: 2000 });
    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL, "");
  });

  // The reported bug: backing out of an in-app page must navigate, not prompt.
  it("does not prompt when backing from an in-app page onto the sentinel", () => {
    const { rerender } = renderHook(() => useBackInterceptor());

    navigateForward(rerender, "/lists"); // home -> /lists (in-app)
    pushStateSpy.mockClear();
    mockToast.mockClear();

    firePopState(SENTINEL); // back lands on the sentinel (returning to entry)

    expect(mockToast).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("does not prompt for ordinary back navigation between in-app pages", () => {
    const { rerender } = renderHook(() => useBackInterceptor());

    navigateForward(rerender, "/lists"); // home -> /lists
    navigateForward(rerender, "/lists/abc"); // /lists -> /lists/abc
    pushStateSpy.mockClear();
    mockToast.mockClear();

    firePopState(ENTRY); // /lists/abc -> /lists (still an in-app entry)

    expect(mockToast).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  // Full unwind: forward twice, then back twice returns to the entry without a
  // prompt; only the back that would actually exit prompts.
  it("prompts only once the user has unwound back to the entry point", () => {
    const { rerender } = renderHook(() => useBackInterceptor());

    navigateForward(rerender, "/lists"); // home -> /lists
    navigateForward(rerender, "/lists/abc"); // /lists -> /lists/abc

    firePopState(ENTRY); // /lists/abc -> /lists (in-app, no prompt)
    expect(mockToast).not.toHaveBeenCalled();

    // /lists -> sentinel (back at entry). The pathname effect then re-runs.
    mockNav.pathname = "/";
    firePopState(SENTINEL);
    act(() => rerender());
    expect(mockToast).not.toHaveBeenCalled();

    firePopState(ENTRY); // back at the entry point -> would exit -> prompt
    expect(mockToast).toHaveBeenCalledWith(EXIT_PROMPT, { duration: 2000 });
  });

  it("calls the first active handler and restores the sentinel", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({ handlers: [{ isActive: true, onBack }] })
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
      })
    );

    firePopState();

    expect(onBack1).not.toHaveBeenCalled();
    expect(onBack2).toHaveBeenCalled();
  });

  it("removes the popstate listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useBackInterceptor());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("popstate", expect.any(Function));
  });
});
