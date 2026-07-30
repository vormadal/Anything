"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  InventoryBoxResponse,
  InventoryItemResponse,
  InventoryItemSummaryResponse,
  InventoryStorageUnitResponse,
} from "@/lib/api-client/models/index";

export type {
  InventoryBoxResponse,
  InventoryItemResponse,
  InventoryItemSummaryResponse,
  InventoryStorageUnitResponse,
};

const STORAGE_UNITS_KEY = ["inventoryStorageUnits"] as const;
const BOXES_KEY = ["inventoryBoxes"] as const;
const ITEMS_KEY = ["inventoryItems"] as const;

const STORAGE_UNIT_KEY = "inventoryStorageUnit";
const BOX_KEY = "inventoryBox";
const ITEM_KEY = "inventoryItem";

/**
 * All three lists are fetched whole (the API returns the household's entire
 * inventory) and joined client-side to derive box/item counts, so every page
 * shares the same three cache entries rather than issuing per-parent requests.
 */

/** Body shared by create and update of a storage place. */
export interface StorageUnitInput {
  name: string;
  type?: string | null;
}

/** Body shared by create and update of a box. */
export interface BoxInput {
  number: number;
  storageUnitId?: number | null;
}

/** Body shared by create and update of an item. */
export interface ItemInput {
  name: string;
  description?: string | null;
  boxId?: number | null;
  storageUnitId?: number | null;
}

// --- Storage places -------------------------------------------------------

export function useInventoryStorageUnits() {
  return useQuery({
    queryKey: STORAGE_UNITS_KEY,
    // Refetch on re-entry so a place created or renamed on a detail page shows
    // without a manual refresh — same reasoning as useNotes/useRecipes.
    refetchOnMount: "always",
    queryFn: async (): Promise<InventoryStorageUnitResponse[]> => {
      const units = await apiClient.api.inventoryStorageUnits.get();
      return units ?? [];
    },
  });
}

export function useInventoryStorageUnit(id: number) {
  return useQuery({
    queryKey: [STORAGE_UNIT_KEY, id],
    enabled: id > 0,
    refetchOnMount: "always",
    queryFn: () =>
      apiClient.api.inventoryStorageUnits.byId(id).get() as Promise<InventoryStorageUnitResponse>,
  });
}

export function useCreateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unit: StorageUnitInput) =>
      apiClient.api.inventoryStorageUnits.post({
        name: unit.name,
        type: unit.type ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORAGE_UNITS_KEY });
    },
  });
}

export function useUpdateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unit: StorageUnitInput & { id: number }) =>
      apiClient.api.inventoryStorageUnits.byId(unit.id).put({
        name: unit.name,
        type: unit.type ?? null,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: STORAGE_UNITS_KEY });
      queryClient.invalidateQueries({ queryKey: [STORAGE_UNIT_KEY, variables.id] });
    },
  });
}

export function useDeleteInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.inventoryStorageUnits.byId(id).delete(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: STORAGE_UNITS_KEY });
      queryClient.removeQueries({ queryKey: [STORAGE_UNIT_KEY, id] });
    },
  });
}

// --- Boxes ----------------------------------------------------------------

export function useInventoryBoxes() {
  return useQuery({
    queryKey: BOXES_KEY,
    refetchOnMount: "always",
    queryFn: async (): Promise<InventoryBoxResponse[]> => {
      const boxes = await apiClient.api.inventoryBoxes.get();
      return boxes ?? [];
    },
  });
}

export function useInventoryBox(id: number) {
  return useQuery({
    queryKey: [BOX_KEY, id],
    enabled: id > 0,
    refetchOnMount: "always",
    queryFn: () => apiClient.api.inventoryBoxes.byId(id).get() as Promise<InventoryBoxResponse>,
  });
}

export function useCreateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (box: BoxInput) =>
      apiClient.api.inventoryBoxes.post({
        number: box.number,
        storageUnitId: box.storageUnitId ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOXES_KEY });
    },
  });
}

export function useUpdateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (box: BoxInput & { id: number }) =>
      apiClient.api.inventoryBoxes.byId(box.id).put({
        number: box.number,
        storageUnitId: box.storageUnitId ?? null,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: BOXES_KEY });
      queryClient.invalidateQueries({ queryKey: [BOX_KEY, variables.id] });
    },
  });
}

export function useDeleteInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.inventoryBoxes.byId(id).delete(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: BOXES_KEY });
      queryClient.removeQueries({ queryKey: [BOX_KEY, id] });
      // Deleting a box clears BoxId on every item it held (the server keeps the
      // items and only unassigns them), so the item list is stale too.
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
    },
  });
}

// --- Items ----------------------------------------------------------------

export function useInventoryItems() {
  return useQuery({
    queryKey: ITEMS_KEY,
    refetchOnMount: "always",
    queryFn: async (): Promise<InventoryItemSummaryResponse[]> => {
      const items = await apiClient.api.inventoryItems.get();
      return items ?? [];
    },
  });
}

export function useInventoryItem(id: number) {
  return useQuery({
    queryKey: [ITEM_KEY, id],
    enabled: id > 0,
    refetchOnMount: "always",
    queryFn: () => apiClient.api.inventoryItems.byId(id).get() as Promise<InventoryItemResponse>,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ItemInput) =>
      apiClient.api.inventoryItems.post({
        name: item.name,
        description: item.description ?? null,
        boxId: item.boxId ?? null,
        storageUnitId: item.storageUnitId ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ItemInput & { id: number }) =>
      apiClient.api.inventoryItems.byId(item.id).put({
        name: item.name,
        description: item.description ?? null,
        boxId: item.boxId ?? null,
        storageUnitId: item.storageUnitId ?? null,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
      queryClient.invalidateQueries({ queryKey: [ITEM_KEY, variables.id] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.inventoryItems.byId(id).delete(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
      queryClient.removeQueries({ queryKey: [ITEM_KEY, id] });
    },
  });
}
