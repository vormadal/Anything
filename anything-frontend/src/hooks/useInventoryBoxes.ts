"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface InventoryBox {
  id: number;
  number: number;
  storageUnitId?: number;
  createdOn: string;
  modifiedOn?: string;
  deletedOn?: string;
}

// Helper to get auth headers
function getAuthHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Custom hook for fetching inventory boxes
export function useInventoryBoxes() {
  return useQuery({
    queryKey: ["inventoryBoxes"],
    queryFn: async (): Promise<InventoryBox[]> => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-boxes`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch inventory boxes");
      }
      return response.json();
    },
  });
}

// Custom hook for creating an inventory box
export function useCreateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (box: { number: number; storageUnitId?: number }) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-boxes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(box),
      });
      if (!response.ok) {
        throw new Error("Failed to create inventory box");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryBoxes"] });
    },
  });
}

// Custom hook for updating an inventory box
export function useUpdateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      number,
      storageUnitId,
    }: {
      id: number;
      number: number;
      storageUnitId?: number;
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-boxes/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ number, storageUnitId }),
      });
      if (!response.ok) {
        throw new Error("Failed to update inventory box");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryBoxes"] });
    },
  });
}

// Custom hook for deleting an inventory box
export function useDeleteInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-boxes/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete inventory box");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryBoxes"] });
    },
  });
}
