import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import SuggestionsPage from "./page";
import { toast } from "sonner";

const mockAllGet = jest.fn();
const mockUncategorizedGet = jest.fn();
const mockCategoriesGet = jest.fn();
const mockDeleteFn = jest.fn();
const mockUpdatePut = jest.fn();
const mockCreatePost = jest.fn();
const mockExportGet = jest.fn();
const mockImportPost = jest.fn();
const mockItemById = jest.fn((id: number) => ({
  delete: (...args: unknown[]) => mockDeleteFn(id, ...args),
  put: (...args: unknown[]) => mockUpdatePut(id, ...args),
}));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      shoppingListRecommendations: {
        all: { get: (...args: unknown[]) => mockAllGet(...args) },
        uncategorized: { get: (...args: unknown[]) => mockUncategorizedGet(...args) },
        post: (...args: unknown[]) => mockCreatePost(...args),
        byId: (id: number) => mockItemById(id),
        exportEscaped: { get: (...args: unknown[]) => mockExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockImportPost(...args) },
      },
      suggestionCategories: {
        get: (...args: unknown[]) => mockCategoriesGet(...args),
      },
    },
  },
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/households/1/lists/suggestions",
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

describe("SuggestionsPage (household config)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockCategoriesGet.mockResolvedValue([]);
    mockUncategorizedGet.mockResolvedValue([]);
    // Default: current user is a household manager (Owner).
    mockGetHouseholdRole.mockReturnValue("Owner");
  });

  describe("Access Control", () => {
    it("redirects non-manager users", async () => {
      localStorage.setItem("user", regularUser);
      localStorage.setItem("accessToken", "test-token");
      mockAllGet.mockResolvedValue([]);
      mockGetHouseholdRole.mockReturnValue("Member");

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("renders page for manager users", async () => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("No suggestions yet.")).toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("shows empty message for All tab", async () => {
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("No suggestions yet.")).toBeInTheDocument();
      });
    });

    it("shows empty message for Uncategorized tab", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await user.click(screen.getByRole("button", { name: /Uncategorized/ }));

      await waitFor(() => {
        expect(screen.getByText("No uncategorized suggestions.")).toBeInTheDocument();
      });
    });
  });

  describe("Displaying Suggestions", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("shows suggestions in the All tab", async () => {
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Milk", preferredUnit: "L", categoryId: null },
        { id: 2, name: "Bread", preferredUnit: null, categoryId: 5 },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Milk")).toBeInTheDocument();
        expect(screen.getByText("Bread")).toBeInTheDocument();
      });
    });

    it("shows Uncategorized marker for items without category", async () => {
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Eggs", preferredUnit: null, categoryId: null },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByRole("img", { name: "Uncategorized" })).toBeInTheDocument();
      });
    });

    it("shows category name for categorized items", async () => {
      mockCategoriesGet.mockResolvedValue([{ id: 5, name: "Dairy", sortOrder: 0 }]);
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Yogurt", preferredUnit: null, categoryId: 5 },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Dairy")).toBeInTheDocument();
      });
    });

    it("shows uncategorized count badge on tab", async () => {
      mockAllGet.mockResolvedValue([]);
      mockUncategorizedGet.mockResolvedValue([
        { id: 1, name: "Uncateg1", categoryId: null },
        { id: 2, name: "Uncateg2", categoryId: null },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("hides uncategorized chip on uncategorized tab", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Eggs", preferredUnit: null, categoryId: null }]);
      mockUncategorizedGet.mockResolvedValue([{ id: 1, name: "Eggs", preferredUnit: null, categoryId: null }]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Eggs")).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Uncategorized" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Uncategorized/ }));

      await waitFor(() => {
        expect(screen.queryByRole("img", { name: "Uncategorized" })).not.toBeInTheDocument();
      });
    });
  });

  describe("Delete Suggestion", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("deletes a suggestion successfully", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Butter", categoryId: null }]);
      mockDeleteFn.mockResolvedValueOnce(undefined);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete suggestion" }));

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith("Suggestion deleted.");
      });
    });

    it("shows error toast when delete fails", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Butter", categoryId: null }]);
      mockDeleteFn.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete suggestion" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete suggestion.");
      });
    });
  });

  describe("Create Suggestion", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockAllGet.mockResolvedValue([]);
    });

    it("shows create form when clicking New", async () => {
      const user = userEvent.setup();
      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create suggestion" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create suggestion" }));

      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    });

    it("creates a suggestion successfully", async () => {
      const user = userEvent.setup();
      mockCreatePost.mockResolvedValueOnce({ id: 10, name: "Cheese" });

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create suggestion" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create suggestion" }));
      await user.type(screen.getByPlaceholderText("Name"), "Cheese");
      await user.click(screen.getByRole("button", { name: "Save new suggestion" }));

      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledWith({ name: "Cheese", preferredUnit: null });
        expect(toast.success).toHaveBeenCalledWith("Suggestion created.");
      });
    });

    it("shows error toast when create fails", async () => {
      const user = userEvent.setup();
      mockCreatePost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create suggestion" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create suggestion" }));
      await user.type(screen.getByPlaceholderText("Name"), "Cheese");
      await user.click(screen.getByRole("button", { name: "Save new suggestion" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create suggestion.");
      });
    });

    it("hides create form on Cancel", async () => {
      const user = userEvent.setup();
      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create suggestion" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create suggestion" }));
      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument();
    });
  });

  describe("Edit Suggestion", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("shows edit form when clicking edit button", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Tomato", preferredUnit: "kg", categoryId: null }]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit suggestion" }));

      expect(screen.getByDisplayValue("Tomato")).toBeInTheDocument();
    });

    it("saves edit successfully", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Tomato", preferredUnit: null, categoryId: null }]);
      mockUpdatePut.mockResolvedValueOnce(undefined);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit suggestion" }));

      const nameInput = screen.getByDisplayValue("Tomato");
      await user.clear(nameInput);
      await user.type(nameInput, "Cherry Tomato");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockUpdatePut).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Cherry Tomato" }));
        expect(toast.success).toHaveBeenCalledWith("Suggestion updated.");
      });
    });

    it("shows error toast when edit fails", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Tomato", preferredUnit: null, categoryId: null }]);
      mockUpdatePut.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit suggestion" }));
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update suggestion.");
      });
    });

    it("cancels edit without saving", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Tomato", preferredUnit: null, categoryId: null }]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit suggestion" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockUpdatePut).not.toHaveBeenCalled();
      expect(screen.getByText("Tomato")).toBeInTheDocument();
    });
  });

  describe("Search", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("filters suggestions by search query", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Apple", categoryId: null },
        { id: 2, name: "Banana", categoryId: null },
        { id: 3, name: "Apricot", categoryId: null },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      await user.type(screen.getByRole("textbox", { name: "Search suggestions" }), "ap");

      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.getByText("Apricot")).toBeInTheDocument();
        expect(screen.queryByText("Banana")).not.toBeInTheDocument();
      });
    });

    it("shows no-results message when search yields nothing", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Apple", categoryId: null }]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      await user.type(screen.getByRole("textbox", { name: "Search suggestions" }), "xyz");

      await waitFor(() => {
        expect(screen.getByText("No suggestions match your search.")).toBeInTheDocument();
      });
    });

    it("resets search on tab switch", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Apple", categoryId: null },
        { id: 2, name: "Banana", categoryId: null },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      await user.type(screen.getByRole("textbox", { name: "Search suggestions" }), "app");
      await waitFor(() => expect(screen.queryByText("Banana")).not.toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /Uncategorized/ }));
      await user.click(screen.getByRole("button", { name: "All" }));

      await waitFor(() => {
        expect(screen.getByText("Banana")).toBeInTheDocument();
      });
    });
  });

  describe("Export Suggestions", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockAllGet.mockResolvedValue([]);

      global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
      global.URL.revokeObjectURL = jest.fn();
      const originalCreateElement = document.createElement.bind(document);
      const mockClick = jest.fn();
      jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") {
          el.click = mockClick;
        }
        return el;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("exports suggestions successfully", async () => {
      const user = userEvent.setup();
      mockExportGet.mockResolvedValueOnce({ recommendations: [{ name: "Milk", preferredUnit: "L" }] });

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Export suggestions" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Export suggestions" }));
      await user.click(screen.getByRole("button", { name: "Export all" }));

      await waitFor(() => {
        expect(mockExportGet).toHaveBeenCalledWith({ queryParameters: { uncategorizedOnly: false } });
        expect(toast.success).toHaveBeenCalledWith("Suggestions exported.");
      });
    });

    it("exports uncategorized suggestions successfully", async () => {
      const user = userEvent.setup();
      mockExportGet.mockResolvedValueOnce({ recommendations: [{ name: "Milk", preferredUnit: "L" }] });

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Export suggestions" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Export suggestions" }));
      await user.click(screen.getByRole("button", { name: "Export uncategorized" }));

      await waitFor(() => {
        expect(mockExportGet).toHaveBeenCalledWith({ queryParameters: { uncategorizedOnly: true } });
        expect(toast.success).toHaveBeenCalledWith("Suggestions exported.");
      });
    });

    it("shows error toast when export fails", async () => {
      const user = userEvent.setup();
      mockExportGet.mockRejectedValueOnce(new Error("Export failed"));

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Export suggestions" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Export suggestions" }));
      await user.click(screen.getByRole("button", { name: "Export all" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to export suggestions.");
      });
    });
  });

  describe("Import Suggestions", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockAllGet.mockResolvedValue([]);
    });

    it("imports suggestions from a valid JSON file successfully", async () => {
      const user = userEvent.setup();
      mockImportPost.mockResolvedValueOnce(undefined);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import suggestions" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const fileContent = JSON.stringify({ recommendations: [{ name: "Milk", preferredUnit: "L" }] });
      const file = new File([fileContent], "recommendations.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockImportPost).toHaveBeenCalledWith({
          recommendations: [{ name: "Milk", preferredUnit: "L" }],
        });
        expect(toast.success).toHaveBeenCalledWith("Suggestions imported.");
      });
    });

    it("passes delete flags through import payload", async () => {
      const user = userEvent.setup();
      mockImportPost.mockResolvedValueOnce(undefined);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import suggestions" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const fileContent = JSON.stringify({
        recommendations: [{ name: "Milk", delete: true }],
      });
      const file = new File([fileContent], "recommendations.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockImportPost).toHaveBeenCalledWith({
          recommendations: [{ name: "Milk", delete: true }],
        });
      });
    });

    it("shows error toast when import API call fails", async () => {
      const user = userEvent.setup();
      mockImportPost.mockRejectedValueOnce(new Error("Import failed"));

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import suggestions" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(
        [JSON.stringify({ recommendations: [{ name: "Bread" }] })],
        "recommendations.json",
        { type: "application/json" }
      );
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to import suggestions.");
      });
    });

    it("shows error toast when file contains invalid JSON", async () => {
      const user = userEvent.setup();

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import suggestions" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["not valid json"], "recommendations.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to import suggestions.");
      });
    });
  });
});
