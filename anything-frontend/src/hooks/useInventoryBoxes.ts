"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { InventoryBox } from "@/lib/api-client/models/index";

// Custom hook for fetching inventory boxes
export function useInventoryBoxes() {
  return useQuery({
    queryKey: ["inventoryBoxes"],
    queryFn: () =>
      apiClient.api.inventoryBoxes.get() as Promise<InventoryBox[]>,
  });
}

// Custom hook for creating an inventory box
export function useCreateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (box: { number: number; storageUnitId?: number }) =>
      apiClient.api.inventoryBoxes.post({
        number: box.number,
        storageUnitId: box.storageUnitId ?? null,
      }),
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
    }) =>
      apiClient.api.inventoryBoxes
        .byId(id)
        .put({ number, storageUnitId: storageUnitId ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryBoxes"] });
    },
  });
}

// Custom hook for deleting an inventory box
export function useDeleteInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.inventoryBoxes.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryBoxes"] });
    },
  });
}
