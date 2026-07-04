"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  MeasurementUnit,
  ExportUnitsResponse,
  ImportUnitsRequest,
} from "@/lib/api-client/models/index";

export type { MeasurementUnit, ExportUnitsResponse, ImportUnitsRequest };

const UNITS_KEY = ["units"];

export function useUnits() {
  return useQuery({
    queryKey: UNITS_KEY,
    queryFn: async () => {
      const units = await apiClient.api.units.get();
      return units ?? [];
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      await apiClient.api.units.post({ name });
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
      await apiClient.api.units.byId(id).put({ name });
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
      await apiClient.api.units.byId(id).delete();
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
      await apiClient.api.units.seedDefaults.post();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNITS_KEY });
    },
  });
}

export function useExportUnits() {
  return useMutation({
    mutationFn: async () => {
      const data = await apiClient.api.units.exportEscaped.get();
      if (!data) throw new Error("Export failed");
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
    mutationFn: async (data: ImportUnitsRequest) => {
      await apiClient.api.units.importEscaped.post(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNITS_KEY });
    },
  });
}
