"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch, API_BASE_URL } from "@/lib/apiClient";

async function vendorsFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json();
}

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
    queryFn: () => vendorsFetch<Vendor[]>("/api/vendors"),
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, website }: { name: string; website?: string }) =>
      vendorsFetch<Vendor>("/api/vendors", {
        method: "POST",
        body: JSON.stringify({ name, website: website ?? null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, website }: { id: number; name: string; website?: string }) =>
      vendorsFetch<void>(`/api/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, website: website ?? null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      vendorsFetch<void>(`/api/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}
