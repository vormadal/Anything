"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

// NOTE: locations route is not yet in the generated Kiota client.
// Until `npm run generate:api` is run against the updated backend, this route
// must be accessed via a cast. The interface below mirrors the contract type.
interface LocationByIdShape {
  put: (body: { name: string }) => Promise<void>;
  delete: () => Promise<void>;
}
interface LocationsApiShape {
  get: () => Promise<Location[]>;
  post: (body: { name: string }) => Promise<Location>;
  byId: (id: number) => LocationByIdShape;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const locationsApi = (apiClient.api as any).locations as LocationsApiShape;

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
      locationsApi.get() as Promise<Location[]>,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      locationsApi.post({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      locationsApi.byId(id).put({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      locationsApi.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
