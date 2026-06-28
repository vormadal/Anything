import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import CategoriesPage from "./page";
import { toast } from "sonner";

const mockCategoriesGet = jest.fn();
const mockCategoriesPost = jest.fn();
const mockUpdatePut = jest.fn();
const mockDeleteFn = jest.fn();
const mockReorderPut = jest.fn();
const mockApiFetch = jest.fn();
const mockItemById = jest.fn((id: number) => ({
  put: (...args: unknown[]) => mockUpdatePut(id, ...args),
  delete: (...args: unknown[]) => mockDeleteFn(id, ...args),
}));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      suggestionCategories: {
        get: (...args: unknown[]) => mockCategoriesGet(...args),
        post: (...args: unknown[]) => mockCategoriesPost(...args),
        byId: (id: number) => mockItemById(id),
        reorder: { put: (...args: unknown[]) => mockReorderPut(...args) },
      },
    },
  },
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/households/1/lists/suggestions/categories",
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

describe("CategoriesPage (household config)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Default: current user is a household manager (Owner).
    mockGetHouseholdRole.mockReturnValue("Owner");
  });

  describe("Access Control", () => {
    it("redirects non-manager users", async () => {
      localStorage.setItem("user", regularUser);
      localStorage.setItem("accessToken", "test-token");
      mockCategoriesGet.mockResolvedValue([]);
      mockGetHouseholdRole.mockReturnValue("Member");

      renderWithClient(<CategoriesPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("renders page for manager users", async () => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockCategoriesGet.mockResolvedValue([]);

      renderWithClient(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText("No categories yet. Create one to get started.")).toBeInTheDocument();
      });
    });
  });

  describe("Displaying Categories", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("shows categories in the list", async () => {
      mockCategoriesGet.mockResolvedValue([
        { id: 1, name: "Dairy", sortOrder: 0 },
        { id: 2, name: "Produce", sortOrder: 1 },
      ]);

      renderWithClient(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText("Dairy")).toBeInTheDocument();
        expect(screen.getByText("Produce")).toBeInTheDocument();
      });
    });

    it("shows empty state when no categories exist", async () => {
      mockCategoriesGet.mockResolvedValue([]);

      renderWithClient(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText("No categories yet. Create one to get started.")).toBeInTheDocument();
      });
    });
  });

  describe("Create Category", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockCategoriesGet.mockResolvedValue([]);
    });

    it("shows create form when clicking New", async () => {
      const user = userEvent.setup();
      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create category" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create category" }));

      expect(screen.getByPlaceholderText("Category name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save new category" })).toBeInTheDocument();
    });

    it("creates a category successfully", async () => {
      const user = userEvent.setup();
      mockCategoriesPost.mockResolvedValueOnce({ id: 1, name: "Frozen", sortOrder: 0 });

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create category" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create category" }));
      await user.type(screen.getByPlaceholderText("Category name"), "Frozen");
      await user.click(screen.getByRole("button", { name: "Save new category" }));

      await waitFor(() => {
        expect(mockCategoriesPost).toHaveBeenCalledWith({ name: "Frozen" });
        expect(toast.success).toHaveBeenCalledWith("Category created.");
      });
    });

    it("shows error toast when create fails", async () => {
      const user = userEvent.setup();
      mockCategoriesPost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create category" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create category" }));
      await user.type(screen.getByPlaceholderText("Category name"), "Frozen");
      await user.click(screen.getByRole("button", { name: "Save new category" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create category.");
      });
    });

    it("hides create form on Cancel", async () => {
      const user = userEvent.setup();
      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create category" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create category" }));
      expect(screen.getByPlaceholderText("Category name")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByPlaceholderText("Category name")).not.toBeInTheDocument();
    });
  });

  describe("Edit Category", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("shows edit form when clicking edit button", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Beverages", sortOrder: 0 }]);

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByText("Beverages")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit category" }));

      expect(screen.getByDisplayValue("Beverages")).toBeInTheDocument();
    });

    it("saves edit successfully", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Beverages", sortOrder: 0 }]);
      mockUpdatePut.mockResolvedValueOnce(undefined);

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByText("Beverages")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit category" }));

      const nameInput = screen.getByDisplayValue("Beverages");
      await user.clear(nameInput);
      await user.type(nameInput, "Drinks");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockUpdatePut).toHaveBeenCalledWith(1, { name: "Drinks" });
        expect(toast.success).toHaveBeenCalledWith("Category updated.");
      });
    });

    it("shows error toast when edit fails", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Beverages", sortOrder: 0 }]);
      mockUpdatePut.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByText("Beverages")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit category" }));
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update category.");
      });
    });

    it("cancels edit without saving", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Beverages", sortOrder: 0 }]);

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByText("Beverages")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit category" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockUpdatePut).not.toHaveBeenCalled();
    });
  });

  describe("Delete Category", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
    });

    it("deletes a category successfully", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Snacks", sortOrder: 0 }]);
      mockDeleteFn.mockResolvedValueOnce(undefined);

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByText("Snacks")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete category" }));

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith("Category deleted.");
      });
    });

    it("shows error toast when delete fails", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Snacks", sortOrder: 0 }]);
      mockDeleteFn.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByText("Snacks")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete category" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete category.");
      });
    });
  });

  describe("Export Categories", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockCategoriesGet.mockResolvedValue([]);

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

    it("exports categories successfully", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ categories: [{ name: "Dairy" }] }),
      });

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Export categories" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Export categories" }));

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith("/api/suggestion-categories/export");
        expect(toast.success).toHaveBeenCalledWith("Categories exported.");
      });
    });

    it("shows error toast when export fails", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValueOnce({ ok: false });

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Export categories" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Export categories" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to export categories.");
      });
    });
  });

  describe("Import Categories", () => {
    beforeEach(() => {
      localStorage.setItem("user", adminUser);
      localStorage.setItem("accessToken", "test-token");
      mockCategoriesGet.mockResolvedValue([]);
    });

    it("imports categories from a valid JSON file successfully", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValueOnce({ ok: true });

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import categories" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const fileContent = JSON.stringify({ categories: [{ name: "Dairy" }, { name: "Bakery" }] });
      const file = new File([fileContent], "categories.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api/suggestion-categories/import",
          expect.objectContaining({ method: "POST" })
        );
        expect(toast.success).toHaveBeenCalledWith("Categories imported.");
      });
    });

    it("shows error toast when import API call fails", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValueOnce({ ok: false });

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import categories" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([JSON.stringify({ categories: [{ name: "Dairy" }] })], "categories.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to import categories.");
      });
    });

    it("shows error toast when file contains invalid JSON", async () => {
      const user = userEvent.setup();

      renderWithClient(<CategoriesPage />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Import categories" })).toBeInTheDocument());

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["not valid json"], "categories.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to import categories.");
      });
    });
  });
});
