"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface Something {
  id: number;
  name: string;
  createdOn: string;
  modifiedOn?: string;
  deletedOn?: string;
}

// Custom hook for fetching somethings
export function useSomethings() {
  return useQuery({
    queryKey: ["somethings"],
    queryFn: () => apiClient.get<Something[]>("/api/somethings"),
  });
}

// Custom hook for creating a something
export function useCreateSomething() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (something: { name: string }) =>
      apiClient.post<Something>("/api/somethings", something),
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
      apiClient.put(`/api/somethings/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["somethings"] });
    },
  });
}

// Custom hook for deleting a something
export function useDeleteSomething() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/somethings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["somethings"] });
    },
  });
}
