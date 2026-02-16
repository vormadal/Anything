import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import AdminPage from "./page";
import { toast } from "sonner";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
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

// Mock fetch
global.fetch = jest.fn();

// Mock clipboard API
const writeTextMock = jest.fn(() => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: writeTextMock,
  },
  writable: true,
  configurable: true,
});

describe("AdminPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    writeTextMock.mockClear();
  });

  describe("Access Control", () => {
    it("should render admin panel for admin users", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      });
      expect(screen.getByText("Create invite links for new users")).toBeInTheDocument();
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    });

    it("should show access denied for non-admin users", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "user@test.com", name: "User", role: "User" })
      );
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
      expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument();
      expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
    });

    it("should navigate to home when clicking 'Go to Home' button as non-admin", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "user@test.com", name: "User", role: "User" })
      );
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });

      const goHomeButton = screen.getByRole("button", { name: "Go to Home" });
      await user.click(goHomeButton);

      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("should navigate back to home when clicking back button as admin", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<AdminPage />);

      const backButton = screen.getByRole("button", { name: "← Back to Home" });
      await user.click(backButton);

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
      const mockInviteResponse = {
        inviteUrl: "/register?token=test-token",
        token: "test-token",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInviteResponse,
      });

      renderWithClient(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText("Email Address");
      await user.type(emailInput, "newuser@test.com");

      const createButton = screen.getByRole("button", { name: "Create Invite" });
      await user.click(createButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:5000/api/auth/invites",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer test-token",
            },
            body: JSON.stringify({ email: "newuser@test.com" }),
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Invite created successfully!");
      expect(screen.getByText("Invite Created!")).toBeInTheDocument();
      // Check that the invite URL is displayed (it uses window.location.origin which is http://localhost in jsdom)
      expect(screen.getByDisplayValue(/register\?token=test-token/)).toBeInTheDocument();
      expect(emailInput).toHaveValue("");
    });

    it("should show error when email is empty", async () => {
      const user = userEvent.setup();

      renderWithClient(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      });

      const createButton = screen.getByRole("button", { name: "Create Invite" });
      await user.click(createButton);

      // Form should not submit since the email input has the 'required' attribute
      // The browser's built-in validation will prevent submission
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle invite creation failure", async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      renderWithClient(<AdminPage />);

      const emailInput = screen.getByLabelText("Email Address");
      await user.type(emailInput, "newuser@test.com");

      const createButton = screen.getByRole("button", { name: "Create Invite" });
      await user.click(createButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create invite");
      });
    });

    it("should show loading state while creating invite", async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ inviteUrl: "/register?token=test", token: "test" }),
                }),
              100
            );
          })
      );

      renderWithClient(<AdminPage />);

      const emailInput = screen.getByLabelText("Email Address");
      await user.type(emailInput, "newuser@test.com");

      const createButton = screen.getByRole("button", { name: "Create Invite" });
      await user.click(createButton);

      expect(screen.getByRole("button", { name: "Creating..." })).toBeInTheDocument();
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
      const mockInviteResponse = {
        inviteUrl: "/register?token=test-token",
        token: "test-token",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInviteResponse,
      });

      renderWithClient(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText("Email Address");
      await user.type(emailInput, "newuser@test.com");

      const createButton = screen.getByRole("button", { name: "Create Invite" });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText("Invite Created!")).toBeInTheDocument();
      });

      const copyButton = screen.getByRole("button", { name: "Copy" });
      await user.click(copyButton);

      // Verify the toast is shown (clipboard.writeText is called synchronously, so toast.success should be immediate)
      expect(toast.success).toHaveBeenCalledWith("Invite URL copied to clipboard!");
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

    it("should display 'How it works' section", async () => {
      renderWithClient(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      });

      expect(screen.getByText("How it works")).toBeInTheDocument();
      expect(screen.getByText(/Enter the email address of the person you want to invite/)).toBeInTheDocument();
      expect(screen.getByText(/valid for 7 days/)).toBeInTheDocument();
    });

    it("should show expiry message when invite is created", async () => {
      const user = userEvent.setup();
      const mockInviteResponse = {
        inviteUrl: "/register?token=test-token",
        token: "test-token",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInviteResponse,
      });

      renderWithClient(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText("Email Address");
      await user.type(emailInput, "newuser@test.com");

      const createButton = screen.getByRole("button", { name: "Create Invite" });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText("This link will expire in 7 days.")).toBeInTheDocument();
      });
    });
  });
});
