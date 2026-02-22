"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  boxId?: number;
  storageUnitId?: number;
  createdOn: string;
  modifiedOn?: string;
  deletedOn?: string;
}

// Custom hook for fetching inventory items
export function useInventoryItems() {
  return useQuery({
    queryKey: ["inventoryItems"],
    queryFn: () => apiClient.get<InventoryItem[]>("/api/inventory-items"),
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
    }) => apiClient.post<InventoryItem>("/api/inventory-items", item),
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
      apiClient.put(`/api/inventory-items/${id}`, {
        name,
        description,
        boxId,
        storageUnitId,
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
    mutationFn: (id: number) => apiClient.delete(`/api/inventory-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
  });
}
