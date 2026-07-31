"use client";

import type { Editor } from "@tiptap/react";
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

const BUTTON_BASE =
  "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const BUTTON_ACTIVE = "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
const BUTTON_INACTIVE =
  "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white";

function ToolbarButton({ action, editor }: { action: ToolbarAction; editor: Editor }) {
  const Icon = action.icon;
  const active = action.isActive?.(editor) ?? false;

  return (
    <button
      type="button"
      // The editor loses focus when a toolbar button takes it, which collapses
      // the selection the command is meant to act on.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => action.run(editor)}
      disabled={action.isDisabled?.(editor) ?? false}
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
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-1.5 dark:border-gray-700"
    >
      {FORMATTING_ACTIONS.map((action) => (
        <ToolbarButton key={action.label} action={action} editor={editor} />
      ))}
      <ImageToolbarButton editor={editor} onUploadImage={onUploadImage} />
      <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
      {HISTORY_ACTIONS.map((action) => (
        <ToolbarButton key={action.label} action={action} editor={editor} />
      ))}
    </div>
  );
}
