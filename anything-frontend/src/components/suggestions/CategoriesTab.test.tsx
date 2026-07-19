import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { CategoriesTab } from "./CategoriesTab";
import { toast } from "sonner";

const mockCategoriesGet = jest.fn();
const mockCategoriesPost = jest.fn();
const mockUpdatePut = jest.fn();
const mockDeleteFn = jest.fn();
const mockReorderPut = jest.fn();
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
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

let mockOnline = true;
jest.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => mockOnline,
}));

describe("CategoriesTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnline = true;
    mockCategoriesGet.mockResolvedValue([]);
  });

  describe("Displaying Categories", () => {
    it("shows categories in the list", async () => {
      mockCategoriesGet.mockResolvedValue([
        { id: 1, name: "Dairy", sortOrder: 0 },
        { id: 2, name: "Produce", sortOrder: 1 },
      ]);

      renderWithClient(<CategoriesTab />);

      await waitFor(() => {
        expect(screen.getByText("Dairy")).toBeInTheDocument();
        expect(screen.getByText("Produce")).toBeInTheDocument();
      });
    });

    it("shows empty state when no categories exist", async () => {
      renderWithClient(<CategoriesTab />);

      await waitFor(() => {
        expect(screen.getByText("No categories yet. Create one to get started.")).toBeInTheDocument();
      });
    });
  });

  describe("Create Category", () => {
    it("creates a category successfully", async () => {
      const user = userEvent.setup();
      mockCategoriesPost.mockResolvedValueOnce({ id: 1, name: "Frozen", sortOrder: 0 });

      renderWithClient(<CategoriesTab />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create category" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create category" }));
      await user.type(screen.getByPlaceholderText("Category name"), "Frozen");
      await user.click(screen.getByRole("button", { name: "Save new category" }));

      await waitFor(() => {
        expect(mockCategoriesPost).toHaveBeenCalledWith({ name: "Frozen" });
      });
    });

    it("shows error toast when create fails", async () => {
      const user = userEvent.setup();
      mockCategoriesPost.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<CategoriesTab />);

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
      renderWithClient(<CategoriesTab />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Create category" })).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Create category" }));
      expect(screen.getByPlaceholderText("Category name")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByPlaceholderText("Category name")).not.toBeInTheDocument();
    });
  });

  describe("Edit Category", () => {
    it("saves edit successfully", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Beverages", sortOrder: 0 }]);
      mockUpdatePut.mockResolvedValueOnce(undefined);

      renderWithClient(<CategoriesTab />);

      await waitFor(() => expect(screen.getByText("Beverages")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit category" }));

      const nameInput = screen.getByDisplayValue("Beverages");
      await user.clear(nameInput);
      await user.type(nameInput, "Drinks");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockUpdatePut).toHaveBeenCalledWith(1, { name: "Drinks" });
      });
    });

    it("cancels edit without saving", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Beverages", sortOrder: 0 }]);

      renderWithClient(<CategoriesTab />);

      await waitFor(() => expect(screen.getByText("Beverages")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Edit category" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockUpdatePut).not.toHaveBeenCalled();
    });
  });

  describe("Delete Category", () => {
    it("deletes a category successfully", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Snacks", sortOrder: 0 }]);
      mockDeleteFn.mockResolvedValueOnce(undefined);

      renderWithClient(<CategoriesTab />);

      await waitFor(() => expect(screen.getByText("Snacks")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete category" }));

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith(1);
      });
    });
  });

  describe("Offline", () => {
    it("disables management actions when offline", async () => {
      mockOnline = false;
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Snacks", sortOrder: 0 }]);

      renderWithClient(<CategoriesTab />);

      await waitFor(() => expect(screen.getByText("Snacks")).toBeInTheDocument());
      expect(screen.getByRole("button", { name: "Create category" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Edit category" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete category" })).toBeDisabled();
    });
  });
});
