import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import NotificationsPage from "./page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notifications",
}));

let mockHouseholdRole: string | undefined;
jest.mock("@/context/HouseholdContext", () => ({
  useHouseholdContext: () => ({ currentHouseholdRole: mockHouseholdRole }),
}));

const mockGet = jest.fn();
const mockReadPut = jest.fn();
const mockReadAllPut = jest.fn();
const mockDelete = jest.fn();
const mockUnreadCountGet = jest.fn();
const mockPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notifications: {
        get: (...args: unknown[]) => mockGet(...args),
        post: (...args: unknown[]) => mockPost(...args),
        byId: (id: number) => ({
          read: { put: () => mockReadPut(id) },
          delete: () => mockDelete(id),
        }),
        readAll: { put: () => mockReadAllPut() },
        unreadCount: { get: () => mockUnreadCountGet() },
      },
    },
  },
}));

const unread = {
  id: 1,
  category: "announcement",
  title: "Bin day moved",
  body: "Thursday this week.",
  linkUrl: null,
  createdOn: new Date("2026-09-15T09:00:00Z"),
  readOn: null,
};

const read = {
  id: 2,
  category: "householdmember",
  title: "Sam joined the household",
  body: null,
  linkUrl: "/households/4",
  createdOn: new Date("2026-09-14T09:00:00Z"),
  readOn: new Date("2026-09-14T10:00:00Z"),
};

describe("NotificationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHouseholdRole = "Member";
    mockUnreadCountGet.mockResolvedValue({ count: 1 });
    mockReadPut.mockResolvedValue(undefined);
    mockReadAllPut.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
  });

  it("lists notifications with their bodies", async () => {
    mockGet.mockResolvedValue([unread, read]);

    renderWithClient(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText("Bin day moved")).toBeInTheDocument());
    expect(screen.getByText("Thursday this week.")).toBeInTheDocument();
    expect(screen.getByText("Sam joined the household")).toBeInTheDocument();
  });

  it("marks an unread notification read when opened", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue([unread]);

    renderWithClient(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText("Bin day moved")).toBeInTheDocument());
    await user.click(screen.getByText("Bin day moved"));

    await waitFor(() => expect(mockReadPut).toHaveBeenCalledWith(1));
  });

  it("navigates to a notification's link and does not re-mark an already-read one", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue([read]);

    renderWithClient(<NotificationsPage />);

    await waitFor(() =>
      expect(screen.getByText("Sam joined the household")).toBeInTheDocument()
    );
    await user.click(screen.getByText("Sam joined the household"));

    expect(mockPush).toHaveBeenCalledWith("/households/4");
    expect(mockReadPut).not.toHaveBeenCalled();
  });

  it("dismisses a notification", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue([unread]);

    renderWithClient(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText("Bin day moved")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Dismiss Bin day moved" }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(1));
  });

  it("offers mark-all-read only while something is unread", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue([unread]);

    renderWithClient(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText("Bin day moved")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /mark all read/i }));

    await waitFor(() => expect(mockReadAllPut).toHaveBeenCalled());
  });

  it("hides mark-all-read when everything is read", async () => {
    mockGet.mockResolvedValue([read]);

    renderWithClient(<NotificationsPage />);

    await waitFor(() =>
      expect(screen.getByText("Sam joined the household")).toBeInTheDocument()
    );
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    mockGet.mockResolvedValue([]);

    renderWithClient(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument());
  });

  it("shows an error state when the request fails", async () => {
    mockGet.mockRejectedValue(new Error("boom"));

    renderWithClient(<NotificationsPage />);

    await waitFor(() =>
      expect(screen.getByText(/Failed to load notifications/)).toBeInTheDocument()
    );
  });

  it("hides the send action from a plain member", async () => {
    mockGet.mockResolvedValue([]);
    mockHouseholdRole = "Member";

    renderWithClient(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument());
    expect(
      screen.queryByRole("button", { name: "Send an announcement" })
    ).not.toBeInTheDocument();
  });

  it("offers the send action to a household manager", async () => {
    mockGet.mockResolvedValue([]);
    mockHouseholdRole = "Admin";

    renderWithClient(<NotificationsPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Send an announcement" })
      ).toBeInTheDocument()
    );
  });
});
