"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface InventoryStorageUnit {
  id: number;
  name: string;
  type?: string;
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

// Custom hook for fetching inventory storage units
export function useInventoryStorageUnits() {
  return useQuery({
    queryKey: ["inventoryStorageUnits"],
    queryFn: async (): Promise<InventoryStorageUnit[]> => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-storage-units`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch inventory storage units");
      }
      return response.json();
    },
  });
}

// Custom hook for creating an inventory storage unit
export function useCreateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storageUnit: { name: string; type?: string }) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-storage-units`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(storageUnit),
      });
      if (!response.ok) {
        throw new Error("Failed to create inventory storage unit");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryStorageUnits"] });
    },
  });
}

// Custom hook for updating an inventory storage unit
export function useUpdateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      type,
    }: {
      id: number;
      name: string;
      type?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-storage-units/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, type }),
      });
      if (!response.ok) {
        throw new Error("Failed to update inventory storage unit");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryStorageUnits"] });
    },
  });
}

// Custom hook for deleting an inventory storage unit
export function useDeleteInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/inventory-storage-units/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete inventory storage unit");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryStorageUnits"] });
    },
  });
}
