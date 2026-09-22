import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppLayout } from "@/components/AppLayout";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => "/",
}));

jest.mock("@/hooks/useAuth", () => ({
  useIsAuthenticated: () => true,
  useCurrentUser: () => ({ data: { name: "Ada", email: "ada@example.com", role: "User" } }),
  useLogout: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/useOfflineSync", () => ({ useOfflineSync: () => {} }));
jest.mock("@/hooks/useSmartBack", () => ({ useSmartBack: () => ({ navigateBack: jest.fn() }) }));
jest.mock("@/hooks/useOnboardingTour", () => ({
  useOnboardingTour: () => ({
    open: false,
    setOpen: jest.fn(),
    startTour: jest.fn(),
    steps: [],
    topics: [],
    initialView: "tour",
  }),
}));
jest.mock("@/components/OfflineBanner", () => ({ OfflineBanner: () => null }));
jest.mock("@/components/CookingModeDrawer", () => ({ CookingModeDrawer: () => null }));

const mockUnreadCount = jest.fn();
jest.mock("@/hooks/useNotifications", () => ({
  useUnreadNotificationCount: () => mockUnreadCount(),
}));

// The unread count used to live on a bell of its own in the global header,
// which put a notification affordance on every page. It now rides the burger
// button and the drawer's Notifications entry instead — these tests pin both
// placements, and the absence of the old header control.
describe("AppLayout notification badge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnreadCount.mockReturnValue({ data: 0 });
  });

  it("has no notification control of its own in the header", () => {
    render(<AppLayout>content</AppLayout>);
    expect(screen.queryByRole("link", { name: /notifications/i })).not.toBeInTheDocument();
  });

  it("shows no badge on the burger when nothing is unread", () => {
    render(<AppLayout>content</AppLayout>);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("badges the burger with the unread count", () => {
    mockUnreadCount.mockReturnValue({ data: 4 });
    render(<AppLayout>content</AppLayout>);
    const menu = screen.getByRole("button", { name: "Open menu, 4 unread notifications" });
    expect(menu).toHaveTextContent("4");
  });

  it("badges the drawer's Notifications entry too", async () => {
    const user = userEvent.setup();
    mockUnreadCount.mockReturnValue({ data: 4 });
    render(<AppLayout>content</AppLayout>);

    await user.click(screen.getByRole("button", { name: /Open menu/ }));

    const entry = await screen.findByRole("button", { name: "Notifications, 4 unread" });
    expect(entry).toHaveTextContent("4");
  });

  it("leaves the drawer entry unbadged when the inbox is clear", async () => {
    const user = userEvent.setup();
    render(<AppLayout>content</AppLayout>);

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("stays unbadged when the count request fails", () => {
    mockUnreadCount.mockReturnValue({ data: undefined });
    render(<AppLayout>content</AppLayout>);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});
