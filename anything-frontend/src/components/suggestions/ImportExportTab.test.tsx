import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { ImportExportTab } from "./ImportExportTab";
import { toast } from "sonner";

const mockCategoriesGet = jest.fn();
const mockRecExportGet = jest.fn();
const mockRecImportPost = jest.fn();
const mockCatExportGet = jest.fn();
const mockCatImportPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      shoppingListRecommendations: {
        exportEscaped: { get: (...args: unknown[]) => mockRecExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockRecImportPost(...args) },
      },
      suggestionCategories: {
        get: (...args: unknown[]) => mockCategoriesGet(...args),
        exportEscaped: { get: (...args: unknown[]) => mockCatExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockCatImportPost(...args) },
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

function stubDownload() {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
  const originalCreateElement = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = originalCreateElement(tag);
    if (tag === "a") {
      el.click = jest.fn();
    }
    return el;
  });
}

describe("ImportExportTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCategoriesGet.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Export", () => {
    it("merges recommendations and categories into one download", async () => {
      const user = userEvent.setup();
      stubDownload();
      mockRecExportGet.mockResolvedValueOnce({ recommendations: [{ name: "Milk" }] });
      mockCatExportGet.mockResolvedValueOnce({ categories: [{ name: "Dairy" }] });

      renderWithClient(<ImportExportTab />);

      await user.click(await screen.findByRole("button", { name: "Export all" }));

      await waitFor(() => {
        expect(mockRecExportGet).toHaveBeenCalledWith({ queryParameters: { uncategorizedOnly: false } });
        expect(mockCatExportGet).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Suggestions exported.");
      });
    });

    it("passes the uncategorizedOnly flag when exporting uncategorized only", async () => {
      const user = userEvent.setup();
      stubDownload();
      mockRecExportGet.mockResolvedValueOnce({ recommendations: [] });
      mockCatExportGet.mockResolvedValueOnce({ categories: [] });

      renderWithClient(<ImportExportTab />);

      await user.click(await screen.findByRole("button", { name: "Export uncategorized only" }));

      await waitFor(() => {
        expect(mockRecExportGet).toHaveBeenCalledWith({ queryParameters: { uncategorizedOnly: true } });
      });
    });

    it("shows an error toast when export fails", async () => {
      const user = userEvent.setup();
      stubDownload();
      mockRecExportGet.mockRejectedValueOnce(new Error("Export failed"));
      mockCatExportGet.mockResolvedValueOnce({ categories: [] });

      renderWithClient(<ImportExportTab />);

      await user.click(await screen.findByRole("button", { name: "Export all" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to export suggestions.");
      });
    });
  });

  describe("Import", () => {
    it("splits a bundle across the category and recommendation import endpoints", async () => {
      const user = userEvent.setup();
      mockCatImportPost.mockResolvedValueOnce(undefined);
      mockRecImportPost.mockResolvedValueOnce(undefined);

      renderWithClient(<ImportExportTab />);

      await screen.findByRole("button", { name: "Import from file" });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const bundle = {
        categories: [{ name: "Dairy" }],
        recommendations: [{ name: "Milk", category: "Dairy" }],
      };
      const file = new File([JSON.stringify(bundle)], "suggestions-export.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockCatImportPost).toHaveBeenCalledWith({ categories: [{ name: "Dairy" }] });
        expect(mockRecImportPost).toHaveBeenCalledWith({
          recommendations: [{ name: "Milk", category: "Dairy" }],
        });
        expect(toast.success).toHaveBeenCalledWith("Suggestions imported.");
      });
    });

    it("imports a recommendations-only (legacy) file without touching categories", async () => {
      const user = userEvent.setup();
      mockRecImportPost.mockResolvedValueOnce(undefined);

      renderWithClient(<ImportExportTab />);

      await screen.findByRole("button", { name: "Import from file" });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(
        [JSON.stringify({ recommendations: [{ name: "Bread" }] })],
        "recommendations.json",
        { type: "application/json" }
      );
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockRecImportPost).toHaveBeenCalledWith({ recommendations: [{ name: "Bread" }] });
      });
      expect(mockCatImportPost).not.toHaveBeenCalled();
    });

    it("shows an error toast for invalid JSON", async () => {
      const user = userEvent.setup();

      renderWithClient(<ImportExportTab />);

      await screen.findByRole("button", { name: "Import from file" });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["not valid json"], "broken.json", { type: "application/json" });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to import suggestions.");
      });
    });
  });

  describe("AI prompt", () => {
    it("reveals the prompt including the household's category vocabulary", async () => {
      const user = userEvent.setup();
      mockCategoriesGet.mockResolvedValue([{ id: 1, name: "Dairy", sortOrder: 0 }]);

      renderWithClient(<ImportExportTab />);

      await user.click(await screen.findByRole("button", { name: /Show prompt/ }));

      expect(screen.getByText(/Prefer these existing categories/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Copy AI instructions" })).toBeInTheDocument();
    });
  });
});
