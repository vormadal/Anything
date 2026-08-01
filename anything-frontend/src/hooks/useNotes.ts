"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, buildFileUploadBody } from "@/lib/apiClient";
import { UPLOAD_TOO_LARGE_MESSAGE, assertUploadSize, prepareImageForUpload } from "@/lib/images";
import type { NoteResponse, NoteSummaryResponse } from "@/lib/api-client/models/index";

export type { NoteResponse, NoteSummaryResponse };

/** Where an uploaded note image now lives — the fields the backend always returns. */
export interface UploadedNoteImage {
  url: string;
  storageKey: string;
}

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

/**
 * Uploads an image for a note body and returns where it lives — a note id
 * isn't required (see the backend's `UploadNoteImageHandler`), so this can run
 * before the note itself has been created.
 */
export function useUploadNoteImage() {
  return useMutation({
    mutationFn: async (imageFile: File): Promise<UploadedNoteImage> => {
      const file = await prepareImageForUpload(imageFile);
      assertUploadSize(file);

      const multipartBody = await buildFileUploadBody(file);

      try {
        const image = await apiClient.api.notes.images.post(multipartBody);
        if (!image?.url || !image.storageKey) {
          throw new Error("No response returned for the uploaded image");
        }
        return { url: image.url, storageKey: image.storageKey };
      } catch (e) {
        const kiota = e as { responseStatusCode?: number; message?: string };
        if (kiota.responseStatusCode === 413) {
          throw new Error(UPLOAD_TOO_LARGE_MESSAGE);
        }
        throw new Error(kiota.message || "Failed to upload image");
      }
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
