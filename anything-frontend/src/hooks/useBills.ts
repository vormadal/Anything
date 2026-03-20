"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch, API_BASE_URL } from "@/lib/apiClient";

async function billsFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json();
}

export type PaymentFrequency =
  | "Weekly"
  | "BiWeekly"
  | "Monthly"
  | "Quarterly"
  | "SemiAnnually"
  | "Annually";

export const PAYMENT_FREQUENCIES: PaymentFrequency[] = [
  "Weekly",
  "BiWeekly",
  "Monthly",
  "Quarterly",
  "SemiAnnually",
  "Annually",
];

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  Weekly: "Weekly",
  BiWeekly: "Every 2 weeks",
  Monthly: "Monthly",
  Quarterly: "Quarterly",
  SemiAnnually: "Every 6 months",
  Annually: "Annually",
};

export interface BillResponse {
  id: number;
  name: string;
  vendorId?: number;
  vendorName?: string;
  vendorWebsite?: string;
  frequency: PaymentFrequency;
  isAutomated: boolean;
  locationId?: number;
  locationName?: string;
  managementUrl?: string;
  category?: string;
  notes?: string;
  currentAmount?: number;
  monthlyEquivalent?: number;
  priceIncreased: boolean;
  createdOn: string;
  modifiedOn?: string;
}

export interface BillSummaryResponse {
  totalBills: number;
  totalMonthlyEquivalent: number;
  automatedCount: number;
  manualCount: number;
}

export interface BillPriceHistoryResponse {
  id: number;
  billId: number;
  amount: number;
  effectiveDate: string;
  notes?: string;
  previousAmount?: number;
  createdOn: string;
  modifiedOn?: string;
}

export function useBills() {
  return useQuery({
    queryKey: ["bills"],
    queryFn: () => billsFetch<BillResponse[]>("/api/bills"),
  });
}

export function useBillSummary() {
  return useQuery({
    queryKey: ["billSummary"],
    queryFn: () => billsFetch<BillSummaryResponse>("/api/bills/summary"),
  });
}

export function useBill(id: number) {
  return useQuery({
    queryKey: ["bill", id],
    queryFn: () => billsFetch<BillResponse>(`/api/bills/${id}`),
    enabled: !!id,
  });
}

export function useBillPriceHistory(billId: number) {
  return useQuery({
    queryKey: ["billPriceHistory", billId],
    queryFn: () => billsFetch<BillPriceHistoryResponse[]>(`/api/bills/${billId}/price-history`),
    enabled: !!billId,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      vendorId?: number;
      frequency: PaymentFrequency;
      isAutomated: boolean;
      locationId?: number;
      managementUrl?: string;
      category?: string;
      notes?: string;
      initialAmount?: number;
      initialEffectiveDate?: string;
    }) =>
      billsFetch<BillResponse>("/api/bills", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          vendorId: data.vendorId ?? null,
          frequency: data.frequency,
          isAutomated: data.isAutomated,
          locationId: data.locationId ?? null,
          managementUrl: data.managementUrl ?? null,
          category: data.category ?? null,
          notes: data.notes ?? null,
          initialAmount: data.initialAmount ?? null,
          initialEffectiveDate: data.initialEffectiveDate ?? null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["billSummary"] });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: number;
      name: string;
      vendorId?: number;
      frequency: PaymentFrequency;
      isAutomated: boolean;
      locationId?: number;
      managementUrl?: string;
      category?: string;
      notes?: string;
    }) =>
      billsFetch<void>(`/api/bills/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: data.name,
          vendorId: data.vendorId ?? null,
          frequency: data.frequency,
          isAutomated: data.isAutomated,
          locationId: data.locationId ?? null,
          managementUrl: data.managementUrl ?? null,
          category: data.category ?? null,
          notes: data.notes ?? null,
        }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bill", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["billSummary"] });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      billsFetch<void>(`/api/bills/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["billSummary"] });
    },
  });
}

export function useAddBillPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      billId: number;
      amount: number;
      effectiveDate: string;
      notes?: string;
    }) =>
      billsFetch<BillPriceHistoryResponse>(`/api/bills/${data.billId}/price-history`, {
        method: "POST",
        body: JSON.stringify({
          amount: data.amount,
          effectiveDate: data.effectiveDate,
          notes: data.notes ?? null,
        }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billPriceHistory", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bill", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["billSummary"] });
    },
  });
}

export function useUpdateBillPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      billId: number;
      historyId: number;
      amount: number;
      effectiveDate: string;
      notes?: string;
    }) =>
      billsFetch<void>(`/api/bills/${data.billId}/price-history/${data.historyId}`, {
        method: "PUT",
        body: JSON.stringify({
          amount: data.amount,
          effectiveDate: data.effectiveDate,
          notes: data.notes ?? null,
        }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billPriceHistory", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bill", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["billSummary"] });
    },
  });
}

export function useDeleteBillPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { billId: number; historyId: number }) =>
      billsFetch<void>(`/api/bills/${data.billId}/price-history/${data.historyId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billPriceHistory", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bill", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["billSummary"] });
    },
  });
}
