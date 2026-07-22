import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import HouseholdSearchIndexPage from "./page";
import { toast } from "sonner";

const mockOverviewGet = jest.fn();
const mockRebuildHouseholdPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  HOUSEHOLD_HEADER: "X-Household-Id",
  apiClient: {
    api: {
      search: {
        overview: { get: (...args: unknown[]) => mockOverviewGet(...args) },
        rebuildIndex: {
          household: { post: (...args: unknown[]) => mockRebuildHouseholdPost(...args) },
        },
      },
    },
  },
}));

// The route [id] (2) intentionally differs from the active household (1, from the
// HouseholdContext mock below) so tests prove the calls are scoped to the URL, not
// the globally-active household.
const ROUTE_HOUSEHOLD_ID = "2";
const EXPECTED_SCOPED_CONFIG = { headers: { "X-Household-Id": ROUTE_HOUSEHOLD_ID } };

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: "2" }),
  usePathname: () => "/households/2/search",
}));

const mockGetHouseholdRole = jest.fn();
jest.mock("@/context/HouseholdContext", () => ({
  useHouseholdContext: () => ({
    getHouseholdRole: mockGetHouseholdRole,
    isLoading: false,
    households: [],
    selectedHouseholdId: 1,
    setSelectedHouseholdId: jest.fn(),
    currentHouseholdRole: undefined,
  }),
}));

const adminUser = JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" });
const regularUser = JSON.stringify({ email: "user@test.com", name: "User", role: "User" });

describe("HouseholdSearchIndexPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockOverviewGet.mockResolvedValue({ totalDocuments: 0, byType: [], lastIndexedOn: null });
    mockGetHouseholdRole.mockReturnValue("Owner");
  });

  describe("Rebuild", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("shows a success toast with the indexed count", async () => {
      const user = userEvent.setup();
      mockRebuildHouseholdPost.mockResolvedValueOnce({ indexed: 7 });

      renderWithClient(<HouseholdSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Rebuild/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Rebuild/ }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Rebuilt search index for 7 items.");
      });
      // The rebuild must target the household in the route, not the active one.
      expect(mockRebuildHouseholdPost).toHaveBeenCalledWith(EXPECTED_SCOPED_CONFIG);
    });

    it("shows an error toast when the rebuild fails", async () => {
      const user = userEvent.setup();
      mockRebuildHouseholdPost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<HouseholdSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Rebuild/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Rebuild/ }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to rebuild the search index.");
      });
    });
  });

  describe("Access Control", () => {
    it("redirects non-manager users", async () => {
      localStorage.setItem("user", regularUser);
      localStorage.setItem("accessToken", "test-token");
      mockGetHouseholdRole.mockReturnValue("Member");

      renderWithClient(<HouseholdSearchIndexPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("renders page for manager users", async () => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<HouseholdSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByText("Search Index")).toBeInTheDocument();
      });
    });
  });

  describe("Overview content", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("shows an empty state when nothing is indexed", async () => {
      renderWithClient(<HouseholdSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByText("Nothing indexed yet.")).toBeInTheDocument();
      });
    });

    it("shows counts by entity type and the total", async () => {
      mockOverviewGet.mockResolvedValue({
        totalDocuments: 5,
        byType: [
          { entityType: "Recipe", count: 3 },
          { entityType: "ShoppingList", count: 2 },
        ],
        lastIndexedOn: new Date("2026-03-10T12:00:00Z"),
      });

      renderWithClient(<HouseholdSearchIndexPage />);

      await waitFor(() => {
        expect(screen.getByText("Recipe")).toBeInTheDocument();
      });
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("ShoppingList")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      // The overview must be fetched for the household in the route, not the active one.
      expect(mockOverviewGet).toHaveBeenCalledWith(EXPECTED_SCOPED_CONFIG);
    });
  });
});
