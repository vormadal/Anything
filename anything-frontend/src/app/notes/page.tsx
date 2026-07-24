"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotes } from "@/hooks/useNotes";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus } from "lucide-react";

export default function NotesPage() {
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();
  const { data: notes, isLoading, error } = useNotes();

  useEffect(() => {
    setHeaderActions(
      <Link
        href="/notes/new"
        aria-label="Create note"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
      >
        <Plus className="h-5 w-5" />
      </Link>,
      false
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <PageTitle>Notes</PageTitle>

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">
          Failed to load notes. Please try again later.
        </div>
      )}

      {notes?.length === 0 && !isLoading && !error && (
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
