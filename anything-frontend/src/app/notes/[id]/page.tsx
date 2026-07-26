"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNote, useDeleteNote } from "@/hooks/useNotes";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NOTES_PATH, NoteWorkspace } from "@/components/notes/NoteWorkspace";
import { parseNoteDocument } from "@/lib/notes/noteDocument";

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = Number(params.id);
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: note, isLoading, error } = useNote(noteId);
  const deleteNote = useDeleteNote();

  const noteDocument = useMemo(() => parseNoteDocument(note?.contentJson), [note?.contentJson]);

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
    <>
      {/* Keyed on the note so switching notes rebuilds the editor: it reads its
          document once, on mount, so a refetch can't discard edits in flight. */}
      <NoteWorkspace
        key={noteId}
        noteId={noteId}
        initialTitle={note.title ?? ""}
        initialDocument={noteDocument}
        readOnly={!isOnline}
        onDelete={() => setDeleteConfirmOpen(true)}
      />

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
    </>
  );
}
