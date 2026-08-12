import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EmbeddedListNodeView } from "@/components/notes/embeddedListNodeView";

export const LIST_EMBED_NODE = "listEmbed";

const PARAGRAPH_NODE = "paragraph";
const LIST_ID_ATTRIBUTE = "data-list-id";
const LIST_LABEL_ATTRIBUTE = "data-list-label";

export interface ListEmbedAttributes {
  listId: number;
  label: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    listEmbed: {
      /** Inserts a reference to an existing list at the caret. */
      insertListEmbed: (attributes: ListEmbedAttributes) => ReturnType;
    };
  }
}

/**
 * A reference to one of the household's lists, rendered as an interactive card
 * by `EmbeddedListNodeView`.
 *
 * The document stores only `listId` and `label` — never the items. Item state
 * lives in the checklist API, which is what lets a note and the `/lists/{id}`
 * page show the same list, and what keeps ticking an item off from dirtying the
 * note and waking autosave.
 *
 * `label` is the list's name as of insertion. It is deliberately never
 * refreshed: writing it back would be a document edit. It earns its place by
 * being what `NoteContent.ExtractPlainText` harvests server-side (it flattens
 * any node's `attrs.label`), so an embedded list keeps the note findable by the
 * list's name with no backend change — at the cost of going stale if the list is
 * later renamed, until the note is next edited.
 */
export const ListEmbed = Node.create({
  name: LIST_EMBED_NODE,
  group: "block",
  // The card is UI, not editable prose — it has no content and behaves as one
  // unit to selection and deletion.
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      // Both attributes map to explicit, already-lowercase `data-*` names for
      // the same reason `NoteImage.storageKey` does: the importer's
      // `generateJSON(html, …)` step round-trips through `DOMParser`, which
      // lowercases attribute names and would miss a camelCase one.
      listId: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute(LIST_ID_ATTRIBUTE);
          const parsed = Number(raw);
          return raw !== null && Number.isFinite(parsed) ? parsed : null;
        },
        renderHTML: (attributes) =>
          attributes.listId == null ? {} : { [LIST_ID_ATTRIBUTE]: String(attributes.listId) },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute(LIST_LABEL_ATTRIBUTE),
        renderHTML: (attributes) =>
          attributes.label ? { [LIST_LABEL_ATTRIBUTE]: attributes.label } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-list-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-list-embed": "" })];
  },

  addCommands() {
    return {
      insertListEmbed:
        ({ listId, label }) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: LIST_EMBED_NODE, attrs: { listId, label } })
            // An atom as the very last node leaves nowhere to type. Gapcursor
            // (from StarterKit) can reach the gap with a keyboard, but not
            // reliably by touch, so give the caret a real paragraph instead.
            .command(({ tr, state, dispatch }) => {
              if (tr.doc.lastChild?.type.name !== LIST_EMBED_NODE) return true;
              if (dispatch) tr.insert(tr.doc.content.size, state.schema.nodes[PARAGRAPH_NODE].create());
              return true;
            })
            .run(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbeddedListNodeView);
  },
});
