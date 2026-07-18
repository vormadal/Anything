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
const mockDuplicatesGet = jest.fn();
const mockByListDelete = jest.fn();
const mockSharedDelete = jest.fn();
const mockTransferPost = jest.fn();
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
        duplicates: { get: (...args: unknown[]) => mockDuplicatesGet(...args) },
        shared: { delete: (...args: unknown[]) => mockSharedDelete(...args) },
        transfer: { post: (...args: unknown[]) => mockTransferPost(...args) },
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
const mockReplace = jest.fn();
let mockTab: string | null = null;
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/households/1/lists/suggestions",
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

describe("SuggestionsPage (household config)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockTab = null;
    mockCategoriesGet.mockResolvedValue([]);
    mockDuplicatesGet.mockResolvedValue([]);
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

    it("only enables the delete action once a specific scope is selected", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      await screen.findByRole("option", { name: "Groceries" });
      // The action is always present (discoverable) but disabled until a scope is chosen.
      const deleteButton = screen.getByRole("button", { name: "Delete all suggestions in this scope" });
      expect(deleteButton).toBeDisabled();

      await user.selectOptions(screen.getByLabelText("Filter by list"), "7");

      await waitFor(() => expect(deleteButton).toBeEnabled());
    });

    it("clears a list's suggestions after confirming", async () => {
      const user = userEvent.setup();
      mockAllGet.mockResolvedValue([]);
      mockByListDelete.mockResolvedValueOnce(undefined);

      renderWithClient(<SuggestionsPage />);

      await screen.findByRole("option", { name: "Groceries" });
      await user.selectOptions(screen.getByLabelText("Filter by list"), "7");

      await user.click(screen.getByRole("button", { name: "Delete all suggestions in this scope" }));
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

  describe("Duplicate review banner", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockAllGet.mockResolvedValue([]);
    });

    it("explains the duplicates found and shows the count on the Review duplicates button", async () => {
      mockDuplicatesGet.mockResolvedValue([
        { members: [{ id: 1, name: "Tomato" }, { id: 2, name: "Tomatoe" }] },
        { members: [{ id: 3, name: "Yoghurt" }, { id: 4, name: "Yogurt" }] },
      ]);

      renderWithClient(<SuggestionsPage />);

      const duplicatesButton = await screen.findByRole("button", { name: "Review duplicate suggestions" });
      await waitFor(() =>
        expect(
          screen.getByText("2 possible duplicate groups found — review and merge them into one.")
        ).toBeInTheDocument()
      );
      expect(within(duplicatesButton).getByText("2")).toBeInTheDocument();
      expect(duplicatesButton).toBeEnabled();
    });

    it("disables the button and shows a neutral message when there are no duplicates", async () => {
      mockDuplicatesGet.mockResolvedValue([]);

      renderWithClient(<SuggestionsPage />);

      const duplicatesButton = await screen.findByRole("button", { name: "Review duplicate suggestions" });
      await waitFor(() =>
        expect(screen.getByText("No possible duplicate suggestions found.")).toBeInTheDocument()
      );
      expect(duplicatesButton).toBeDisabled();
      // CountBadge renders nothing at zero, so the button holds only its label.
      expect(within(duplicatesButton).queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });

  describe("Tabs", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockAllGet.mockResolvedValue([]);
    });

    it("defaults to the Suggestions tab", async () => {
      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("No suggestions yet.")).toBeInTheDocument());
      expect(screen.getByRole("tab", { name: /Suggestions/ })).toHaveAttribute("aria-selected", "true");
    });

    it("navigates to the Categories tab via a query param", async () => {
      const user = userEvent.setup();
      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("No suggestions yet.")).toBeInTheDocument());
      await user.click(screen.getByRole("tab", { name: /Categories/ }));

      expect(mockReplace).toHaveBeenCalledWith(
        "/households/1/lists/suggestions?tab=categories",
        { scroll: false }
      );
    });

    it("navigates to the Import & Export tab via a query param", async () => {
      const user = userEvent.setup();
      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("No suggestions yet.")).toBeInTheDocument());
      await user.click(screen.getByRole("tab", { name: /Import & Export/ }));

      expect(mockReplace).toHaveBeenCalledWith(
        "/households/1/lists/suggestions?tab=import-export",
        { scroll: false }
      );
    });

    it("renders the Categories tab body when tab=categories", async () => {
      mockTab = "categories";
      renderWithClient(<SuggestionsPage />);

      await waitFor(() =>
        expect(screen.getByText(/No categories yet/)).toBeInTheDocument()
      );
      expect(screen.getByRole("tab", { name: /Categories/ })).toHaveAttribute("aria-selected", "true");
    });

    it("renders the Import & Export tab body when tab=import-export", async () => {
      mockTab = "import-export";
      renderWithClient(<SuggestionsPage />);

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /Import from file/ })).toBeInTheDocument()
      );
      expect(screen.getByRole("button", { name: /Export all/ })).toBeInTheDocument();
    });
  });

  describe("Bulk scope actions", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockAllGet.mockResolvedValue([]);
    });

    it("shows the bulk actions disabled with a hint when no scope is selected", async () => {
      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByText("No suggestions yet.")).toBeInTheDocument());
      expect(
        screen.getByText(/Select a list or Shared above to move or delete/)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete all suggestions in this scope" })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Move all suggestions in this scope/ })).toBeDisabled();
    });

    it("deletes shared suggestions after confirming", async () => {
      const user = userEvent.setup();
      mockSharedDelete.mockResolvedValueOnce(undefined);
      renderWithClient(<SuggestionsPage />);

      await waitFor(() => expect(screen.getByLabelText("Filter by list")).toBeInTheDocument());
      await user.selectOptions(screen.getByLabelText("Filter by list"), "shared");

      const deleteButton = screen.getByRole("button", { name: "Delete all suggestions in this scope" });
      await waitFor(() => expect(deleteButton).toBeEnabled());
      await user.click(deleteButton);

      expect(screen.getByText("Remove all shared suggestions?")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Remove suggestions" }));

      await waitFor(() => {
        expect(mockSharedDelete).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith("Shared suggestions removed.");
      });
    });

    it("moves a list's suggestions to another scope and reports the counts", async () => {
      const user = userEvent.setup();
      mockTransferPost.mockResolvedValueOnce({ moved: 2, dropped: 1 });
      renderWithClient(<SuggestionsPage />);

      await screen.findByRole("option", { name: "Groceries" });
      await user.selectOptions(screen.getByLabelText("Filter by list"), "7");

      await user.click(screen.getByRole("button", { name: /Move all suggestions in this scope/ }));
      // Destination defaults to Shared (the first option when a specific list is the source).
      await user.click(screen.getByRole("button", { name: "Move suggestions" }));

      await waitFor(() => {
        expect(mockTransferPost).toHaveBeenCalledWith({ fromShoppingListId: 7, toShoppingListId: null });
        expect(toast.success).toHaveBeenCalledWith("Moved 2 suggestions to Shared · 1 duplicate dropped.");
      });
    });
  });
});
