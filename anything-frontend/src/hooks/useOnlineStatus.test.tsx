import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus, isOffline } from "@/hooks/useOnlineStatus";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("useOnlineStatus", () => {
  afterEach(() => {
    setOnline(true);
  });

  it("reflects the initial navigator.onLine value", () => {
    setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("updates when an offline event fires", () => {
    setOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });

  it("updates when an online event fires", () => {
    setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });
});

describe("isOffline", () => {
  afterEach(() => {
    setOnline(true);
  });

  it("returns true only when navigator.onLine is false", () => {
    setOnline(true);
    expect(isOffline()).toBe(false);

    setOnline(false);
    expect(isOffline()).toBe(true);
  });
});
