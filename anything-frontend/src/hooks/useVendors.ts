"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateVendorRequest } from "@/lib/api-client/models/index";

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

