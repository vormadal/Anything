"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { InventoryStorageUnit } from "@/lib/api-client/models/index";

// Custom hook for fetching inventory storage units
export function useInventoryStorageUnits() {
  return useQuery({
    queryKey: ["inventoryStorageUnits"],
    queryFn: () =>
      apiClient.api.inventoryStorageUnits.get() as Promise<
        InventoryStorageUnit[]
      >,
  });
}

// Custom hook for creating an inventory storage unit
export function useCreateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storageUnit: { name: string; type?: string }) =>
      apiClient.api.inventoryStorageUnits.post({
        name: storageUnit.name,
        type: storageUnit.type ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryStorageUnits"] });
    },
  });
}

// Custom hook for updating an inventory storage unit
export function useUpdateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      name,
      type,
    }: {
      id: number;
      name: string;
      type?: string;
    }) =>
      apiClient.api.inventoryStorageUnits
        .byId(id)
        .put({ name, type: type ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryStorageUnits"] });
    },
  });
}

// Custom hook for deleting an inventory storage unit
export function useDeleteInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.inventoryStorageUnits.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryStorageUnits"] });
    },
  });
}
