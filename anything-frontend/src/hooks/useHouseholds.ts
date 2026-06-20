"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HOUSEHOLD_ID_KEY, HOUSEHOLD_HEADER } from "@/lib/apiClient";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

export interface Household {
  id: number;
  name: string;
  createdOn: string;
  role: string;
}

export interface HouseholdMember {
  userId: number;
  name: string;
  email: string;
  role: string;
  joinedOn: string;
}

export interface HouseholdDetail {
  id: number;
  name: string;
  createdOn: string;
  members: HouseholdMember[];
}

function getAuthHeaders(): HeadersInit {
  const token =
    typeof globalThis.window !== "undefined"
      ? (localStorage.getItem("accessToken") ?? "")
      : "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function useHouseholds() {
  return useQuery({
    queryKey: ["households"],
    queryFn: async (): Promise<Household[]> => {
      const response = await fetch(`${API_BASE_URL}/api/households`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error(`Failed to fetch households: ${response.status}`);
      return response.json() as Promise<Household[]>;
    },
  });
}

export function useHousehold(id: number | null) {
  return useQuery({
    queryKey: ["households", id],
    queryFn: async (): Promise<HouseholdDetail> => {
      const response = await fetch(`${API_BASE_URL}/api/households/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error(`Failed to fetch household: ${response.status}`);
      return response.json() as Promise<HouseholdDetail>;
    },
    enabled: id !== null,
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }): Promise<Household> => {
      const response = await fetch(`${API_BASE_URL}/api/households`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: data.name }),
      });
      if (!response.ok)
        throw new Error(`Failed to create household: ${response.status}`);
      return response.json() as Promise<Household>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

export function useUpdateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; name: string }) => {
      const householdId =
        typeof window !== "undefined"
          ? localStorage.getItem(HOUSEHOLD_ID_KEY)
          : null;
      const headers: HeadersInit = {
        ...getAuthHeaders(),
        ...(householdId ? { [HOUSEHOLD_HEADER]: householdId } : {}),
      };
      const response = await fetch(
        `${API_BASE_URL}/api/households/${data.id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ name: data.name }),
        }
      );
      if (!response.ok)
        throw new Error(`Failed to update household: ${response.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

export function useAddHouseholdMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      householdId: number;
      userId: number;
      role: string;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/api/households/${data.householdId}/members`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ userId: data.userId, role: data.role }),
        }
      );
      if (!response.ok)
        throw new Error(`Failed to add member: ${response.status}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["households", variables.householdId],
      });
    },
  });
}

export function useCreateHouseholdInvite() {
  return useMutation({
    mutationFn: async (data: {
      householdId: number;
      email: string;
    }): Promise<{ inviteUrl: string; token: string }> => {
      const response = await fetch(
        `${API_BASE_URL}/api/households/${data.householdId}/invites`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ email: data.email }),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create invite: ${response.status}`);
      }
      return response.json() as Promise<{ inviteUrl: string; token: string }>;
    },
  });
}

export function useRemoveHouseholdMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { householdId: number; userId: number }) => {
      const response = await fetch(
        `${API_BASE_URL}/api/households/${data.householdId}/members/${data.userId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok)
        throw new Error(`Failed to remove member: ${response.status}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["households", variables.householdId],
      });
    },
  });
}
