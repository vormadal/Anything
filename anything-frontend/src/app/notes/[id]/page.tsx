"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useNote, useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NoteForm, type NoteFormValues } from "@/components/notes/NoteForm";
import { isNoteDocumentEmpty, parseNoteDocument } from "@/lib/notes/noteDocument";

const NoteContentView = dynamic(
  () => import("@/components/notes/NoteContentView").then((m) => m.NoteContentView),
  { ssr: false, loading: () => <div className="h-24" aria-busy="true" /> }
);

const NOTES_PATH = "/notes";
const OFFLINE_EDIT_TITLE = "Editing a note requires an internet connection";

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
  const { setHeaderActions, setLeftAction } = useHeaderActions();

  const editParam = searchParams.get("edit") === "true";
  const [isEditMode, setIsEditMode] = useState(editParam);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: note, isLoading, error } = useNote(noteId);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    setIsEditMode(editParam);
  }, [editParam]);

  const noteDocument = useMemo(() => parseNoteDocument(note?.contentJson), [note?.contentJson]);

  useEffect(() => {
    setLeftAction({ type: "back", href: NOTES_PATH });
    setHeaderActions(
      isEditMode ? null : (
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit note"
            disabled={!isOnline}
            title={isOnline ? undefined : OFFLINE_EDIT_TITLE}
            onClick={() => {
              setIsEditMode(true);
              routerRef.current.push("?edit=true");
            }}
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onSelect={() => setDeleteConfirmOpen(true)}
                disabled={!isOnline}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    );

    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [isEditMode, isOnline, setHeaderActions, setLeftAction]);

  const leaveEditMode = () => {
    setIsEditMode(false);
    routerRef.current.replace(`${NOTES_PATH}/${noteId}`);
  };

  const handleSave = async (values: NoteFormValues) => {
    try {
      await updateNote.mutateAsync({ id: noteId, ...values });
      leaveEditMode();
    } catch {
      toast.error("Failed to save note");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync(noteId);
      setDeleteConfirmOpen(false);
      // Terminal action that navigates away — the note list can't show what is
      // no longer there, so confirm the outcome out of band.
      toast.success("Note deleted");
      router.push(NOTES_PATH);
    } catch {
      toast.error("Failed to delete note");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <PageTitle>Note</PageTitle>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">
          Failed to load this note. It may have been deleted.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <PageTitle>{note.title ?? "Note"}</PageTitle>

      {isEditMode ? (
        <NoteForm
          initialTitle={note.title ?? ""}
          initialDocument={noteDocument}
          submitLabel="Save"
          isPending={updateNote.isPending}
          onSubmit={handleSave}
          onCancel={leaveEditMode}
        />
      ) : (
        <article className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{note.title}</h2>
          {isNoteDocumentEmpty(noteDocument) ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              This note is empty. Tap the pencil to add something.
            </p>
          ) : (
            <NoteContentView content={noteDocument} />
          )}
        </article>
      )}

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete note</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Delete &quot;{note.title}&quot;? This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteNote.isPending || !isOnline}
              title={isOnline ? undefined : "Deleting a note requires an internet connection"}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
