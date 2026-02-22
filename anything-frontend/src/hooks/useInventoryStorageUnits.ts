"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface InventoryStorageUnit {
  id: number;
  name: string;
  type?: string;
  createdOn: string;
  modifiedOn?: string;
  deletedOn?: string;
}

// Custom hook for fetching inventory storage units
export function useInventoryStorageUnits() {
  return useQuery({
    queryKey: ["inventoryStorageUnits"],
    queryFn: () =>
      apiClient.get<InventoryStorageUnit[]>("/api/inventory-storage-units"),
  });
}

// Custom hook for creating an inventory storage unit
export function useCreateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storageUnit: { name: string; type?: string }) =>
      apiClient.post<InventoryStorageUnit>(
        "/api/inventory-storage-units",
        storageUnit
      ),
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
      apiClient.put(`/api/inventory-storage-units/${id}`, { name, type }),
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
      apiClient.delete(`/api/inventory-storage-units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryStorageUnits"] });
    },
  });
}
