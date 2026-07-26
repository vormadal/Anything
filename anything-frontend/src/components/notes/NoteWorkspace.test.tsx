import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JSONContent } from "@tiptap/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { PageActionsProvider, useHeaderActions } from "@/context/PageActionsContext";
import { NoteWorkspace } from "./NoteWorkspace";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notes/new",
}));

const mockCreateNote = jest.fn();
const mockUpdateNote = jest.fn();

jest.mock("@/hooks/useNotes", () => ({
  useCreateNote: () => ({ mutateAsync: mockCreateNote }),
  useUpdateNote: () => ({ mutateAsync: mockUpdateNote }),
}));

// ProseMirror needs layout APIs jsdom doesn't implement, so the editor is
// replaced by a button that emits whatever document the test has staged. Real
// editing behaviour is covered by the Playwright visual specs.
let mockDocument: JSONContent = { type: "doc", content: [] };

jest.mock("./NoteEditor", () => ({
  NoteEditor: ({ onChange }: { onChange: (document: JSONContent) => void }) => (
    <button type="button" data-testid="emit-edit" onClick={() => onChange(mockDocument)}>
      editor
    </button>
  ),
}));

const paragraph = (text?: string): JSONContent =>
  text === undefined
    ? { type: "paragraph" }
    : { type: "paragraph", content: [{ type: "text", text }] };

const doc = (...blocks: JSONContent[]): JSONContent => ({ type: "doc", content: blocks });

/** Surfaces the app header's title and actions, which live in context. */
function HeaderProbe() {
  const { headerActions, title } = useHeaderActions();
  return (
    <div>
      <span data-testid="header-title">{title}</span>
      {headerActions}
    </div>
  );
}

function renderWorkspace(props: React.ComponentProps<typeof NoteWorkspace> = {}) {
  return renderWithClient(
    <PageActionsProvider>
      <HeaderProbe />
      <NoteWorkspace {...props} />
    </PageActionsProvider>,
  );
}

/** Stages a document and fires it through the editor's onChange. */
async function edit(user: ReturnType<typeof userEvent.setup>, document: JSONContent) {
  mockDocument = document;
  await user.click(await screen.findByTestId("emit-edit"));
}

const headerTitle = () => screen.getByTestId("header-title").textContent;

describe("NoteWorkspace", () => {
  // Cleared up front, not in afterEach: unmounting flushes the pending save, so
  // the previous test's teardown lands a call while afterEach is still running.
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNote.mockResolvedValue({ id: 42 });
    mockUpdateNote.mockResolvedValue(undefined);
  });

  it("takes the title from the first line, capped at six words", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await edit(user, doc(paragraph("one two three four five six seven eight")));

    expect(headerTitle()).toBe("one two three four five six");
  });

  it("saves what was written when the note is left before Enter is pressed", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWorkspace();

    await edit(user, doc(paragraph("Wifi password")));
    unmount();

    await waitFor(() =>
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Wifi password" }),
      ),
    );
  });

  it("does not create the note until the first line is finished", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await edit(user, doc(paragraph("Wifi password")));
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(mockCreateNote).not.toHaveBeenCalled();

    // Pressing Enter adds the second block — the heading is settled, so the
    // note is worth creating.
    await edit(user, doc(paragraph("Wifi password"), paragraph()));

    await waitFor(() =>
      expect(mockCreateNote).toHaveBeenCalledWith({
        title: "Wifi password",
        contentJson: JSON.stringify(doc(paragraph("Wifi password"), paragraph())),
      }),
    );
  });

  it("reports the save state in the header instead of a save button", async () => {
    const user = userEvent.setup();
    renderWorkspace({ noteId: 7, initialTitle: "Wifi password" });

    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();

    await edit(user, doc(paragraph("Wifi password"), paragraph("Guest network")));
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved");

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"));
    expect(mockUpdateNote).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, title: "Wifi password" }),
    );
  });

  it("says so when a save fails", async () => {
    const user = userEvent.setup();
    mockUpdateNote.mockRejectedValue(new Error("offline"));
    renderWorkspace({ noteId: 7, initialTitle: "Wifi password" });

    await edit(user, doc(paragraph("Wifi password"), paragraph("Guest network")));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Not saved"));
  });

  it("keeps a renamed title from following the first line", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      noteId: 7,
      initialTitle: "Wifi password",
      initialDocument: doc(paragraph("Wifi password"), paragraph("Guest network")),
    });

    await user.click(screen.getByRole("button", { name: "Rename note" }));
    const input = screen.getByLabelText("Title");
    await user.clear(input);
    await user.type(input, "Router details");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockUpdateNote).toHaveBeenCalledWith(
        expect.objectContaining({ id: 7, title: "Router details" }),
      ),
    );
    expect(headerTitle()).toBe("Router details");

    mockUpdateNote.mockClear();
    await edit(user, doc(paragraph("Something else entirely"), paragraph("Guest network")));

    await waitFor(() =>
      expect(mockUpdateNote).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Router details" }),
      ),
    );
    expect(headerTitle()).toBe("Router details");
  });

  it("only offers Delete when the note can be deleted", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    renderWorkspace({ noteId: 7, initialTitle: "Wifi password", onDelete });

    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(await screen.findByText("Delete"));

    expect(onDelete).toHaveBeenCalled();
  });
});
