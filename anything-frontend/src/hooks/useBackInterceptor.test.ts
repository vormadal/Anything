import { renderHook, act } from "@testing-library/react";
import { useBackInterceptor } from "./useBackInterceptor";

jest.mock("sonner", () => {
  const toastFn = Object.assign(jest.fn().mockReturnValue("mock-toast-id"), {
    dismiss: jest.fn(),
  });
  return { toast: toastFn };
});

import { toast } from "sonner";

const mockToast = toast as unknown as jest.Mock;
const mockDismiss = (toast as unknown as { dismiss: jest.Mock }).dismiss;

describe("useBackInterceptor", () => {
  let pushStateSpy: jest.SpyInstance;
  let popstateHandlers: EventListener[];

  beforeEach(() => {
    jest.useFakeTimers();
    pushStateSpy = jest.spyOn(window.history, "pushState").mockImplementation(() => {});
    popstateHandlers = [];

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
  });

  const firePopState = () => {
    act(() => {
      popstateHandlers.forEach((h) => h(new PopStateEvent("popstate")));
    });
  };

  it("pushes sentinel on mount", () => {
    renderHook(() =>
      useBackInterceptor({ leftAction: { type: "menu" } })
    );

    expect(pushStateSpy).toHaveBeenCalledWith({ appSentinel: true }, "");
  });

  it("calls the first active handler and re-pushes sentinel", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({
        handlers: [{ isActive: true, onBack }],
        leftAction: { type: "menu" },
      })
    );

    pushStateSpy.mockClear();
    firePopState();

    expect(onBack).toHaveBeenCalled();
    expect(pushStateSpy).toHaveBeenCalledWith({ appSentinel: true }, "");
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
        leftAction: { type: "menu" },
      })
    );

    firePopState();

    expect(onBack1).not.toHaveBeenCalled();
    expect(onBack2).toHaveBeenCalled();
  });

  it("does nothing when leftAction is back (lets Next.js handle navigation)", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useBackInterceptor({
        handlers: [{ isActive: false, onBack }],
        leftAction: { type: "back", href: "/recipes" },
      })
    );

    pushStateSpy.mockClear();
    firePopState();

    expect(onBack).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("shows exit toast and re-pushes sentinel on first back press at root", () => {
    renderHook(() =>
      useBackInterceptor({ leftAction: { type: "menu" } })
    );

    pushStateSpy.mockClear();
    firePopState();

    expect(mockToast).toHaveBeenCalledWith("Press back again to exit", { duration: 2000 });
    expect(pushStateSpy).toHaveBeenCalledWith({ appSentinel: true }, "");
  });

  it("allows exit on second back press within 2s (does not re-push sentinel, dismisses toast)", () => {
    renderHook(() =>
      useBackInterceptor({ leftAction: { type: "menu" } })
    );

    firePopState(); // first press
    pushStateSpy.mockClear();
    mockToast.mockClear();

    firePopState(); // second press within 2s

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockDismiss).toHaveBeenCalledWith("mock-toast-id");
  });

  it("treats back as first press again after 2s timeout expires", () => {
    renderHook(() =>
      useBackInterceptor({ leftAction: { type: "menu" } })
    );

    firePopState(); // first press
    mockToast.mockClear();
    pushStateSpy.mockClear();

    act(() => {
      jest.advanceTimersByTime(2001);
    });

    firePopState(); // back after timeout — treated as first press again

    expect(mockToast).toHaveBeenCalledWith("Press back again to exit", { duration: 2000 });
    expect(pushStateSpy).toHaveBeenCalledWith({ appSentinel: true }, "");
  });

  it("removes popstate listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      useBackInterceptor({ leftAction: { type: "menu" } })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("popstate", expect.any(Function));
  });
});
