"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateVendorRequest, UpdateVendorRequest } from "@/lib/api-client/models/index";

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
      apiClient.api.vendors.get() as unknown as Promise<Vendor[]>,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, website }: { name: string; website?: string }) => {
      const body: CreateVendorRequest = { name, website: website ?? null };
      return apiClient.api.vendors.post(body);
    },
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
    }) => {
      const body: UpdateVendorRequest = { name, website: website ?? null };
      return apiClient.api.vendors.byId(id).put(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.vendors.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}
