import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import TiptapImage, { type ImageOptions } from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Editor, Extensions } from "@tiptap/react";
import { toast } from "sonner";

export const NOTE_PLACEHOLDER = "Start writing…";

/** Uploads an image file and returns where it now lives. */
export type UploadNoteImageFn = (file: File) => Promise<{ src: string; storageKey: string }>;

interface NoteImageOptions extends ImageOptions {
  /** Set only for the interactive editor — omitted for read-only rendering. */
  onUploadImage?: UploadNoteImageFn;
}

function imageFilesOf(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
}

/**
 * Uploads `file` and inserts it as an image node at `pos` once the upload
 * completes. `pos` is captured at drop/paste time — if the user keeps typing
 * during the upload, the insertion point can drift by a few characters. That
 * is an acceptable trade-off for a personal note-taking app; a robust fix
 * (an upload placeholder decoration) is more machinery than this needs.
 */
function insertUploadedImage(editor: Editor, onUploadImage: UploadNoteImageFn, pos: number, file: File) {
  onUploadImage(file)
    .then(({ src, storageKey }) => {
      editor.chain().insertContentAt(pos, { type: "image", attrs: { src, storageKey } }).run();
    })
    .catch(() => {
      toast.error(`Couldn't add "${file.name}" to the note.`);
    });
}

/**
 * The stock Image node plus a `storageKey` attribute alongside `src`, and (for
 * the interactive editor only) paste/drop handling that uploads a dropped or
 * pasted image file before inserting it. The URL in `src` is what renders the
 * image; `storageKey` is kept so a future change to the image proxy's
 * configuration could re-derive a fresh URL without re-uploading. Block-level
 * (`inline: false`) since a note image is its own paragraph, not a character
 * within one, and base64 sources are rejected — every image must go through
 * the upload endpoint so it lives in storage, not inline in `ContentJson`.
 */
const NoteImage = TiptapImage.extend<NoteImageOptions>({
  addOptions() {
    return {
      ...(this.parent?.() as ImageOptions),
      onUploadImage: undefined,
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      // Custom attribute names survive live editing (ProseMirror sets DOM
      // attributes directly, case intact) but not a round trip through an
      // HTML string — `DOMParser(..., "text/html")` lowercases attribute
      // names, so the default `element.getAttribute("storageKey")` fallback
      // would miss it. The importer's `generateJSON(html, ...)` step is
      // exactly that round trip, so this needs an explicit, already-lowercase
      // `data-*` mapping.
      storageKey: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-storage-key"),
        renderHTML: (attributes) =>
          attributes.storageKey ? { "data-storage-key": attributes.storageKey } : {},
      },
    };
  },
  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() ?? [];
    const onUploadImage = this.options.onUploadImage;
    if (!onUploadImage) return parentPlugins;

    const editor = this.editor;

    return [
      ...parentPlugins,
      new Plugin({
        key: new PluginKey("noteImageUpload"),
        props: {
          handlePaste(view, event) {
            const files = imageFilesOf(event.clipboardData?.files);
            if (files.length === 0) return false;

            event.preventDefault();
            const pos = view.state.selection.from;
            files.forEach((file) => insertUploadedImage(editor, onUploadImage, pos, file));
            return true;
          },
          handleDrop(view, event) {
            const files = imageFilesOf(event.dataTransfer?.files);
            if (files.length === 0) return false;

            event.preventDefault();
            const coords = { left: event.clientX, top: event.clientY };
            const pos = view.posAtCoords(coords)?.pos ?? view.state.selection.from;
            files.forEach((file) => insertUploadedImage(editor, onUploadImage, pos, file));
            return true;
          },
        },
      }),
    ];
  },
}).configure({ inline: false, allowBase64: false });

/**
 * The note editor's node/mark schema, shared by the editable editor and the
 * read-only renderer so both always agree on what a stored document can contain.
 *
 * **This is the extension point for referencing other entities.** A recipe or
 * shopping-list reference becomes a custom Tiptap node appended to this array —
 * conventionally an inline, atomic node named `entityReference` with
 * `attrs: { entityType, entityId, label }` and no text child. The backend
 * extractor already understands that shape: `NoteContent.AppendObjectNode`
 * flattens a node's `attrs.label` into the search index, so a referenced
 * recipe stays findable by name without any backend change. Registering the
 * node here makes it render in both modes at once.
 *
 * Pass `onUploadImage` for an interactive editor to enable paste/drop image
 * upload; omit it for read-only rendering and for document conversion (e.g.
 * the Samsung Notes importer), neither of which needs it.
 */
export function createNoteExtensions(onUploadImage?: UploadNoteImageFn): Extensions {
  return [
    StarterKit.configure({
      // The note is a body of prose, not a document — a horizontal rule adds a
      // structural affordance the toolbar has no room to explain.
      horizontalRule: false,
    }),
    Placeholder.configure({ placeholder: NOTE_PLACEHOLDER }),
    NoteImage.configure({ onUploadImage }),
  ];
}

export const noteExtensions: Extensions = createNoteExtensions();
