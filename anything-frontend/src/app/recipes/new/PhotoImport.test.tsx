import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/__tests__/utils/test-utils";
import { PhotoImport } from "./PhotoImport";
import { recognizeRecipePhoto } from "@/lib/ocr";
import { uploadRecipeImageFile } from "@/hooks/useRecipes";
import { toast } from "sonner";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/recipes/new",
}));

jest.mock("@/lib/ocr", () => ({
  ...jest.requireActual("@/lib/ocr"),
  recognizeRecipePhoto: jest.fn(),
}));

const mockParseText = jest.fn();
const mockImportRecipe = jest.fn();
jest.mock("@/hooks/useRecipes", () => ({
  useParseRecipeFromText: () => ({ mutateAsync: mockParseText, isPending: false }),
  useImportRecipe: () => ({ mutateAsync: mockImportRecipe, isPending: false }),
  uploadRecipeImageFile: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

const mockRecognize = recognizeRecipePhoto as jest.Mock;
const mockUpload = uploadRecipeImageFile as jest.Mock;

const OCR_TEXT = "Pandekager\n250 g mel\n2 eggs\nWhisk everything together until the batter is smooth.";

const parsedResponse = {
  name: "Pandekager",
  ingredients: [{ amount: 250, unit: "g", name: "mel" }],
  steps: [{ order: 1, text: "Whisk everything together until the batter is smooth." }],
};

async function scanPhoto() {
  const user = userEvent.setup();
  const file = new File(["fake image"], "recipe.jpg", { type: "image/jpeg" });
  await user.upload(screen.getByLabelText("Recipe photo"), file);
  return { user, file };
}

describe("PhotoImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecognize.mockResolvedValue(OCR_TEXT);
    mockParseText.mockResolvedValue(parsedResponse);
    mockImportRecipe.mockResolvedValue({ id: 42 });
    mockUpload.mockResolvedValue(undefined);
  });

  it("shows the pick phase initially", () => {
    render(<PhotoImport onBack={jest.fn()} />);

    expect(screen.getByText("Take or choose a photo")).toBeInTheDocument();
  });

  it("runs OCR on the chosen photo and prefills the review fields", async () => {
    render(<PhotoImport onBack={jest.fn()} />);

    await scanPhoto();

    expect(await screen.findByLabelText("Name")).toHaveValue("Pandekager");
    expect(screen.getByLabelText("Ingredients (one per line)")).toHaveValue("250 g mel\n2 eggs");
    expect(screen.getByLabelText("Steps (one per line)")).toHaveValue(
      "Whisk everything together until the batter is smooth."
    );
  });

  it("imports the reviewed text, attaches the photo and navigates to edit", async () => {
    render(<PhotoImport onBack={jest.fn()} />);

    const { user, file } = await scanPhoto();
    const nameInput = await screen.findByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Corrected name");
    await user.click(screen.getByRole("button", { name: "Import Recipe" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/recipes/42/edit"));
    expect(mockParseText).toHaveBeenCalledWith({
      name: "Corrected name",
      ingredientsText: "250 g mel\n2 eggs",
      stepsText: "Whisk everything together until the batter is smooth.",
    });
    expect(mockImportRecipe).toHaveBeenCalledWith({
      name: "Pandekager",
      link: null,
      notes: null,
      ingredients: parsedResponse.ingredients,
      steps: parsedResponse.steps,
      imageUrl: null,
    });
    expect(mockUpload).toHaveBeenCalledWith(42, file);
  });

  it("skips the photo upload when the attach checkbox is unchecked", async () => {
    render(<PhotoImport onBack={jest.fn()} />);

    const { user } = await scanPhoto();
    await screen.findByLabelText("Name");
    await user.click(screen.getByLabelText("Attach photo to the recipe"));
    await user.click(screen.getByRole("button", { name: "Import Recipe" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/recipes/42/edit"));
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("still navigates when the photo upload fails", async () => {
    mockUpload.mockRejectedValue(new Error("upload failed"));
    render(<PhotoImport onBack={jest.fn()} />);

    const { user } = await scanPhoto();
    await screen.findByLabelText("Name");
    await user.click(screen.getByRole("button", { name: "Import Recipe" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/recipes/42/edit"));
    expect(toast.warning).toHaveBeenCalled();
  });

  it("returns to the pick phase and shows an error when OCR fails", async () => {
    mockRecognize.mockRejectedValue(new Error("ocr failed"));
    render(<PhotoImport onBack={jest.fn()} />);

    await scanPhoto();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText("Take or choose a photo")).toBeInTheDocument();
    expect(mockParseText).not.toHaveBeenCalled();
  });
});
