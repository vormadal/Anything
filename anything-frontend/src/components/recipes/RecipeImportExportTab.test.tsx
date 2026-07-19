import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { RecipeImportExportTab } from "./RecipeImportExportTab";
import { toast } from "sonner";

const mockExportGet = jest.fn();
const mockImportPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      recipes: {
        tags: {
          exportEscaped: { get: (...args: unknown[]) => mockExportGet(...args) },
          importEscaped: { post: (...args: unknown[]) => mockImportPost(...args) },
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

describe("RecipeImportExportTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports recipe tags successfully", async () => {
    const user = userEvent.setup();

    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    const mockClick = jest.fn();
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = mockClick;
      return el;
    });

    mockExportGet.mockResolvedValueOnce({ recipes: [] });

    renderWithClient(<RecipeImportExportTab />);

    await user.click(screen.getByRole("button", { name: "Export recipe tags" }));

    await waitFor(() => {
      expect(mockExportGet).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Recipe tags exported.");
    });
  });

  it("imports recipe tags successfully", async () => {
    const user = userEvent.setup();
    mockImportPost.mockResolvedValueOnce(undefined);

    renderWithClient(<RecipeImportExportTab />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(
      [JSON.stringify({ recipes: [{ recipeName: "Soup", tags: ["warm"] }] })],
      "recipe-tags.json",
      { type: "application/json" }
    );
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockImportPost).toHaveBeenCalledWith({
        recipes: [{ recipeName: "Soup", tags: ["warm"] }],
      });
      expect(toast.success).toHaveBeenCalledWith("Recipe tags imported.");
    });
  });

  it("shows a format-specific error when the import file has invalid JSON", async () => {
    const user = userEvent.setup();

    renderWithClient(<RecipeImportExportTab />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["bad-json"], "recipe-tags.json", { type: "application/json" });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Import failed: the file isn't valid JSON. Check for a missing bracket, quote, or comma, or re-export a fresh copy."
      );
    });
    expect(mockImportPost).not.toHaveBeenCalled();
  });

  it("shows a format-specific error when the JSON is valid but has the wrong shape", async () => {
    const user = userEvent.setup();

    renderWithClient(<RecipeImportExportTab />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(
      [JSON.stringify({ recipes: [{ recipeName: "Soup" }] })],
      "recipe-tags.json",
      { type: "application/json" }
    );
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('the file\'s format is wrong. Item 1 in "recipes" ("Soup") is missing a "tags" array')
      );
    });
    expect(mockImportPost).not.toHaveBeenCalled();
  });

  it("shows the server's rejection reason when the data is invalid", async () => {
    const user = userEvent.setup();
    mockImportPost.mockRejectedValueOnce({
      responseStatusCode: 400,
      errors: { additionalData: { recipes: ["Recipe(s) not found: Soup"] } },
    });

    renderWithClient(<RecipeImportExportTab />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(
      [JSON.stringify({ recipes: [{ recipeName: "Soup", tags: ["warm"] }] })],
      "recipe-tags.json",
      { type: "application/json" }
    );
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Import rejected: Recipe(s) not found: Soup");
    });
  });

  it("shows a generic error for unexpected failures (e.g. network issues)", async () => {
    const user = userEvent.setup();
    mockImportPost.mockRejectedValueOnce(new Error("network down"));

    renderWithClient(<RecipeImportExportTab />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(
      [JSON.stringify({ recipes: [{ recipeName: "Soup", tags: ["warm"] }] })],
      "recipe-tags.json",
      { type: "application/json" }
    );
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to import recipe tags. Check your connection and try again."
      );
    });
  });

  describe("offline", () => {
    function setOnline(value: boolean) {
      Object.defineProperty(navigator, "onLine", { configurable: true, value });
    }

    afterEach(() => {
      setOnline(true);
    });

    it("disables export and import while offline", async () => {
      setOnline(false);

      renderWithClient(<RecipeImportExportTab />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Export recipe tags" })).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: "Export recipe tags" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Import recipe tags" })).toBeDisabled();
    });
  });
});
