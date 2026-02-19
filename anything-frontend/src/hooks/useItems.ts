"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Item {
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

// Custom hook for fetching items
export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async (): Promise<Item[]> => {
      const response = await fetch(`${API_BASE_URL}/api/items`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      return response.json();
    },
  });
}

// Custom hook for creating an item
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      name: string;
      description?: string;
      boxId?: number;
      storageUnitId?: number;
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/items`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        throw new Error("Failed to create item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Custom hook for updating an item
export function useUpdateItem() {
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
      const response = await fetch(`${API_BASE_URL}/api/items/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, description, boxId, storageUnitId }),
      });
      if (!response.ok) {
        throw new Error("Failed to update item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Custom hook for deleting an item
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/items/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
