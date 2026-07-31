import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import { NoteEditorToolbar } from "./NoteEditorToolbar";

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };

/**
 * The toolbar only calls `editor.chain().focus().<command>().run()` and a
 * couple of `editor.isActive`/`editor.can()` checks — a full ProseMirror
 * instance needs DOM layout APIs jsdom doesn't implement (see
 * NoteWorkspace.test.tsx), so a chainable stub covers this component's own
 * logic without constructing a real editor.
 */
interface StubChain {
  focus: () => StubChain;
  insertContent: (...args: unknown[]) => StubChain;
  toggleBold: () => StubChain;
  run: () => boolean;
}

function createStubEditor(): Editor & { _insertContent: jest.Mock } {
  const insertContent = jest.fn();
  const chain: StubChain = {
    focus: () => chain,
    insertContent: (...args: unknown[]) => {
      insertContent(...args);
      return chain;
    },
    toggleBold: () => chain,
    run: () => true,
  };
  return {
    chain: jest.fn(() => chain),
    isActive: jest.fn(() => false),
    can: jest.fn(() => ({ undo: () => false, redo: () => false })),
    _insertContent: insertContent,
  } as unknown as Editor & { _insertContent: jest.Mock };
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
      expect(editor._insertContent).toHaveBeenCalledWith({
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
    expect(editor._insertContent).not.toHaveBeenCalled();
  });
});
