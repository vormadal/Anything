import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RecipeTagsPage from "./page";

const mockCatalogGet = jest.fn();
const mockExportGet = jest.fn();
const mockImportPost = jest.fn();
const mockByName = jest.fn(() => ({
  put: jest.fn(),
  delete: jest.fn(),
}));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      recipes: {
        tags: {
          catalog: { get: (...args: unknown[]) => mockCatalogGet(...args) },
          byName: () => mockByName(),
          exportEscaped: { get: (...args: unknown[]) => mockExportGet(...args) },
          importEscaped: { post: (...args: unknown[]) => mockImportPost(...args) },
        },
      },
    },
  },
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockTab: string | null = null;
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/households/1/recipes/tags",
  useSearchParams: () => new URLSearchParams(mockTab ? `tab=${mockTab}` : ""),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
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

describe("RecipeTagsPage (household config)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockTab = null;
    mockCatalogGet.mockResolvedValue([]);
    // Default: current user is a household manager (Owner).
    mockGetHouseholdRole.mockReturnValue("Owner");
  });

  describe("Access Control", () => {
    it("redirects non-manager users", async () => {
      localStorage.setItem("user", regularUser);
      localStorage.setItem("accessToken", "test-token");
      mockGetHouseholdRole.mockReturnValue("Member");

      renderWithClient(<RecipeTagsPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("renders page for manager users", async () => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");

      renderWithClient(<RecipeTagsPage />);

      await waitFor(() => {
        expect(screen.getByText("No tags yet. Add tags to your recipes to see them here.")).toBeInTheDocument();
      });
    });
  });

  describe("Tabs", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("defaults to the Tags tab", async () => {
      renderWithClient(<RecipeTagsPage />);

      await waitFor(() =>
        expect(screen.getByText("No tags yet. Add tags to your recipes to see them here.")).toBeInTheDocument()
      );
      expect(screen.getByRole("tab", { name: /Tags/ })).toHaveAttribute("aria-selected", "true");
    });

    it("navigates to the Import & Export tab via a query param", async () => {
      const user = userEvent.setup();
      renderWithClient(<RecipeTagsPage />);

      await waitFor(() =>
        expect(screen.getByText("No tags yet. Add tags to your recipes to see them here.")).toBeInTheDocument()
      );
      await user.click(screen.getByRole("tab", { name: /Import & Export/ }));

      expect(mockReplace).toHaveBeenCalledWith(
        "/households/1/recipes/tags?tab=import-export",
        { scroll: false }
      );
    });

    it("renders the Import & Export tab body when tab=import-export", async () => {
      mockTab = "import-export";
      renderWithClient(<RecipeTagsPage />);

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Export recipe tags" })).toBeInTheDocument()
      );
      expect(screen.getByRole("button", { name: "Import recipe tags" })).toBeInTheDocument();
      expect(mockCatalogGet).not.toHaveBeenCalled();
    });

    it("renders the Tags tab body when tab=tags explicitly", async () => {
      mockTab = "tags";
      mockCatalogGet.mockResolvedValue([{ name: "dinner", count: 2 }]);
      renderWithClient(<RecipeTagsPage />);

      await waitFor(() => expect(screen.getByText(/dinner/)).toBeInTheDocument());
      expect(screen.getByRole("tab", { name: /Tags/ })).toHaveAttribute("aria-selected", "true");
    });
  });
});
