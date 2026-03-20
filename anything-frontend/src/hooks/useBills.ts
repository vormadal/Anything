"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiClient.api as any;

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
    queryFn: () =>
      api.bills.get() as Promise<BillResponse[]>,
  });
}

export function useBillSummary() {
  return useQuery({
    queryKey: ["billSummary"],
    queryFn: () =>
      api.bills.summary.get() as Promise<BillSummaryResponse>,
  });
}

export function useBill(id: number) {
  return useQuery({
    queryKey: ["bill", id],
    queryFn: () =>
      api.bills.byId(id).get() as Promise<BillResponse>,
    enabled: !!id,
  });
}

export function useBillPriceHistory(billId: number) {
  return useQuery({
    queryKey: ["billPriceHistory", billId],
    queryFn: () =>
      api.bills
        .byId(billId)
        .priceHistory.get() as Promise<BillPriceHistoryResponse[]>,
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
      api.bills.post({
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
      api.bills.byId(data.id).put({
        name: data.name,
        vendorId: data.vendorId ?? null,
        frequency: data.frequency,
        isAutomated: data.isAutomated,
        locationId: data.locationId ?? null,
        managementUrl: data.managementUrl ?? null,
        category: data.category ?? null,
        notes: data.notes ?? null,
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
      api.bills.byId(id).delete(),
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
      api.bills.byId(data.billId).priceHistory.post({
        amount: data.amount,
        effectiveDate: data.effectiveDate,
        notes: data.notes ?? null,
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
      api.bills
        .byId(data.billId)
        .priceHistory.byId(data.historyId)
        .put({
          amount: data.amount,
          effectiveDate: data.effectiveDate,
          notes: data.notes ?? null,
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
      api.bills
        .byId(data.billId)
        .priceHistory.byId(data.historyId)
        .delete(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billPriceHistory", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bill", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["billSummary"] });
    },
  });
}
