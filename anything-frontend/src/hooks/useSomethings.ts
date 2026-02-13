"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Something {
  id: number;
  name: string;
  createdOn: string;
  modifiedOn?: string;
  deletedOn?: string;
}

// Custom hook for fetching somethings
export function useSomethings() {
  return useQuery({
    queryKey: ["somethings"],
    queryFn: async (): Promise<Something[]> => {
      const response = await fetch(`${API_BASE_URL}/api/somethings`);
      if (!response.ok) {
        throw new Error("Failed to fetch somethings");
      }
      return response.json();
    },
  });
}

// Custom hook for creating a something
export function useCreateSomething() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (something: { name: string }) => {
      const response = await fetch(`${API_BASE_URL}/api/somethings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(something),
      });
      if (!response.ok) {
        throw new Error("Failed to create something");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["somethings"] });
    },
  });
}

// Custom hook for updating a something
export function useUpdateSomething() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await fetch(`${API_BASE_URL}/api/somethings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error("Failed to update something");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["somethings"] });
    },
  });
}

// Custom hook for deleting a something
export function useDeleteSomething() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/somethings/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete something");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["somethings"] });
    },
  });
}
