"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface StorageUnit {
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

// Custom hook for fetching storage units
export function useStorageUnits() {
  return useQuery({
    queryKey: ["storageUnits"],
    queryFn: async (): Promise<StorageUnit[]> => {
      const response = await fetch(`${API_BASE_URL}/api/storageunits`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch storage units");
      }
      return response.json();
    },
  });
}

// Custom hook for creating a storage unit
export function useCreateStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storageUnit: { name: string; type?: string }) => {
      const response = await fetch(`${API_BASE_URL}/api/storageunits`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(storageUnit),
      });
      if (!response.ok) {
        throw new Error("Failed to create storage unit");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storageUnits"] });
    },
  });
}

// Custom hook for updating a storage unit
export function useUpdateStorageUnit() {
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
      const response = await fetch(`${API_BASE_URL}/api/storageunits/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, type }),
      });
      if (!response.ok) {
        throw new Error("Failed to update storage unit");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storageUnits"] });
    },
  });
}

// Custom hook for deleting a storage unit
export function useDeleteStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/storageunits/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete storage unit");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storageUnits"] });
    },
  });
}
