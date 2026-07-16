import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import SuggestionsPage from "./page";
import { toast } from "sonner";

const mockAllGet = jest.fn();
const mockCategoriesGet = jest.fn();
const mockChecklistsGet = jest.fn();
const mockDeleteFn = jest.fn();
const mockUpdatePut = jest.fn();
const mockCreatePost = jest.fn();
const mockExportGet = jest.fn();
const mockImportPost = jest.fn();
const mockByListDelete = jest.fn();
const mockItemById = jest.fn((id: number) => ({
  delete: (...args: unknown[]) => mockDeleteFn(id, ...args),
  put: (...args: unknown[]) => mockUpdatePut(id, ...args),
}));
const mockByShoppingListId = jest.fn((id: number) => ({
  delete: (...args: unknown[]) => mockByListDelete(id, ...args),
}));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      shoppingListRecommendations: {
        all: { get: (...args: unknown[]) => mockAllGet(...args) },
        post: (...args: unknown[]) => mockCreatePost(...args),
        byId: (id: number) => mockItemById(id),
        byList: { byShoppingListId: (id: number) => mockByShoppingListId(id) },
        exportEscaped: { get: (...args: unknown[]) => mockExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockImportPost(...args) },
      },
      suggestionCategories: {
        get: (...args: unknown[]) => mockCategoriesGet(...args),
      },
      checklists: {
        get: (...args: unknown[]) => mockChecklistsGet(...args),
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
    mockChecklistsGet.mockResolvedValue([
      { id: 7, name: "Groceries", type: 1 },
      { id: 8, name: "Hardware", type: 1 },
    ]);
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

    it("shows empty message by default", async () => {
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("No suggestions yet.")).toBeInTheDocument();
      });
    });

    it("shows uncategorized empty message when the uncategorized filter is on", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("No suggestions yet.")).toBeInTheDocument());
      await user.click(screen.getByRole("checkbox", { name: /Uncategorized only/ }));

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

    it("shows suggestions", async () => {
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Milk", preferredUnit: "L", categoryId: null, shoppingListId: null },
        { id: 2, name: "Bread", preferredUnit: null, categoryId: 5, shoppingListId: 7 },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Milk")).toBeInTheDocument();
        expect(screen.getByText("Bread")).toBeInTheDocument();
      });
    });

    it("shows a Shared badge for shared suggestions and a list badge for list-specific ones", async () => {
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Milk", preferredUnit: null, categoryId: null, shoppingListId: null },
        { id: 2, name: "Nails", preferredUnit: null, categoryId: null, shoppingListId: 8 },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Milk")).toBeInTheDocument());
      const milkRow = screen.getByText("Milk").closest("li")!;
      expect(within(milkRow).getByText("Shared")).toBeInTheDocument();
      const nailsRow = screen.getByText("Nails").closest("li")!;
      expect(within(nailsRow).getByText("Hardware")).toBeInTheDocument();
    });

    it("shows Uncategorized marker for items without category", async () => {
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Eggs", preferredUnit: null, categoryId: null, shoppingListId: null },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByRole("img", { name: "Uncategorized" })).toBeInTheDocument();
      });
    });

    it("shows the hidden badge for recipe-seeded items not in suggestions", async () => {
      mockAllGet.mockResolvedValue([
        { id: 4, name: "Boneless chicken breasts", preferredUnit: null, categoryId: null, includeInSuggestions: false, shoppingListId: null },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("From recipe · not suggested")).toBeInTheDocument();
      });
    });

    it("shows category name for categorized items", async () => {
      mockCategoriesGet.mockResolvedValue([{ id: 5, name: "Dairy", sortOrder: 0 }]);
      mockAllGet.mockResolvedValue([
        { id: 1, name: "Yogurt", preferredUnit: null, categoryId: 5, shoppingListId: null },
      ]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Dairy")).toBeInTheDocument();
      });
    });
  });

  describe("Filters", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("requests only shared suggestions when the shared filter is selected", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByLabelText("Filter by list")).toBeInTheDocument());
      await user.selectOptions(screen.getByLabelText("Filter by list"), "shared");

      await waitFor(() => {
        expect(mockAllGet).toHaveBeenCalledWith({ queryParameters: { sharedOnly: true } });
      });
    });

    it("scopes suggestions to a list when a list is selected", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await screen.findByRole("option", { name: "Groceries" });
      await user.selectOptions(screen.getByLabelText("Filter by list"), "7");

      await waitFor(() => {
        expect(mockAllGet).toHaveBeenCalledWith({ queryParameters: { shoppingListId: 7 } });
      });
    });

    it("requests only hidden suggestions when the autocomplete filter is Hidden", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByLabelText("Filter by autocomplete visibility")).toBeInTheDocument());
      await user.selectOptions(screen.getByLabelText("Filter by autocomplete visibility"), "hidden");

      await waitFor(() => {
        expect(mockAllGet).toHaveBeenCalledWith({ queryParameters: { includeInSuggestions: false } });
      });
    });
  });

  describe("Clear list suggestions", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("only offers Clear list when a specific list is selected", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await screen.findByRole("option", { name: "Groceries" });
      expect(screen.queryByRole("button", { name: "Remove all suggestions for this list" })).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText("Filter by list"), "7");

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Remove all suggestions for this list" })).toBeInTheDocument()
      );
    });

    it("clears a list's suggestions after confirming", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);
      mockByListDelete.mockResolvedValueOnce(undefined);

      renderWithClient(<SuggestionsPage />);

      await screen.findByRole("option", { name: "Groceries" });
      await user.selectOptions(screen.getByLabelText("Filter by list"), "7");

      await user.click(screen.getByRole("button", { name: "Remove all suggestions for this list" }));
      await user.click(screen.getByRole("button", { name: "Remove suggestions" }));

      await waitFor(() => {
        expect(mockByShoppingListId).toHaveBeenCalledWith(7);
        expect(mockByListDelete).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("List suggestions removed.");
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
      mockAllGet.mockResolvedValue([{ id: 1, name: "Butter", categoryId: null, shoppingListId: null }]);
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
      mockAllGet.mockResolvedValue([{ id: 1, name: "Butter", categoryId: null, shoppingListId: null }]);
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

    it("creates a shared suggestion by default", async () => {
      const user = userEvent.setup();
      mockCreatePost.mockResolvedValueOnce({ id: 10, name: "Cheese" });

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create suggestion" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create suggestion" }));
      await user.type(screen.getByPlaceholderText("Name"), "Cheese");
      await user.click(screen.getByRole("button", { name: "Save new suggestion" }));

      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledWith({ name: "Cheese", preferredUnit: null, shoppingListId: null });
        expect(toast.success).toHaveBeenCalledWith("Suggestion created.");
      });
    });

    it("creates a list-specific suggestion when a list is selected", async () => {
      const user = userEvent.setup();
      mockCreatePost.mockResolvedValueOnce({ id: 11, name: "Screws" });

      renderWithClient(<SuggestionsPage />);

      await screen.findByRole("option", { name: "Hardware" });
      await user.selectOptions(screen.getByLabelText("Filter by list"), "8");
      await user.click(screen.getByRole("button", { name: "Create suggestion" }));
      await user.type(screen.getByPlaceholderText("Name"), "Screws");
      await user.click(screen.getByRole("button", { name: "Save new suggestion" }));

      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledWith({ name: "Screws", preferredUnit: null, shoppingListId: 8 });
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
      mockAllGet.mockResolvedValue([{ id: 1, name: "Tomato", preferredUnit: "kg", categoryId: null, shoppingListId: null }]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit suggestion" }));

      expect(screen.getByDisplayValue("Tomato")).toBeInTheDocument();
    });

    it("saves edit successfully, preserving the list scope", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Tomato", preferredUnit: null, categoryId: null, shoppingListId: 7 }]);
      mockUpdatePut.mockResolvedValueOnce(undefined);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit suggestion" }));

      const nameInput = screen.getByDisplayValue("Tomato");
      await user.clear(nameInput);
      await user.type(nameInput, "Cherry Tomato");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockUpdatePut).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Cherry Tomato", shoppingListId: 7 }));
        expect(toast.success).toHaveBeenCalledWith("Suggestion updated.");
      });
    });

    it("shows error toast when edit fails", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Tomato", preferredUnit: null, categoryId: null, shoppingListId: null }]);
      mockUpdatePut.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit suggestion" }));
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update suggestion.");
      });
    });

    it("promotes a hidden item into suggestions via the toggle", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([
        { id: 4, name: "Boneless chicken breasts", preferredUnit: null, categoryId: null, includeInSuggestions: false, shoppingListId: null },
      ]);
      mockUpdatePut.mockResolvedValueOnce(undefined);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Boneless chicken breasts")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit suggestion" }));

      const toggle = screen.getByRole("checkbox", { name: /Show in autocomplete suggestions/ });
      expect(toggle).not.toBeChecked();
      await user.click(toggle);
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockUpdatePut).toHaveBeenCalledWith(4, expect.objectContaining({ includeInSuggestions: true }));
      });
    });

    it("cancels edit without saving", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([{ id: 1, name: "Tomato", preferredUnit: null, categoryId: null, shoppingListId: null }]);

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
        { id: 1, name: "Apple", categoryId: null, shoppingListId: null },
        { id: 2, name: "Banana", categoryId: null, shoppingListId: null },
        { id: 3, name: "Apricot", categoryId: null, shoppingListId: null },
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
      mockAllGet.mockResolvedValue([{ id: 1, name: "Apple", categoryId: null, shoppingListId: null }]);

      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
      await user.type(screen.getByRole("textbox", { name: "Search suggestions" }), "xyz");

      await waitFor(() => {
        expect(screen.getByText("No suggestions match your search.")).toBeInTheDocument();
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
