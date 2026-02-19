"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

// Helper to get auth headers
function getAuthHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Custom hook for fetching inventory items
export function useInventoryItems() {
  return useQuery({
    queryKey: ["inventoryItems"],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-items`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch inventory items");
      }
      return response.json();
    },
  });
}

// Custom hook for creating an inventory item
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      name: string;
      description?: string;
      boxId?: number;
      storageUnitId?: number;
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-items`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        throw new Error("Failed to create inventory item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
  });
}

// Custom hook for updating an inventory item
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
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
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-items/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, description, boxId, storageUnitId }),
      });
      if (!response.ok) {
        throw new Error("Failed to update inventory item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
  });
}

// Custom hook for deleting an inventory item
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-items/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete inventory item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
  });
}
