"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { NoteResponse, NoteSummaryResponse } from "@/lib/api-client/models/index";

export type { NoteResponse, NoteSummaryResponse };

const NOTES_KEY = ["notes"] as const;

/** Body shared by create and update — the editor document plus its title. */
export interface NoteInput {
  title: string;
  contentJson?: string | null;
}

/**
 * The household's notes, most recently modified first. Pass `limit` for callers
 * that only need the top few (the home card); omit it for the full list.
 */
export function useNotes(limit?: number) {
  return useQuery({
    queryKey: [...NOTES_KEY, limit ?? null],
    // Refetch on re-entry so a note created or edited on the detail page shows
    // without a manual refresh — same reasoning as useRecipes (issue #571).
    refetchOnMount: "always",
    queryFn: async (): Promise<NoteSummaryResponse[]> => {
      const notes = await apiClient.api.notes.get({ queryParameters: { limit } });
      return notes ?? [];
    },
  });
}

export function useNote(id: number) {
  return useQuery({
    queryKey: ["note", id],
    enabled: id > 0,
    refetchOnMount: "always",
    queryFn: () => apiClient.api.notes.byId(id).get() as Promise<NoteResponse>,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: NoteInput) =>
      apiClient.api.notes.post({ title: note.title, contentJson: note.contentJson }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: NoteInput & { id: number }) =>
      apiClient.api.notes.byId(note.id).put({ title: note.title, contentJson: note.contentJson }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      queryClient.invalidateQueries({ queryKey: ["note", variables.id] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.notes.byId(id).delete(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      queryClient.removeQueries({ queryKey: ["note", id] });
    },
  });
}
