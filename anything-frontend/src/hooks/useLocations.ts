"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateLocationRequest, UpdateLocationRequest } from "@/lib/api-client/models/index";

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
      apiClient.api.locations.get() as unknown as Promise<Location[]>,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => {
      const body: CreateLocationRequest = { name };
      return apiClient.api.locations.post(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => {
      const body: UpdateLocationRequest = { name };
      return apiClient.api.locations.byId(id).put(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.locations.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
