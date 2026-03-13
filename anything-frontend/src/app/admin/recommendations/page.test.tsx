import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import AdminRecommendationsPage from "./page";
import { toast } from "sonner";

// Mock the apiClient module
const mockPendingGet = jest.fn();
const mockAllGet = jest.fn();
const mockApprovePost = jest.fn();
const mockDeleteFn = jest.fn();
const mockUpdatePut = jest.fn();
const mockCreatePost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      shoppingListRecommendations: {
        pending: { get: (...args: unknown[]) => mockPendingGet(...args) },
        all: { get: (...args: unknown[]) => mockAllGet(...args) },
        get: jest.fn().mockResolvedValue([]),
        post: (...args: unknown[]) => mockCreatePost(...args),
        byId: (id: number) => ({
          approve: { post: (...args: unknown[]) => mockApprovePost(id, ...args) },
          delete: (...args: unknown[]) => mockDeleteFn(id, ...args),
          put: (...args: unknown[]) => mockUpdatePut(id, ...args),
        }),
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
    back: jest.fn(),
  }),
  usePathname: () => '/admin/recommendations',
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

describe("AdminRecommendationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("Access Control", () => {
    it("should show recommendations for admin users", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
      mockPendingGet.mockResolvedValueOnce([]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(
          screen.getByText("No pending recommendations.")
        ).toBeInTheDocument();
      });
    });

    it("should show access denied for non-admin users", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "user@test.com", name: "User", role: "User" })
      );
      localStorage.setItem("accessToken", "test-token");
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
      expect(
        screen.getByText("You don't have permission to access this page.")
      ).toBeInTheDocument();
    });

    it("should navigate to home when clicking 'Go to Home' as non-admin", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "user@test.com", name: "User", role: "User" })
      );
      localStorage.setItem("accessToken", "test-token");
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Go to Home" }));
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  describe("Empty State", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should display empty state when no pending recommendations", async () => {
      mockPendingGet.mockResolvedValueOnce([]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(
          screen.getByText("No pending recommendations.")
        ).toBeInTheDocument();
      });
    });

    it("should filter out recommendations with missing id or name", async () => {
      mockPendingGet.mockResolvedValueOnce([
        { id: null, name: "invalid item" },
        { id: 1, name: null },
        { id: 2, name: "valid item" },
      ]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("valid item")).toBeInTheDocument();
      });
      expect(screen.queryByText("invalid item")).not.toBeInTheDocument();
    });
  });

  describe("Approve Recommendation", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should approve a recommendation successfully", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([{ id: 1, name: "Apple" }]);
      mockAllGet.mockResolvedValue([]);
      mockApprovePost.mockResolvedValueOnce({});

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Approve" }));

      await waitFor(() => {
        expect(mockApprovePost).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith("Approved!");
      });
    });

    it("should show error toast when approval fails", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([{ id: 1, name: "Apple" }]);
      mockAllGet.mockResolvedValue([]);
      mockApprovePost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Approve" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to approve recommendation."
        );
      });
    });
  });

  describe("Reject Recommendation", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should reject a recommendation successfully", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([{ id: 2, name: "Banana" }]);
      mockAllGet.mockResolvedValue([]);
      mockDeleteFn.mockResolvedValueOnce({});

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Banana")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Reject" }));

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith(2);
        expect(toast.success).toHaveBeenCalledWith("Rejected.");
      });
    });

    it("should show error toast when rejection fails", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([{ id: 2, name: "Banana" }]);
      mockAllGet.mockResolvedValue([]);
      mockDeleteFn.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Banana")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Reject" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to reject recommendation."
        );
      });
    });
  });

  describe("All Recommendations Tab", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should show all recommendations when clicking All tab", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([
        { id: 2, name: "Bread", isApproved: true },
        { id: 3, name: "Cheese", isApproved: false },
        { id: 1, name: "Milk", isApproved: true },
      ]);

      renderWithClient(<AdminRecommendationsPage />);

      await user.click(screen.getByRole("button", { name: /^All/ }));

      await waitFor(() => {
        expect(screen.getByText("Bread")).toBeInTheDocument();
        expect(screen.getByText("Cheese")).toBeInTheDocument();
        expect(screen.getByText("Milk")).toBeInTheDocument();
      });
    });

    it("should show approved/pending status badges in all tab", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Apple", isApproved: true },
        { id: 2, name: "Banana", isApproved: false },
      ]);

      renderWithClient(<AdminRecommendationsPage />);

      await user.click(screen.getByRole("button", { name: /^All/ }));

      await waitFor(() => {
        expect(screen.getByText("Approved")).toBeInTheDocument();
        // "Pending" appears as both a tab button and a status badge
        expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(2);
      });
    });

    it("should show empty state when no recommendations exist", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await user.click(screen.getByRole("button", { name: /^All/ }));

      await waitFor(() => {
        expect(screen.getByText("No recommendations yet.")).toBeInTheDocument();
      });
    });

    it("should show a Remove button for each recommendation in the All tab", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Apple", isApproved: true },
        { id: 2, name: "Banana", isApproved: false },
      ]);

      renderWithClient(<AdminRecommendationsPage />);

      await user.click(screen.getByRole("button", { name: /^All/ }));

      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(
          2
        );
      });
    });

    it("should remove a recommendation successfully from the All tab", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([{ id: 3, name: "Carrot", isApproved: true }]);
      mockDeleteFn.mockResolvedValueOnce({});

      renderWithClient(<AdminRecommendationsPage />);

      await user.click(screen.getByRole("button", { name: /^All/ }));

      await waitFor(() => {
        expect(screen.getByText("Carrot")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Remove" }));

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith(3);
        expect(toast.success).toHaveBeenCalledWith("Removed.");
      });
    });

    it("should show error toast when removal fails in the All tab", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([{ id: 3, name: "Carrot", isApproved: true }]);
      mockDeleteFn.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<AdminRecommendationsPage />);

      await user.click(screen.getByRole("button", { name: /^All/ }));

      await waitFor(() => {
        expect(screen.getByText("Carrot")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Remove" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to remove recommendation."
        );
      });
    });
  });

  describe("Search", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should filter pending recommendations by search query", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([
        { id: 1, name: "Apple" },
        { id: 2, name: "Banana" },
        { id: 3, name: "Apricot" },
      ]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
      });

      await user.type(screen.getByRole("textbox", { name: "Search recommendations" }), "ap");

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.getByText("Apricot")).toBeInTheDocument();
        expect(screen.queryByText("Banana")).not.toBeInTheDocument();
      });
    });

    it("should show empty state message when search yields no results", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([{ id: 1, name: "Apple" }]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
      });

      await user.type(screen.getByRole("textbox", { name: "Search recommendations" }), "xyz");

      await waitFor(() => {
        expect(
          screen.getByText("No recommendations match your search.")
        ).toBeInTheDocument();
      });
    });

    it("should reset search when switching tabs", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([
        { id: 1, name: "Apple" },
        { id: 2, name: "Banana" },
      ]);
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Apple", isApproved: true },
        { id: 2, name: "Banana", isApproved: true },
      ]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
      });

      await user.type(screen.getByRole("textbox", { name: "Search recommendations" }), "app");

      await waitFor(() => {
        expect(screen.queryByText("Banana")).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^All/ }));

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.getByText("Banana")).toBeInTheDocument();
      });
    });
  });

  describe("Create Recommendation", () => {
    beforeEach(() => {
      localStorage.setItem(
        "user",
        JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" })
      );
      localStorage.setItem("accessToken", "test-token");
    });

    it("should show create form when clicking New button", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create recommendation" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create recommendation" }));

      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Preferred unit (optional)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save new recommendation" })).toBeInTheDocument();
    });

    it("should create a recommendation successfully", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([]);
      mockCreatePost.mockResolvedValueOnce({ id: 10, name: "Milk", isApproved: true });

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create recommendation" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create recommendation" }));
      await user.type(screen.getByPlaceholderText("Name"), "Milk");
      await user.click(screen.getByRole("button", { name: "Save new recommendation" }));

      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledWith({ name: "Milk", preferredUnit: null });
        expect(toast.success).toHaveBeenCalledWith("Recommendation created.");
      });
    });

    it("should show error toast when create fails", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([]);
      mockCreatePost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create recommendation" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create recommendation" }));
      await user.type(screen.getByPlaceholderText("Name"), "Milk");
      await user.click(screen.getByRole("button", { name: "Save new recommendation" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create recommendation.");
      });
    });

    it("should hide create form when clicking Cancel", async () => {
      const user = userEvent.setup();
      mockPendingGet.mockResolvedValue([]);
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<AdminRecommendationsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create recommendation" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create recommendation" }));

      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument();
    });
  });
});
