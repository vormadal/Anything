"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { useCreateNote, useUpdateNote } from "@/hooks/useNotes";
import {
  deriveNoteTitle,
  hasCompletedFirstLine,
  isNoteDocumentEmpty,
  serializeNoteDocument,
} from "@/lib/notes/noteDocument";

/** What the header's save indicator has to say about the note right now. */
export type NoteSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

/** Quiet period after the last keystroke before a save goes out. */
export const AUTOSAVE_DELAY_MS = 800;

interface UseNoteAutosaveOptions {
  /** Omitted for a note that does not exist yet — it is created on first save. */
  noteId?: number;
  initialTitle: string;
  initialDocument: JSONContent;
  /** Called once with the id the API assigned, when the note is created. */
  onCreated?: (id: number) => void;
}

export interface NoteAutosave {
  /** The live title: follows the first line until the user renames the note. */
  title: string;
  status: NoteSaveStatus;
  /** Feed every editor update here — saving is debounced. */
  setDocument: (document: JSONContent) => void;
  /** Explicit rename; stops the title from following the first line. */
  renameTitle: (title: string) => void;
}

interface SavedState {
  contentJson: string;
  title: string;
}

/**
 * Keeps a note saved as it is written, so the editor needs no Save button.
 *
 * Two rules shape it. The title is derived from the first line rather than
 * entered, and only stops tracking it once the user renames the note by hand.
 * And a note that has never been saved is not created on the first keystroke —
 * it waits until the first line is finished (or until the user leaves with
 * something written), so opening the editor and changing your mind leaves no
 * empty note behind.
 */
export function useNoteAutosave({
  noteId,
  initialTitle,
  initialDocument,
  onCreated,
}: UseNoteAutosaveOptions): NoteAutosave {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<NoteSaveStatus>("idle");

  const idRef = useRef(noteId);
  const titleRef = useRef(initialTitle);
  const documentRef = useRef(initialDocument);
  const savedRef = useRef<SavedState | null>(
    noteId === undefined
      ? null
      : { contentJson: serializeNoteDocument(initialDocument), title: initialTitle },
  );
  // A title that still matches what the body derives was never chosen by hand,
  // so it keeps following the first line. Renaming freezes it.
  const titleIsAutoRef = useRef(
    noteId === undefined || initialTitle === deriveNoteTitle(initialDocument),
  );
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const stoppedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Held in a ref so the save callbacks stay stable across renders — they are
  // wired into a timer and an unmount handler that must not be rebuilt.
  const handlersRef = useRef({ createNote, updateNote, onCreated });
  useEffect(() => {
    handlersRef.current = { createNote, updateNote, onCreated };
  });

  const saveOnce = useCallback(async (force: boolean) => {
    const document = documentRef.current;
    const contentJson = serializeNoteDocument(document);
    const nextTitle = titleIsAutoRef.current ? deriveNoteTitle(document) : titleRef.current;

    const saved = savedRef.current;
    if (saved?.contentJson === contentJson && saved?.title === nextTitle) return;

    const id = idRef.current;
    const worthCreating = hasCompletedFirstLine(document) || (force && !isNoteDocumentEmpty(document));
    if (id === undefined && !worthCreating) return;

    setStatus("saving");
    const { createNote: create, updateNote: update, onCreated: notifyCreated } = handlersRef.current;

    try {
      if (id === undefined) {
        const created = await create.mutateAsync({ title: nextTitle, contentJson });
        if (!created?.id) {
          // Without an id every later save would create another copy of the
          // note, so stop rather than spam the household's list.
          stoppedRef.current = true;
          setStatus("error");
          return;
        }
        idRef.current = created.id;
        notifyCreated?.(created.id);
      } else {
        await update.mutateAsync({ id, title: nextTitle, contentJson });
      }

      savedRef.current = { contentJson, title: nextTitle };
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  /** Runs one save at a time, re-running if edits landed while it was in flight. */
  const persist = useCallback(
    async (force = false) => {
      if (stoppedRef.current) return;
      if (savingRef.current) {
        queuedRef.current = true;
        return;
      }

      savingRef.current = true;
      try {
        do {
          queuedRef.current = false;
          await saveOnce(force);
        } while (queuedRef.current);
      } finally {
        savingRef.current = false;
      }
    },
    [saveOnce],
  );

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    cancelPending();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persist();
    }, AUTOSAVE_DELAY_MS);
  }, [cancelPending, persist]);

  const setDocument = useCallback(
    (document: JSONContent) => {
      documentRef.current = document;

      if (titleIsAutoRef.current) {
        const derived = deriveNoteTitle(document);
        if (derived !== titleRef.current) {
          titleRef.current = derived;
          setTitle(derived);
        }
      }

      setStatus("unsaved");
      scheduleSave();
    },
    [scheduleSave],
  );

  const renameTitle = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      if (!trimmed) return;

      titleIsAutoRef.current = false;
      if (trimmed === titleRef.current) return;

      titleRef.current = trimmed;
      setTitle(trimmed);
      setStatus("unsaved");
      // A rename is an explicit act, so it does not wait out the debounce.
      cancelPending();
      void persist();
    },
    [cancelPending, persist],
  );

  // Leaving the page must not drop the last few keystrokes — flush whatever the
  // debounce is still holding, on navigation away and on tab close alike.
  useEffect(() => {
    const flush = () => {
      cancelPending();
      void persist(true);
    };

    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [cancelPending, persist]);

  return { title, status, setDocument, renameTitle };
}
