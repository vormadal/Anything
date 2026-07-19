import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import AdminInvitePage from "./page";
import { toast } from "sonner";

// Mock the apiClient module
const mockInvitesPost = jest.fn();
const mockInvitesGet = jest.fn();
const mockInviteDelete = jest.fn();
const mockHouseholdsGet = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      auth: {
        invites: {
          post: (...args: unknown[]) => mockInvitesPost(...args),
          get: (...args: unknown[]) => mockInvitesGet(...args),
          byId: (id: number) => ({ delete: (...args: unknown[]) => mockInviteDelete(id, ...args) }),
        },
      },
    },
  },
}));

jest.mock("@/hooks/useHouseholds", () => ({
  useHouseholds: () => ({ data: mockHouseholdsGet(), isLoading: false }),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/admin/invite',
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock clipboard API
const writeTextMock = jest.fn(() => Promise.resolve());
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: writeTextMock },
  writable: true,
  configurable: true,
});

describe("AdminInvitePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    writeTextMock.mockClear();
    mockInvitesGet.mockResolvedValue([]);
    mockHouseholdsGet.mockReturnValue([]);
  });

  describe("Access Control", () => {
    it("should render invite form for admin users", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: "Create Link" })).toBeInTheDocument();
    });

    it("should show access denied for non-admin users", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "user@test.com", name: "User", role: "User" })
      );
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
      expect(
        screen.getByText("You don't have permission to access this page.")
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Email Address")).not.toBeInTheDocument();
    });

    it("should navigate to home when clicking 'Go to Home' as non-admin", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "user@test.com", name: "User", role: "User" })
      );
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Go to Home" }));
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  describe("Invite Creation", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should create invite successfully", async () => {
      const user = userEvent.setup();
      mockInvitesPost.mockResolvedValueOnce({
        inviteUrl: "/register?token=test-token",
        token: "test-token",
      });

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText("Email Address");
      await user.type(emailInput, "newuser@test.com");

      await user.click(screen.getByRole("button", { name: "Create Link" }));

      await waitFor(() => {
        expect(mockInvitesPost).toHaveBeenCalledWith({ email: "newuser@test.com", householdId: null });
      });

      expect(screen.getByDisplayValue(/register\?token=test-token/)).toBeInTheDocument();
      expect(emailInput).toHaveValue("");
    });

    it("should show error when inviteUrl is missing from response", async () => {
      const user = userEvent.setup();
      mockInvitesPost.mockResolvedValueOnce({});

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email Address"), "newuser@test.com");
      await user.click(screen.getByRole("button", { name: "Create Link" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to get invite URL from server");
      });
    });

    it("should handle invite creation failure", async () => {
      const user = userEvent.setup();
      mockInvitesPost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email Address"), "newuser@test.com");
      await user.click(screen.getByRole("button", { name: "Create Link" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create invite");
      });
    });

    it("should show loading state while creating invite", async () => {
      const user = userEvent.setup();
      mockInvitesPost.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve({ inviteUrl: "/register?token=test", token: "test" }),
              100
            );
          })
      );

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email Address"), "newuser@test.com");
      await user.click(screen.getByRole("button", { name: "Create Link" }));

      expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    });
  });

  describe("Copy to Clipboard", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should copy invite URL to clipboard", async () => {
      const user = userEvent.setup();
      mockInvitesPost.mockResolvedValueOnce({
        inviteUrl: "/register?token=test-token",
        token: "test-token",
      });

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email Address"), "newuser@test.com");
      await user.click(screen.getByRole("button", { name: "Create Link" }));

      await waitFor(() => {
        expect(screen.getByDisplayValue(/register\?token=test-token/)).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Copy invite link" }));
      expect(toast.success).toHaveBeenCalledWith("Copied to clipboard!");
    });
  });

  describe("UI Elements", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should display expiry info when invite is created", async () => {
      const user = userEvent.setup();
      mockInvitesPost.mockResolvedValueOnce({
        inviteUrl: "/register?token=test-token",
        token: "test-token",
      });

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email Address"), "newuser@test.com");
      await user.click(screen.getByRole("button", { name: "Create Link" }));

      await waitFor(() => {
        expect(screen.getByText(/Expires in 7 days/)).toBeInTheDocument();
      });
    });
  });

  describe("Invite List", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should show 'No invites found' when list is empty", async () => {
      mockInvitesGet.mockResolvedValueOnce([]);

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("No invites found.")).toBeInTheDocument();
      });
    });

    it("should display invite list with statuses", async () => {
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const past = new Date(Date.now() - 1000);
      mockInvitesGet.mockResolvedValueOnce([
        { id: 1, email: "pending@test.com", expiresAt: future, createdOn: new Date(), isUsed: false, isExpired: false },
        { id: 2, email: "accepted@test.com", expiresAt: future, createdOn: new Date(), isUsed: true, isExpired: false },
        { id: 3, email: "expired@test.com", expiresAt: past, createdOn: new Date(), isUsed: false, isExpired: true },
      ]);

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("pending@test.com")).toBeInTheDocument();
      });
      expect(screen.getByText("accepted@test.com")).toBeInTheDocument();
      expect(screen.getByText("expired@test.com")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Accepted")).toBeInTheDocument();
      expect(screen.getByText("Expired")).toBeInTheDocument();
    });

    it("should delete invite when delete button is clicked", async () => {
      const user = userEvent.setup();
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      mockInvitesGet.mockResolvedValue([
        { id: 42, email: "todelete@test.com", expiresAt: future, createdOn: new Date(), isUsed: false, isExpired: false },
      ]);
      mockInviteDelete.mockResolvedValueOnce(undefined);

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("todelete@test.com")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Delete invite for todelete@test.com" }));

      await waitFor(() => {
        expect(mockInviteDelete).toHaveBeenCalledWith(42);
      });
    });
  });

  describe("offline", () => {
    function setOnline(value: boolean) {
      Object.defineProperty(navigator, "onLine", { configurable: true, value });
    }

    afterEach(() => {
      setOnline(true);
    });

    it("disables creating and deleting invites while offline", async () => {
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      mockInvitesGet.mockResolvedValue([
        { id: 42, email: "todelete@test.com", expiresAt: future, createdOn: new Date(), isUsed: false, isExpired: false },
      ]);
      setOnline(false);

      renderWithClient(<AdminInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("todelete@test.com")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: "Create Link" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete invite for todelete@test.com" })).toBeDisabled();
    });
  });
});
