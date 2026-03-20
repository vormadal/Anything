"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiClient.api as any;

export interface Location {
  id: number;
  name: string;
  createdOn: string;
  modifiedOn?: string;
  deletedOn?: string;
}

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: () =>
      api.locations.get() as Promise<Location[]>,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.locations.post({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.locations.byId(id).put({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.locations.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
