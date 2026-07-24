import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { NoteForm } from "./NoteForm";
import { EMPTY_NOTE_DOCUMENT } from "@/lib/notes/noteDocument";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notes/new",
}));

// ProseMirror needs layout APIs jsdom doesn't implement, and this suite is
// about the form's own behaviour — the editor is exercised in the Playwright
// visual specs instead.
jest.mock("./NoteEditor", () => ({
  NoteEditor: () => <div data-testid="note-editor" />,
}));

const onSubmit = jest.fn();
const onCancel = jest.fn();

describe("NoteForm", () => {
  afterEach(() => jest.clearAllMocks());

  it("submits the trimmed title and serialised document", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <NoteForm submitLabel="Create" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.type(screen.getByLabelText(/Title/), "  Wifi password  ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Wifi password",
      contentJson: JSON.stringify(EMPTY_NOTE_DOCUMENT),
    });
  });

  it("shows an inline error and does not submit when the title is blank", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <NoteForm submitLabel="Create" onSubmit={onSubmit} onCancel={onCancel} />
    );

    // Submitting the form directly bypasses the native `required` gate, which
    // would otherwise block the click before the handler runs.
    await user.type(screen.getByLabelText(/Title/), "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the inline error once the title is corrected", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <NoteForm submitLabel="Create" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.type(screen.getByLabelText(/Title/), "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Title is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Title/), "Groceries");
    expect(screen.queryByText("Title is required.")).not.toBeInTheDocument();
  });

  it("pre-fills the title when editing an existing note", () => {
    renderWithClient(
      <NoteForm
        initialTitle="Packing list"
        initialDocument={EMPTY_NOTE_DOCUMENT}
        submitLabel="Save"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByLabelText(/Title/)).toHaveValue("Packing list");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <NoteForm submitLabel="Create" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("disables both buttons while a save is in flight", () => {
    renderWithClient(
      <NoteForm submitLabel="Save" isPending onSubmit={onSubmit} onCancel={onCancel} />
    );

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
