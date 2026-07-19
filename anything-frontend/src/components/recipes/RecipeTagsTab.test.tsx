import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { RecipeTagsTab } from "./RecipeTagsTab";
import { toast } from "sonner";

const mockCatalogGet = jest.fn();
const mockRenamePut = jest.fn();
const mockDeleteFn = jest.fn();
const mockByName = jest.fn((name: string) => ({
  put: (...args: unknown[]) => mockRenamePut(name, ...args),
  delete: (...args: unknown[]) => mockDeleteFn(name, ...args),
}));

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      recipes: {
        tags: {
          catalog: { get: (...args: unknown[]) => mockCatalogGet(...args) },
          byName: (name: string) => mockByName(name),
        },
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

describe("RecipeTagsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnline = true;
    mockCatalogGet.mockResolvedValue([]);
  });

  describe("Displaying tags", () => {
    it("shows tags with their recipe counts", async () => {
      mockCatalogGet.mockResolvedValue([
        { name: "dinner", count: 5 },
        { name: "vegetarian", count: 2 },
      ]);

      renderWithClient(<RecipeTagsTab />);

      await waitFor(() => {
        expect(screen.getByText(/dinner/)).toBeInTheDocument();
        expect(screen.getByText(/vegetarian/)).toBeInTheDocument();
        expect(screen.getByText("(5)")).toBeInTheDocument();
      });
    });

    it("shows empty state when no tags exist", async () => {
      renderWithClient(<RecipeTagsTab />);

      await waitFor(() => {
        expect(screen.getByText("No tags yet. Add tags to your recipes to see them here.")).toBeInTheDocument();
      });
    });
  });

  describe("Rename tag", () => {
    it("renames a tag successfully", async () => {
      const user = userEvent.setup();
      mockCatalogGet.mockResolvedValue([{ name: "dinner", count: 3 }]);
      mockRenamePut.mockResolvedValueOnce(undefined);

      renderWithClient(<RecipeTagsTab />);

      await waitFor(() => expect(screen.getByText(/dinner/)).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Rename tag" }));

      const nameInput = screen.getByDisplayValue("dinner");
      await user.clear(nameInput);
      await user.type(nameInput, "supper");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockRenamePut).toHaveBeenCalledWith("dinner", { newName: "supper" });
        expect(toast.success).toHaveBeenCalledWith("Tag renamed.");
      });
    });

    it("shows error toast when rename fails", async () => {
      const user = userEvent.setup();
      mockCatalogGet.mockResolvedValue([{ name: "dinner", count: 3 }]);
      mockRenamePut.mockRejectedValueOnce(new Error("Server error"));

      renderWithClient(<RecipeTagsTab />);

      await waitFor(() => expect(screen.getByText(/dinner/)).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Rename tag" }));

      const nameInput = screen.getByDisplayValue("dinner");
      await user.clear(nameInput);
      await user.type(nameInput, "supper");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to rename tag.");
      });
    });

    it("cancels edit without saving", async () => {
      const user = userEvent.setup();
      mockCatalogGet.mockResolvedValue([{ name: "dinner", count: 3 }]);

      renderWithClient(<RecipeTagsTab />);

      await waitFor(() => expect(screen.getByText(/dinner/)).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Rename tag" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockRenamePut).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue("dinner")).not.toBeInTheDocument();
    });
  });

  describe("Delete tag", () => {
    it("deletes a tag after confirming", async () => {
      const user = userEvent.setup();
      mockCatalogGet.mockResolvedValue([{ name: "dinner", count: 3 }]);
      mockDeleteFn.mockResolvedValueOnce(undefined);

      renderWithClient(<RecipeTagsTab />);

      await waitFor(() => expect(screen.getByText(/dinner/)).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete tag" }));

      expect(screen.getByText("Delete tag “dinner”?")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Confirm delete tag" }));

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith("dinner");
        expect(toast.success).toHaveBeenCalledWith("Tag deleted.");
      });
    });

    it("does not delete when cancelled", async () => {
      const user = userEvent.setup();
      mockCatalogGet.mockResolvedValue([{ name: "dinner", count: 3 }]);

      renderWithClient(<RecipeTagsTab />);

      await waitFor(() => expect(screen.getByText(/dinner/)).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Delete tag" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockDeleteFn).not.toHaveBeenCalled();
    });
  });

  describe("Offline", () => {
    it("disables management actions when offline", async () => {
      mockOnline = false;
      mockCatalogGet.mockResolvedValue([{ name: "dinner", count: 3 }]);

      renderWithClient(<RecipeTagsTab />);

      await waitFor(() => expect(screen.getByText(/dinner/)).toBeInTheDocument());
      expect(screen.getByRole("button", { name: "Rename tag" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete tag" })).toBeDisabled();
    });
  });
});
