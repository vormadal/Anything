import { renderHook, act } from "@testing-library/react";
import { useOnboardingTour } from "./useOnboardingTour";
import { TOUR_SEEN_KEY, TOUR_VERSION } from "@/lib/tourSteps";

const mockUseIsAuthenticated = jest.fn();
const mockUseCurrentUser = jest.fn();
jest.mock("@/hooks/useAuth", () => ({
  useIsAuthenticated: () => mockUseIsAuthenticated(),
  useCurrentUser: () => mockUseCurrentUser(),
}));

const mockUseHouseholdContext = jest.fn();
jest.mock("@/context/HouseholdContext", () => ({
  useHouseholdContext: () => mockUseHouseholdContext(),
}));

function setState({
  authenticated = true,
  userRole = "User",
  households = [{ id: 1, name: "Home", role: "Member" }],
  isLoading = false,
  currentHouseholdRole = "Member",
} = {}) {
  mockUseIsAuthenticated.mockReturnValue(authenticated);
  mockUseCurrentUser.mockReturnValue({
    data: authenticated
      ? { email: "a@b.c", name: "Test", role: userRole }
      : undefined,
  });
  mockUseHouseholdContext.mockReturnValue({
    households,
    isLoading,
    currentHouseholdRole,
  });
}

describe("useOnboardingTour", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("auto-opens and marks the tour seen when the user has a household", () => {
    setState();
    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.open).toBe(true);
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe(TOUR_VERSION);
  });

  it("auto-open starts in the full tour steps view", () => {
    setState();
    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.open).toBe(true);
    expect(result.current.initialView).toBe("steps");
  });

  it("does not auto-open when the tour was already seen", () => {
    localStorage.setItem(TOUR_SEEN_KEY, TOUR_VERSION);
    setState();
    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.open).toBe(false);
  });

  it("does not auto-open without a household", () => {
    setState({ households: [], currentHouseholdRole: undefined });
    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.open).toBe(false);
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();
  });

  it("does not auto-open while households are loading", () => {
    setState({ households: [], isLoading: true });
    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.open).toBe(false);
  });

  it("does not auto-open when unauthenticated", () => {
    setState({ authenticated: false, households: [] });
    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.open).toBe(false);
  });

  it("auto-opens once households finish loading", () => {
    setState({ households: [], isLoading: true });
    const { result, rerender } = renderHook(() => useOnboardingTour());
    expect(result.current.open).toBe(false);

    setState();
    rerender();

    expect(result.current.open).toBe(true);
  });

  it("startTour opens the topic menu even when already seen", () => {
    localStorage.setItem(TOUR_SEEN_KEY, TOUR_VERSION);
    setState();
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.open).toBe(false);

    act(() => result.current.startTour());

    expect(result.current.open).toBe(true);
    expect(result.current.initialView).toBe("menu");
  });

  it("filters steps and topics by role", () => {
    setState();
    const member = renderHook(() => useOnboardingTour());
    const memberStepCount = member.result.current.steps.length;
    const memberTopicCount = member.result.current.topics.length;

    setState({ currentHouseholdRole: "Owner", userRole: "Admin" });
    const owner = renderHook(() => useOnboardingTour());

    expect(memberStepCount).toBe(6);
    expect(memberTopicCount).toBe(6);
    expect(owner.result.current.steps.length).toBeGreaterThan(memberStepCount);
    expect(owner.result.current.topics.length).toBe(7);
  });
});
