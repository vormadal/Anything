import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RecipeTagsPage from "./page";
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

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/households/1/recipes/tags",
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
    // Default: current user is a household manager (Owner).
    mockGetHouseholdRole.mockReturnValue("Owner");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("redirects non-manager users", async () => {
    localStorage.setItem("user", regularUser);
    localStorage.setItem("accessToken", "test-token");
    mockGetHouseholdRole.mockReturnValue("Member");

    renderWithClient(<RecipeTagsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("exports recipe tags successfully", async () => {
    const user = userEvent.setup();
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");

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

    renderWithClient(<RecipeTagsPage />);

    await user.click(screen.getByRole("button", { name: "Export recipe tags" }));

    await waitFor(() => {
      expect(mockExportGet).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Recipe tags exported.");
    });
  });

  it("imports recipe tags successfully", async () => {
    const user = userEvent.setup();
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");
    mockImportPost.mockResolvedValueOnce(undefined);

    renderWithClient(<RecipeTagsPage />);

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
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");

    renderWithClient(<RecipeTagsPage />);

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
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");

    renderWithClient(<RecipeTagsPage />);

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
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");
    mockImportPost.mockRejectedValueOnce({
      responseStatusCode: 400,
      errors: { additionalData: { recipes: ["Recipe(s) not found: Soup"] } },
    });

    renderWithClient(<RecipeTagsPage />);

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
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");
    mockImportPost.mockRejectedValueOnce(new Error("network down"));

    renderWithClient(<RecipeTagsPage />);

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
});
