// The insert-list button mounts a dialog that queries the household's lists,
// so the toolbar now needs a QueryClient around it.
import { render, screen, waitFor } from "@/__tests__/utils/test-utils";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import type { ShoppingListResponse } from "@/lib/api-client/models/index";
import { NoteEditorToolbar } from "./NoteEditorToolbar";

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notes/1",
}));


const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };

let mockLists: ShoppingListResponse[] = [];

jest.mock("@/hooks/useShoppingLists", () => ({
  useShoppingLists: () => ({ data: mockLists, isLoading: false }),
}));

/**
 * The toolbar only calls `editor.chain().focus().<command>().run()`, a couple
 * of `editor.isActive`/`editor.can()` checks, and `on`/`off` (via
 * `useEditorState`) — a full ProseMirror instance needs DOM layout APIs jsdom
 * doesn't implement (see NoteWorkspace.test.tsx), so a chainable stub covers
 * this component's own logic without constructing a real editor.
 */
type StubChain = Record<string, (...args: unknown[]) => unknown>;

/** Every command the toolbar can dispatch, recorded per name. */
const COMMANDS = [
  "insertContent",
  "insertListEmbed",
  "toggleBold",
  "insertTable",
  "addRowAfter",
  "deleteRow",
  "addColumnAfter",
  "deleteColumn",
  "toggleHeaderRow",
  "deleteTable",
  "undo",
  "redo",
] as const;

type StubEditor = Editor & { _commands: Record<string, jest.Mock> };

function createStubEditor(activeNodes: string[] = []): StubEditor {
  const commands = Object.fromEntries(COMMANDS.map((name) => [name, jest.fn()]));
  const chain: StubChain = { focus: () => chain, run: () => true };
  for (const name of COMMANDS) {
    chain[name] = (...args: unknown[]) => {
      commands[name](...args);
      return chain;
    };
  }

  return {
    chain: jest.fn(() => chain),
    isActive: jest.fn((name: string) => activeNodes.includes(name)),
    // `can()` gates Undo/Redo and the row/column deletes; true keeps every
    // button enabled so a click test isn't blocked by a disabled attribute.
    can: jest.fn(() => Object.fromEntries(COMMANDS.map((name) => [name, () => true]))),
    // `useEditorState` subscribes to the editor here and unsubscribes on
    // unmount — without these the toolbar throws on render.
    on: jest.fn(),
    off: jest.fn(),
    _commands: commands,
  } as unknown as StubEditor;
}

function selectFile(file: File) {
  const input = screen
    .getByRole("button", { name: "Add image" })
    .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
  return userEvent.setup().upload(input, file);
}

describe("NoteEditorToolbar image button", () => {
  it("uploads the picked file and inserts it as an image node", async () => {
    const editor = createStubEditor();
    const onUploadImage = jest.fn().mockResolvedValue({ src: "https://images.example/a.png", storageKey: "notes/a.png" });
    render(<NoteEditorToolbar editor={editor} onUploadImage={onUploadImage} />);

    const file = new File(["content"], "photo.png", { type: "image/png" });
    await selectFile(file);

    await waitFor(() => expect(onUploadImage).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(editor._commands.insertContent).toHaveBeenCalledWith({
        type: "image",
        attrs: { src: "https://images.example/a.png", storageKey: "notes/a.png" },
      })
    );
  });

  it("shows an error toast and does not insert anything when the upload fails", async () => {
    const editor = createStubEditor();
    const onUploadImage = jest.fn().mockRejectedValue(new Error("network error"));
    render(<NoteEditorToolbar editor={editor} onUploadImage={onUploadImage} />);

    await selectFile(new File(["content"], "photo.png", { type: "image/png" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Couldn\'t add "photo.png" to the note.'));
    expect(editor._commands.insertContent).not.toHaveBeenCalled();
  });
});

describe("NoteEditorToolbar table controls", () => {
  const noUpload = jest.fn();

  it("inserts a table with a header row", async () => {
    const editor = createStubEditor();
    render(<NoteEditorToolbar editor={editor} onUploadImage={noUpload} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Insert table" }));

    expect(editor._commands.insertTable).toHaveBeenCalledWith({ rows: 3, cols: 3, withHeaderRow: true });
  });

  it("hides the table controls while the caret is outside a table", () => {
    render(<NoteEditorToolbar editor={createStubEditor()} onUploadImage={noUpload} />);

    expect(screen.queryByRole("toolbar", { name: "Table" })).not.toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeInTheDocument();
  });

  it("shows the table controls and runs them while the caret is inside a table", async () => {
    const editor = createStubEditor(["table"]);
    render(<NoteEditorToolbar editor={editor} onUploadImage={noUpload} />);

    expect(screen.getByRole("toolbar", { name: "Table" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add row" }));
    await user.click(screen.getByRole("button", { name: "Delete column" }));

    expect(editor._commands.addRowAfter).toHaveBeenCalled();
    expect(editor._commands.deleteColumn).toHaveBeenCalled();
  });

  it("does not offer to nest a table inside a table", () => {
    render(<NoteEditorToolbar editor={createStubEditor(["table"])} onUploadImage={noUpload} />);

    expect(screen.getByRole("button", { name: "Insert table" })).toBeDisabled();
  });

  it("marks the header toggle as pressed in a header cell", () => {
    render(<NoteEditorToolbar editor={createStubEditor(["table", "tableHeader"])} onUploadImage={noUpload} />);

    expect(screen.getByRole("button", { name: "Toggle header row" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("NoteEditorToolbar insert-list button", () => {
  const noUpload = jest.fn();

  beforeEach(() => {
    mockLists = [
      { id: 7, name: "Groceries", type: 1, uncheckedItemCount: 2 },
      { id: 8, name: "Packing", type: 0, uncheckedItemCount: 0 },
    ];
  });

  it("embeds the picked list, keeping its name as the label", async () => {
    const editor = createStubEditor();
    render(<NoteEditorToolbar editor={editor} onUploadImage={noUpload} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Insert list" }));
    await user.click(await screen.findByRole("button", { name: /Groceries/ }));

    await waitFor(() =>
      expect(editor._commands.insertListEmbed).toHaveBeenCalledWith({ listId: 7, label: "Groceries" })
    );
  });

  it("does not offer to nest a list inside a table", () => {
    render(<NoteEditorToolbar editor={createStubEditor(["table"])} onUploadImage={noUpload} />);

    expect(screen.getByRole("button", { name: "Insert list" })).toBeDisabled();
  });
});
