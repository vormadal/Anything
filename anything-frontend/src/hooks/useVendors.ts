"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiClient.api as any;

export interface Vendor {
  id: number;
  name: string;
  website?: string;
  createdOn: string;
  modifiedOn?: string;
  deletedOn?: string;
}

export function useVendors() {
  return useQuery({
    queryKey: ["vendors"],
    queryFn: () =>
      api.vendors.get() as Promise<Vendor[]>,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, website }: { name: string; website?: string }) =>
      api.vendors.post({ name, website: website ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      website,
    }: {
      id: number;
      name: string;
      website?: string;
    }) =>
      api.vendors.byId(id).put({ name, website: website ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.vendors.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}
