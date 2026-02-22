"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { Something } from "@/lib/api-client/models/index";

// Custom hook for fetching somethings
export function useSomethings() {
  return useQuery({
    queryKey: ["somethings"],
    queryFn: () => apiClient.api.somethings.get() as Promise<Something[]>,
  });
}

// Custom hook for creating a something
export function useCreateSomething() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (something: { name: string }) =>
      apiClient.api.somethings.post({ name: something.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["somethings"] });
    },
  });
}

// Custom hook for updating a something
export function useUpdateSomething() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiClient.api.somethings.byId(id).put({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["somethings"] });
    },
  });
}

// Custom hook for deleting a something
export function useDeleteSomething() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.somethings.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["somethings"] });
    },
  });
}
