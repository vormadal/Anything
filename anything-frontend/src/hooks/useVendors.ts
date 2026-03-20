"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

// NOTE: vendors route is not yet in the generated Kiota client.
// Until `npm run generate:api` is run against the updated backend, this route
// must be accessed via a cast. The interface below mirrors the contract type.
interface VendorByIdShape {
  put: (body: { name: string; website?: string | null }) => Promise<void>;
  delete: () => Promise<void>;
}
interface VendorsApiShape {
  get: () => Promise<Vendor[]>;
  post: (body: { name: string; website?: string | null }) => Promise<Vendor>;
  byId: (id: number) => VendorByIdShape;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vendorsApi = (apiClient.api as any).vendors as VendorsApiShape;

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
      vendorsApi.get() as Promise<Vendor[]>,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, website }: { name: string; website?: string }) =>
      vendorsApi.post({ name, website: website ?? null }),
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
      vendorsApi.byId(id).put({ name, website: website ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      vendorsApi.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}
