import { screen, waitFor } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { NotificationBell } from "@/components/NotificationBell";

// renderWithClient mounts a LeftActionSlot that calls useSmartBack, which needs
// the app router — hence the navigation mock even though the bell is a Link.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
}));

const mockUnreadCountGet = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notifications: {
        unreadCount: { get: () => mockUnreadCountGet() },
      },
    },
  },
}));

describe("NotificationBell", () => {
  beforeEach(() => jest.clearAllMocks());

  it("links to the inbox", async () => {
    mockUnreadCountGet.mockResolvedValue({ count: 0 });

    renderWithClient(<NotificationBell />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute(
        "href",
        "/notifications"
      )
    );
  });

  it("shows no badge when nothing is unread", async () => {
    mockUnreadCountGet.mockResolvedValue({ count: 0 });

    renderWithClient(<NotificationBell />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Notifications" })).toBeInTheDocument()
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("puts the unread count in the badge and the accessible name", async () => {
    mockUnreadCountGet.mockResolvedValue({ count: 3 });

    renderWithClient(<NotificationBell />);

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Notifications, 3 unread" })
      ).toBeInTheDocument()
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("caps the badge at 99+ so a large count can't stretch the header", async () => {
    mockUnreadCountGet.mockResolvedValue({ count: 250 });

    renderWithClient(<NotificationBell />);

    await waitFor(() => expect(screen.getByText("99+")).toBeInTheDocument());
    // The real number is still announced — only the badge is abbreviated.
    expect(
      screen.getByRole("link", { name: "Notifications, 250 unread" })
    ).toBeInTheDocument();
  });

  it("renders without a badge when the count request fails", async () => {
    mockUnreadCountGet.mockRejectedValue(new Error("boom"));

    renderWithClient(<NotificationBell />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Notifications" })).toBeInTheDocument()
    );
  });
});
