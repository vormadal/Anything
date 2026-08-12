"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  BetweenHorizontalStart,
  Rows3,
  BetweenVerticalStart,
  Columns3,
  PanelTop,
  Trash2,
  Image as ImageIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { UploadNoteImageFn } from "@/lib/notes/extensions";

interface ToolbarAction {
  label: string;
  icon: typeof Bold;
  run: (editor: Editor) => void;
  /** Whether the mark/node is active at the cursor — drives aria-pressed. */
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
}

const HEADING_ONE = 1 as const;
const HEADING_TWO = 2 as const;
const NEW_TABLE = { rows: 3, cols: 3, withHeaderRow: true };

const FORMATTING_ACTIONS: ToolbarAction[] = [
  {
    label: "Bold",
    icon: Bold,
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
  },
  {
    label: "Italic",
    icon: Italic,
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
  },
  {
    label: "Strikethrough",
    icon: Strikethrough,
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
  },
  {
    label: "Heading 1",
    icon: Heading1,
    run: (editor) => editor.chain().focus().toggleHeading({ level: HEADING_ONE }).run(),
    isActive: (editor) => editor.isActive("heading", { level: HEADING_ONE }),
  },
  {
    label: "Heading 2",
    icon: Heading2,
    run: (editor) => editor.chain().focus().toggleHeading({ level: HEADING_TWO }).run(),
    isActive: (editor) => editor.isActive("heading", { level: HEADING_TWO }),
  },
  {
    label: "Bullet list",
    icon: List,
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
  },
  {
    label: "Numbered list",
    icon: ListOrdered,
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
  },
  {
    label: "Quote",
    icon: Quote,
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
  },
  {
    label: "Code block",
    icon: Code,
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive("codeBlock"),
  },
  {
    label: "Insert table",
    icon: Table,
    run: (editor) => editor.chain().focus().insertTable(NEW_TABLE).run(),
    // Not `!editor.can().insertTable(...)`: a cell's content is `block+`, so
    // the schema happily nests a table inside a table. Neither importer can
    // produce that and it is miserable to edit, so the button closes the door.
    isDisabled: (editor) => editor.isActive("table"),
  },
];

/**
 * Shown only while the caret is inside a table. Rows and columns are added
 * after the current one; "before" variants would double the button count for
 * an operation the user can also get by adding after the previous row.
 */
const TABLE_ACTIONS: ToolbarAction[] = [
  {
    label: "Add row",
    icon: BetweenHorizontalStart,
    run: (editor) => editor.chain().focus().addRowAfter().run(),
  },
  {
    label: "Delete row",
    icon: Rows3,
    run: (editor) => editor.chain().focus().deleteRow().run(),
    isDisabled: (editor) => !editor.can().deleteRow(),
  },
  {
    label: "Add column",
    icon: BetweenVerticalStart,
    run: (editor) => editor.chain().focus().addColumnAfter().run(),
  },
  {
    label: "Delete column",
    icon: Columns3,
    run: (editor) => editor.chain().focus().deleteColumn().run(),
    isDisabled: (editor) => !editor.can().deleteColumn(),
  },
  {
    label: "Toggle header row",
    icon: PanelTop,
    run: (editor) => editor.chain().focus().toggleHeaderRow().run(),
    // Reports the cell the caret is in rather than the row, which is the same
    // answer for a table whose header is always its first row.
    isActive: (editor) => editor.isActive("tableHeader"),
  },
  {
    label: "Delete table",
    icon: Trash2,
    run: (editor) => editor.chain().focus().deleteTable().run(),
  },
];

const HISTORY_ACTIONS: ToolbarAction[] = [
  {
    label: "Undo",
    icon: Undo2,
    run: (editor) => editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
  },
  {
    label: "Redo",
    icon: Redo2,
    run: (editor) => editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
  },
];

const ALL_ACTIONS = [...FORMATTING_ACTIONS, ...TABLE_ACTIONS, ...HISTORY_ACTIONS];

