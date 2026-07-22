import { screen, waitFor } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import HouseholdSearchIndexPage from "./page";

const mockOverviewGet = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      search: {
        overview: { get: (...args: unknown[]) => mockOverviewGet(...args) },
      },
    },
  },
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/households/1/search",
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
    });
  });
});
