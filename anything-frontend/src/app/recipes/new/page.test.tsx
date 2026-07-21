import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import NewRecipePage from "./page";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/recipes/new",
}));

const mockCreateRecipe = jest.fn();
const mockImportRecipe = jest.fn();
const mockParseFromUrl = jest.fn();
jest.mock("@/hooks/useRecipes", () => ({
  useCreateRecipe: () => ({ mutateAsync: mockCreateRecipe, isPending: false }),
  useImportRecipe: () => ({ mutateAsync: mockImportRecipe, isPending: false }),
  useParseRecipeFromUrl: () => ({ mutateAsync: mockParseFromUrl, isPending: false }),
}));

jest.mock("./PhotoImport", () => ({
  PhotoImport: () => <div>PhotoImport stub</div>,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("NewRecipePage", () => {
  afterEach(() => {
    setOnline(true);
    jest.clearAllMocks();
  });

  it("shows the mode-selection screen by default", () => {
    renderWithClient(<NewRecipePage />);
    expect(screen.getByText("Import from URL")).toBeInTheDocument();
    expect(screen.getByText("Scan from photo")).toBeInTheDocument();
    expect(screen.getByText("Create manually")).toBeInTheDocument();
  });

  it("creates a recipe manually", async () => {
    const user = userEvent.setup();
    mockCreateRecipe.mockResolvedValueOnce({ id: 42 });
    renderWithClient(<NewRecipePage />);

    await user.click(screen.getByText("Create manually"));
    await user.type(screen.getByLabelText("Name"), "Pancakes");
    await user.click(screen.getByRole("button", { name: "Create Recipe" }));

    expect(mockCreateRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Pancakes" })
    );
    expect(mockReplace).toHaveBeenCalledWith("/recipes/42?edit=true");
  });

  it("imports a recipe from a URL", async () => {
    const user = userEvent.setup();
    mockParseFromUrl.mockResolvedValueOnce({ name: "Soup", ingredients: [], steps: [] });
    mockImportRecipe.mockResolvedValueOnce({ id: 7 });
    renderWithClient(<NewRecipePage />);

    await user.click(screen.getByText("Import from URL"));
    await user.type(screen.getByLabelText("Recipe URL"), "https://example.com/soup");
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(mockParseFromUrl).toHaveBeenCalledWith("https://example.com/soup");
    expect(mockImportRecipe).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/recipes/7?edit=true");
  });

  it("disables creating and importing while offline", async () => {
    const user = userEvent.setup();
    setOnline(false);
    renderWithClient(<NewRecipePage />);

    await user.click(screen.getByText("Create manually"));
    expect(screen.getByRole("button", { name: "Create Recipe" })).toBeDisabled();
  });

  it("disables importing from URL while offline", async () => {
    const user = userEvent.setup();
    setOnline(false);
    renderWithClient(<NewRecipePage />);

    await user.click(screen.getByText("Import from URL"));
    await user.type(screen.getByLabelText("Recipe URL"), "https://example.com/soup");
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });
});