const ROW_CLASSES = "flex flex-wrap items-center gap-0.5 px-2 py-1.5";
const BUTTON_BASE =
  "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const BUTTON_ACTIVE = "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
const BUTTON_INACTIVE =
  "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white";

/** Whether each action is currently active/disabled, keyed by its label. */
type ActionFlags = Record<string, boolean>;

function flagsFor(editor: Editor, read: (action: ToolbarAction) => boolean | undefined): ActionFlags {
  return Object.fromEntries(ALL_ACTIONS.map((action) => [action.label, read(action) ?? false]));
}

function ToolbarButton({
  action,
  editor,
  active,
  disabled,
}: {
  action: ToolbarAction;
  editor: Editor;
  active: boolean;
  disabled: boolean;
}) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      // The editor loses focus when a toolbar button takes it, which collapses
      // the selection the command is meant to act on.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => action.run(editor)}
      disabled={disabled}
      aria-label={action.label}
      aria-pressed={action.isActive ? active : undefined}
      title={action.label}
      className={`${BUTTON_BASE} ${active ? BUTTON_ACTIVE : BUTTON_INACTIVE}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * Unlike the declarative `ToolbarAction`s above, adding an image is
 * asynchronous (upload, then insert) and needs its own file input, so it
 * can't be expressed as a plain `run(editor)` callback.
 */
function ImageToolbarButton({
  editor,
  onUploadImage,
}: {
  editor: Editor;
  onUploadImage: UploadNoteImageFn;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isOnline = useOnlineStatus();

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { src, storageKey } = await onUploadImage(file);
      editor.chain().focus().insertContent({ type: "image", attrs: { src, storageKey } }).run();
    } catch {
      toast.error(`Couldn't add "${file.name}" to the note.`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        disabled={uploading || !isOnline}
        aria-label="Add image"
        title={isOnline ? "Add image" : "Adding an image requires an internet connection"}
        className={`${BUTTON_BASE} ${BUTTON_INACTIVE}`}
      >
        <ImageIcon className="h-4 w-4" />
      </button>
    </>
  );
}

export function NoteEditorToolbar({
  editor,
  onUploadImage,
}: {
  editor: Editor;
  onUploadImage: UploadNoteImageFn;
}) {
  // `useEditor` does not re-render on transactions (v3 defaults
  // `shouldRerenderOnTransaction` to false), and moving the caret changes no
  // React state, so reading `editor.isActive(...)` during render would go
  // stale the moment the selection moved without an edit — including when the
  // caret enters a table, which is exactly what the second row keys off.
  // `useEditorState` subscribes to the editor and compares its result deeply,
  // so this re-renders when a flag actually flips, not on every keystroke.
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      inTable: current.isActive("table"),
      active: flagsFor(current, (action) => action.isActive?.(current)),
      disabled: flagsFor(current, (action) => action.isDisabled?.(current)),
    }),
  });

  const renderAction = (action: ToolbarAction) => (
    <ToolbarButton
      key={action.label}
      action={action}
      editor={editor}
      active={state.active[action.label]}
      disabled={state.disabled[action.label]}
    />
  );

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div role="toolbar" aria-label="Formatting" className={ROW_CLASSES}>
        {FORMATTING_ACTIONS.map(renderAction)}
        <ImageToolbarButton editor={editor} onUploadImage={onUploadImage} />
        <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
        {HISTORY_ACTIONS.map(renderAction)}
      </div>
      {/* A sibling of the formatting row, not a child: nesting one `toolbar`
          role inside another is invalid ARIA. */}
      {state.inTable && (
        <div
          role="toolbar"
          aria-label="Table"
          className={`${ROW_CLASSES} border-t border-gray-100 dark:border-gray-700`}
        >
          {TABLE_ACTIONS.map(renderAction)}
        </div>
      )}
    </div>
  );
}
