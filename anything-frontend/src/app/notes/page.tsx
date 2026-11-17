"use client";

import { useRouter } from "next/navigation";
import { useNotes } from "@/hooks/useNotes";
import { usePageActions } from "@/hooks/usePageActions";
import { PageTitle } from "@/components/PageTitle";
import { ChevronRight, Plus, Upload } from "lucide-react";
import { LoadErrorState } from "@/components/LoadErrorState";
import { loadFailure } from "@/lib/queryState";

const IMPORT_LABEL = "Import notes";

export default function NotesPage() {
  const router = useRouter();
  const notesQuery = useNotes();
  const { data: notes, isLoading } = notesQuery;
  const notesLoad = loadFailure(notesQuery);

  usePageActions([
    { label: "New note", icon: Plus, href: "/notes/new" },
    { label: IMPORT_LABEL, icon: Upload, href: "/notes/import" },
  ]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <PageTitle>Notes</PageTitle>

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {notesLoad.failed && (
        <LoadErrorState what="notes" onRetry={notesLoad.retry} isRetrying={notesLoad.isRetrying} />
      )}

      {notes?.length === 0 && !isLoading && !notesLoad.failed && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No notes yet. Tap + to write your first one!
        </div>
      )}

      {notes && notes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => router.push(`/notes/${note.id}`)}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                  {note.title}
                </span>
                {note.snippet && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                    {note.snippet}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
