"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { JSONContent } from "@tiptap/react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNoteAutosave } from "@/hooks/useNoteAutosave";
import { useUploadNoteImage } from "@/hooks/useNotes";
import { EMPTY_NOTE_DOCUMENT, isNoteDocumentEmpty } from "@/lib/notes/noteDocument";
import type { UploadNoteImageFn } from "@/lib/notes/extensions";
import { NoteSaveIndicator } from "./NoteSaveIndicator";
import { RenameNoteDialog } from "./RenameNoteDialog";

// ProseMirror constructs against the DOM, so the editor can't render on the
// server; loading it lazily also keeps it out of the bundle for pages that only
// show note summaries.
const NoteEditor = dynamic(() => import("./NoteEditor").then((m) => m.NoteEditor), {
  ssr: false,
  loading: () => <div className="grow" aria-busy="true" />,
});

const NoteContentView = dynamic(
  () => import("./NoteContentView").then((m) => m.NoteContentView),
  { ssr: false, loading: () => <div className="h-24" aria-busy="true" /> },
);

export const NOTES_PATH = "/notes";

interface NoteWorkspaceProps {
  /** Omitted while writing a note that has not been created yet. */
  noteId?: number;
  initialTitle?: string;
  initialDocument?: JSONContent;
  /** Renders the note without an editor — used when there is no connection. */
  readOnly?: boolean;
  /** Adds a Delete entry to the overflow menu when provided. */
  onDelete?: () => void;
  onCreated?: (id: number) => void;
}

/**
 * The whole note screen: the title lives in the app header, everything below it
 * is the note. There is no Save button — `useNoteAutosave` persists as the user
 * writes and the header says where the save got to.
 */
export function NoteWorkspace({
  noteId,
  initialTitle = "",
  initialDocument = EMPTY_NOTE_DOCUMENT,
  readOnly = false,
  onDelete,
  onCreated,
}: NoteWorkspaceProps) {
  const { setHeaderActions, setLeftAction } = useHeaderActions();
  const [renameOpen, setRenameOpen] = useState(false);

  const { title, status, setDocument, renameTitle } = useNoteAutosave({
    noteId,
    initialTitle,
    initialDocument,
    onCreated,
  });

  const uploadNoteImage = useUploadNoteImage();
  const handleUploadImage: UploadNoteImageFn = useCallback(
    async (file) => {
      const image = await uploadNoteImage.mutateAsync(file);
      return { src: image.url, storageKey: image.storageKey };
    },
    [uploadNoteImage]
  );

  // Kept in a ref so an inline callback from the page doesn't rebuild the header
  // on every render.
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  });

  const canDelete = onDelete !== undefined;

  useEffect(() => {
    setLeftAction({ type: "back", href: NOTES_PATH });
    setHeaderActions(
      <div className="ml-auto flex items-center gap-1">
        {!readOnly && <NoteSaveIndicator status={status} />}
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rename note"
            onClick={() => setRenameOpen(true)}
          >
            <Pencil className="h-5 w-5" />
          </Button>
        )}
        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onSelect={() => onDeleteRef.current?.()}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>,
      false,
    );

    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [canDelete, readOnly, status, setHeaderActions, setLeftAction]);

  return (
    // `grow` against AppLayout's column: the note gets every pixel the header
    // leaves, full width, with no title field competing for the space.
    <div className="flex grow flex-col">
      <PageTitle>{title}</PageTitle>

      {readOnly ? (
        <ReadOnlyNote document={initialDocument} />
      ) : (
        <NoteEditor value={initialDocument} onChange={setDocument} onUploadImage={handleUploadImage} />
      )}

      <RenameNoteDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={title}
        onRename={renameTitle}
      />
    </div>
  );
}

function ReadOnlyNote({ document }: { document: JSONContent }) {
  return (
    <div className="grow bg-white px-4 py-3 dark:bg-gray-800">
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        You&apos;re offline — this note can&apos;t be edited until you reconnect.
      </p>
      {isNoteDocumentEmpty(document) ? (
        <p className="text-sm italic text-gray-500 dark:text-gray-400">This note is empty.</p>
      ) : (
        <NoteContentView content={document} />
      )}
    </div>
  );
}
