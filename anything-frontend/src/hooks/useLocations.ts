"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateLocationRequest } from "@/lib/api-client/models/index";

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

