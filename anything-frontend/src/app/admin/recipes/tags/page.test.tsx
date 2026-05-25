import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import RecipeTagsAdminPage from "./page";
import { toast } from "sonner";

const mockApiFetch = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: { api: {} },
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/admin/recipes/tags",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const adminUser = JSON.stringify({ email: "admin@test.com", name: "Admin", role: "Admin" });
const regularUser = JSON.stringify({ email: "user@test.com", name: "User", role: "User" });

describe("RecipeTagsAdminPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("redirects non-admin users", async () => {
    localStorage.setItem("user", regularUser);
    localStorage.setItem("accessToken", "test-token");

    renderWithClient(<RecipeTagsAdminPage />);

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

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ recipes: [] }),
    });

    renderWithClient(<RecipeTagsAdminPage />);

    await user.click(screen.getByRole("button", { name: "Export recipe tags" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/recipes/tags/export");
      expect(toast.success).toHaveBeenCalledWith("Recipe tags exported.");
    });
  });

  it("imports recipe tags successfully", async () => {
    const user = userEvent.setup();
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");
    mockApiFetch.mockResolvedValueOnce({ ok: true });

    renderWithClient(<RecipeTagsAdminPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(
      [JSON.stringify({ recipes: [{ recipeName: "Soup", tags: ["warm"] }] })],
      "recipe-tags.json",
      { type: "application/json" }
    );
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/recipes/tags/import",
        expect.objectContaining({ method: "POST" })
      );
      expect(toast.success).toHaveBeenCalledWith("Recipe tags imported.");
    });
  });

  it("shows error toast when import file has invalid JSON", async () => {
    const user = userEvent.setup();
    localStorage.setItem("user", adminUser);
    localStorage.setItem("accessToken", "test-token");

    renderWithClient(<RecipeTagsAdminPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["bad-json"], "recipe-tags.json", { type: "application/json" });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to import recipe tags.");
    });
  });
});
