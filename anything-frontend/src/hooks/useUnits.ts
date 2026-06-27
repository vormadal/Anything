"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export type MeasurementUnit = {
  id?: number | null;
  name?: string | null;
  householdId?: number | null;
  createdOn?: string | null;
  modifiedOn?: string | null;
};

export type UnitExportItem = { name: string; delete?: boolean };
export type UnitExportData = { units: UnitExportItem[] };

const UNITS_KEY = ["units"];

export function useUnits() {
  return useQuery({
    queryKey: UNITS_KEY,
    queryFn: async () => {
      const response = await apiFetch("/api/units");
      if (!response.ok) throw new Error("Failed to load units");
      return (await response.json()) as MeasurementUnit[];
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await apiFetch("/api/units", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to create unit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNITS_KEY });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiFetch(`/api/units/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to update unit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNITS_KEY });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/api/units/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete unit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNITS_KEY });
    },
  });
}

export function useSeedDefaultUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/api/units/seed-defaults", { method: "POST" });
      if (!response.ok) throw new Error("Failed to add common units");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNITS_KEY });
    },
  });
}

export function useExportUnits() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/api/units/export");
      if (!response.ok) throw new Error("Export failed");
      const data = (await response.json()) as UnitExportData;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "units.json";
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UnitExportData) => {
      const response = await apiFetch("/api/units/import", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Import failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNITS_KEY });
    },
  });
}
