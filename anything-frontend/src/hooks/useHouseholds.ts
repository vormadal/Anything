"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  HouseholdResponse,
  HouseholdDetailResponse,
  HouseholdMemberResponse,
} from "@/lib/api-client/models";

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

// The Kiota client returns models with optional fields and `Date` timestamps;
// map them to the stable shapes these hooks expose to components.
function mapHousehold(r: HouseholdResponse): Household {
  return {
    id: r.id ?? 0,
    name: r.name ?? "",
    createdOn: r.createdOn?.toISOString() ?? "",
    role: r.role ?? "",
  };
}

function mapMember(m: HouseholdMemberResponse): HouseholdMember {
  return {
    userId: m.userId ?? 0,
    name: m.name ?? "",
    email: m.email ?? "",
    role: m.role ?? "",
    joinedOn: m.joinedOn?.toISOString() ?? "",
  };
}

function mapDetail(d: HouseholdDetailResponse): HouseholdDetail {
  return {
    id: d.id ?? 0,
    name: d.name ?? "",
    createdOn: d.createdOn?.toISOString() ?? "",
    members: (d.members ?? []).map(mapMember),
  };
}

export function useHouseholds() {
  return useQuery({
    queryKey: ["households"],
    queryFn: async (): Promise<Household[]> => {
      const result = await apiClient.api.households.get();
      return (result ?? []).map(mapHousehold);
    },
  });
}

export function useHousehold(id: number | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["households", id],
    queryFn: async (): Promise<HouseholdDetail> => {
      const result = await apiClient.api.households.byId(id as number).get();
      if (!result) throw new Error("Household not found");
      return mapDetail(result);
    },
    enabled: id !== null,
    // Seed from the already-cached households list so navigating from the
    // list to a household the user just saw doesn't flash a bare loading
    // state. Members aren't part of the list response, so they arrive
    // shortly after from the real fetch.
    placeholderData: (): HouseholdDetail | undefined => {
      if (id === null) return undefined;
      const households = queryClient.getQueryData<Household[]>(["households"]);
      const match = households?.find((h) => h.id === id);
      return match
        ? { id: match.id, name: match.name, createdOn: match.createdOn, members: [] }
        : undefined;
    },
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }): Promise<Household> => {
      const result = await apiClient.api.households.post({ name: data.name });
      return {
        id: result?.id ?? 0,
        name: result?.name ?? "",
        createdOn: result?.createdOn?.toISOString() ?? "",
        role: "",
      };
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
      await apiClient.api.households.byId(data.id).put({ name: data.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

export function useDeleteHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.api.households.byId(id).delete();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

export function useUpdateHouseholdMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      householdId: number;
      userId: number;
      role: string;
    }) => {
      await apiClient.api.households
        .byId(data.householdId)
        .members.byUserId(data.userId)
        .role.put({ role: data.role });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["households", variables.householdId],
      });
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

export function useRemoveHouseholdMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { householdId: number; userId: number }) => {
      await apiClient.api.households
        .byId(data.householdId)
        .members.byUserId(data.userId)
        .delete();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["households", variables.householdId],
      });
    },
  });
}
