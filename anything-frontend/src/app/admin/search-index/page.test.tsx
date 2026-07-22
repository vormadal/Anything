import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import AdminSearchIndexPage from "./page";
import { toast } from "sonner";

const mockRebuildIndexPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      search: {
        rebuildIndex: {
          post: (...args: unknown[]) => mockRebuildIndexPost(...args),
        },
      },
    },
  },
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/admin/search-index",
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

function loginAs(role: string) {
  localStorage.setItem("user", JSON.stringify({ email: "user@test.com", name: "User", role }));
  localStorage.setItem("accessToken", "test-token");
}

describe("AdminSearchIndexPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("Access Control", () => {
    it("should render the rebuild button for admin users", async () => {
      loginAs("Admin");

      renderWithClient(<AdminSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Rebuild Search Index/ })).toBeInTheDocument();
      });
    });

    it("should show access denied for non-admin users", async () => {
      loginAs("User");

      renderWithClient(<AdminSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
      expect(screen.queryByRole("button", { name: /Rebuild Search Index/ })).not.toBeInTheDocument();
    });

    it("should navigate to home when clicking 'Go to Home' as non-admin", async () => {
      const user = userEvent.setup();
      loginAs("User");

      renderWithClient(<AdminSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Go to Home" }));
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  describe("Rebuilding the index", () => {
    beforeEach(() => {
      loginAs("Admin");
    });

    it("should show a success toast with the indexed count", async () => {
      const user = userEvent.setup();
      mockRebuildIndexPost.mockResolvedValueOnce({ indexed: 42 });

      renderWithClient(<AdminSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Rebuild Search Index/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Rebuild Search Index/ }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Rebuilt search index for 42 items.");
      });
    });

    it("should show an error toast when the rebuild fails", async () => {
      const user = userEvent.setup();
      mockRebuildIndexPost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<AdminSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Rebuild Search Index/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Rebuild Search Index/ }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to rebuild the search index.");
      });
    });

    it("should show a loading state while rebuilding", async () => {
      const user = userEvent.setup();
      mockRebuildIndexPost.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ indexed: 1 }), 100))
      );

      renderWithClient(<AdminSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Rebuild Search Index/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Rebuild Search Index/ }));

      expect(screen.getByRole("button", { name: /Rebuilding/ })).toBeDisabled();
    });
  });

  describe("offline", () => {
    function setOnline(value: boolean) {
      Object.defineProperty(navigator, "onLine", { configurable: true, value });
    }

    afterEach(() => {
      setOnline(true);
    });

    it("disables the rebuild button while offline", async () => {
      loginAs("Admin");
      setOnline(false);

      renderWithClient(<AdminSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Rebuild Search Index/ })).toBeDisabled();
      });
    });
  });
});
