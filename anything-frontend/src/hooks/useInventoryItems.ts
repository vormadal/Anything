"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { InventoryItem } from "@/lib/api-client/models/index";

// Custom hook for fetching inventory items
export function useInventoryItems() {
  return useQuery({
    queryKey: ["inventoryItems"],
    queryFn: () =>
      apiClient.api.inventoryItems.get() as Promise<InventoryItem[]>,
  });
}

// Custom hook for creating an inventory item
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: {
      name: string;
      description?: string;
      boxId?: number;
      storageUnitId?: number;
    }) =>
      apiClient.api.inventoryItems.post({
        name: item.name,
        description: item.description ?? null,
        boxId: item.boxId ?? null,
        storageUnitId: item.storageUnitId ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
  });
}

// Custom hook for updating an inventory item
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      name,
      description,
      boxId,
      storageUnitId,
    }: {
      id: number;
      name: string;
      description?: string;
      boxId?: number;
      storageUnitId?: number;
    }) =>
      apiClient.api.inventoryItems.byId(id).put({
        name,
        description: description ?? null,
        boxId: boxId ?? null,
        storageUnitId: storageUnitId ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
  });
}

// Custom hook for deleting an inventory item
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.inventoryItems.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
  });
}
