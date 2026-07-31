import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import ImportNotesPage from "./page";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notes/import",
}));

const mockNotesPost = jest.fn();
const mockImagesPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notes: {
        post: (...args: unknown[]) => mockNotesPost(...args),
        images: { post: (...args: unknown[]) => mockImagesPost(...args) },
      },
    },
  },
  createMultipartBody: () => ({ addOrReplacePart: jest.fn() }),
}));

function pickFilesInput(): HTMLInputElement {
  return screen.getByLabelText(/Choose exported files/) as HTMLInputElement;
}

describe("ImportNotesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotesPost.mockResolvedValue({ id: 1 });
  });

  it("reviews the picked files and imports the selected ones", async () => {
    const user = userEvent.setup();
    renderWithClient(<ImportNotesPage />);

    const grocery = new File(["Milk\nEggs"], "Grocery list.txt", { type: "text/plain" });
    const packing = new File(["Passport"], "Trip packing.txt", { type: "text/plain" });
    await user.upload(pickFilesInput(), [grocery, packing]);

    expect(await screen.findByText("Grocery list")).toBeVisible();
    expect(screen.getByText("Trip packing")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Import 2 notes" }));

    await waitFor(() => expect(screen.getByText("2 notes imported.")).toBeVisible());
    expect(mockNotesPost).toHaveBeenCalledTimes(2);
    expect(mockNotesPost).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Grocery list", contentJson: expect.stringContaining("Milk") })
    );
  });

  it("disables a file it can't parse and excludes it from the import count", async () => {
    renderWithClient(<ImportNotesPage />);
    const unsupported = new File(["%PDF"], "note.pdf", { type: "application/pdf" });

    // userEvent.upload() enforces the input's `accept` filter like a real OS
    // picker would, but the check this test targets is the page's own
    // defense-in-depth (e.g. against a drag-and-drop that bypasses `accept`)
    // — fireEvent bypasses that filtering to reach it directly.
    Object.defineProperty(pickFilesInput(), "files", { value: [unsupported] });
    fireEvent.change(pickFilesInput());

    expect(await screen.findByText("Only .txt and .docx files can be imported.")).toBeVisible();
    expect(screen.getByText("Nothing selected")).toBeVisible();
  });

  it("records a per-file failure and still imports the rest of the batch", async () => {
    mockNotesPost.mockRejectedValueOnce(new Error("Content is too large."));
    mockNotesPost.mockResolvedValueOnce({ id: 2 });
    const user = userEvent.setup();
    renderWithClient(<ImportNotesPage />);

    const first = new File(["a"], "First.txt", { type: "text/plain" });
    const second = new File(["b"], "Second.txt", { type: "text/plain" });
    await user.upload(pickFilesInput(), [first, second]);

    await user.click(await screen.findByRole("button", { name: "Import 2 notes" }));

    await waitFor(() => expect(screen.getByText("1 note imported.")).toBeVisible());
    expect(screen.getByText(/First: Content is too large\./)).toBeVisible();
  });

  it("returns to the notes list from the completion screen", async () => {
    const user = userEvent.setup();
    renderWithClient(<ImportNotesPage />);

    await user.upload(pickFilesInput(), [new File(["a"], "Note.txt", { type: "text/plain" })]);
    await user.click(await screen.findByRole("button", { name: "Import 1 note" }));
    await user.click(await screen.findByRole("button", { name: "Done" }));

    expect(mockReplace).toHaveBeenCalledWith("/notes");
  });
});
