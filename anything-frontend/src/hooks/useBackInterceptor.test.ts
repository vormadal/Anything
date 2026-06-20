import { renderHook, act } from "@testing-library/react";
import { useBackInterceptor } from "./useBackInterceptor";

jest.mock("sonner", () => ({
  toast: jest.fn(),
}));

import { toast } from "sonner";

const mockToast = toast as jest.Mock;

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
      useBackInterceptor({
        drawerOpen: false,
        setDrawerOpen: jest.fn(),
        leftAction: { type: "menu" },
      })
    );

    expect(pushStateSpy).toHaveBeenCalledWith({ appSentinel: true }, "");
  });

  it("closes drawer and re-pushes sentinel when popstate fires with drawer open", () => {
    const setDrawerOpen = jest.fn();
    renderHook(() =>
      useBackInterceptor({
        drawerOpen: true,
        setDrawerOpen,
        leftAction: { type: "menu" },
      })
    );

    pushStateSpy.mockClear();
    firePopState();

    expect(setDrawerOpen).toHaveBeenCalledWith(false);
    expect(pushStateSpy).toHaveBeenCalledWith({ appSentinel: true }, "");
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("does nothing when leftAction is back (lets Next.js handle navigation)", () => {
    const setDrawerOpen = jest.fn();
    renderHook(() =>
      useBackInterceptor({
        drawerOpen: false,
        setDrawerOpen,
        leftAction: { type: "back", href: "/recipes" },
      })
    );

    pushStateSpy.mockClear();
    firePopState();

    expect(setDrawerOpen).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("shows exit toast and re-pushes sentinel on first back press at root", () => {
    renderHook(() =>
      useBackInterceptor({
        drawerOpen: false,
        setDrawerOpen: jest.fn(),
        leftAction: { type: "menu" },
      })
    );

    pushStateSpy.mockClear();
    firePopState();

    expect(mockToast).toHaveBeenCalledWith("Press back again to exit", { duration: 2000 });
    expect(pushStateSpy).toHaveBeenCalledWith({ appSentinel: true }, "");
  });

  it("allows exit on second back press within 2s (does not re-push sentinel)", () => {
    renderHook(() =>
      useBackInterceptor({
        drawerOpen: false,
        setDrawerOpen: jest.fn(),
        leftAction: { type: "menu" },
      })
    );

    pushStateSpy.mockClear();
    firePopState(); // first press
    pushStateSpy.mockClear();
    mockToast.mockClear();

    firePopState(); // second press within 2s

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("treats back as first press again after 2s timeout expires", () => {
    renderHook(() =>
      useBackInterceptor({
        drawerOpen: false,
        setDrawerOpen: jest.fn(),
        leftAction: { type: "menu" },
      })
    );

    firePopState(); // first press
    mockToast.mockClear();
    pushStateSpy.mockClear();

    act(() => {
      jest.advanceTimersByTime(2001);
    });

    firePopState(); // back after timeout — should be treated as first press again

    expect(mockToast).toHaveBeenCalledWith("Press back again to exit", { duration: 2000 });
    expect(pushStateSpy).toHaveBeenCalledWith({ appSentinel: true }, "");
  });

  it("removes popstate listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      useBackInterceptor({
        drawerOpen: false,
        setDrawerOpen: jest.fn(),
        leftAction: { type: "menu" },
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("popstate", expect.any(Function));
  });
});
