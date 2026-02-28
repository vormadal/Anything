import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import AdminInvitePage from "./page";
import { toast } from "sonner";

// Mock the apiClient module
const mockInvitesPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      auth: {
        invites: { post: (...args: unknown[]) => mockInvitesPost(...args) },
      },
    },
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
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
        expect(mockInvitesPost).toHaveBeenCalledWith({ email: "newuser@test.com" });
      });

      expect(toast.success).toHaveBeenCalledWith("Invite created!");
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
});
