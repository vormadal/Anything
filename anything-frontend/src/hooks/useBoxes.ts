"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Box {
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

// Custom hook for fetching boxes
export function useBoxes() {
  return useQuery({
    queryKey: ["boxes"],
    queryFn: async (): Promise<Box[]> => {
      const response = await fetch(`${API_BASE_URL}/api/boxes`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch boxes");
      }
      return response.json();
    },
  });
}

// Custom hook for creating a box
export function useCreateBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (box: { number: number; storageUnitId?: number }) => {
      const response = await fetch(`${API_BASE_URL}/api/boxes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(box),
      });
      if (!response.ok) {
        throw new Error("Failed to create box");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes"] });
    },
  });
}

// Custom hook for updating a box
export function useUpdateBox() {
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
      const response = await fetch(`${API_BASE_URL}/api/boxes/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ number, storageUnitId }),
      });
      if (!response.ok) {
        throw new Error("Failed to update box");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes"] });
    },
  });
}

// Custom hook for deleting a box
export function useDeleteBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/boxes/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete box");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes"] });
    },
  });
}
