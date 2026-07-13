import { render, screen } from "@testing-library/react";
import { AuthGuard } from "@/components/AuthGuard";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

jest.mock("@/hooks/useAuth", () => ({
  useIsAuthenticated: () => true,
}));

jest.mock("@/hooks/useRealtimeSync", () => ({
  useRealtimeSync: () => {},
}));

const mockUseIsRestoring = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useIsRestoring: () => mockUseIsRestoring(),
}));

// The offline query cache restores from IndexedDB asynchronously (see
// QueryProvider's PersistQueryClientProvider); AuthGuard must hold its
// loading state until that finishes so children never mount against a
// not-yet-hydrated cache on a cold, offline app open.
describe("AuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the loading state while the offline cache is restoring", () => {
    mockUseIsRestoring.mockReturnValue(true);
    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders children once restoring has finished", () => {
    mockUseIsRestoring.mockReturnValue(false);
    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    );
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
