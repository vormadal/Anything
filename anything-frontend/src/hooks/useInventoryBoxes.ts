"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface InventoryBox {
  id: number;
  number: number;
  storageUnitId?: number;
  createdOn: string;
  modifiedOn?: string;
  deletedOn?: string;
}

// Custom hook for fetching inventory boxes
export function useInventoryBoxes() {
  return useQuery({
    queryKey: ["inventoryBoxes"],
    queryFn: () => apiClient.get<InventoryBox[]>("/api/inventory-boxes"),
  });
}

// Custom hook for creating an inventory box
export function useCreateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (box: { number: number; storageUnitId?: number }) =>
      apiClient.post<InventoryBox>("/api/inventory-boxes", box),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryBoxes"] });
    },
  });
}

// Custom hook for updating an inventory box
export function useUpdateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      number,
      storageUnitId,
    }: {
      id: number;
      number: number;
      storageUnitId?: number;
    }) => apiClient.put(`/api/inventory-boxes/${id}`, { number, storageUnitId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryBoxes"] });
    },
  });
}

// Custom hook for deleting an inventory box
export function useDeleteInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/inventory-boxes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryBoxes"] });
    },
  });
}
