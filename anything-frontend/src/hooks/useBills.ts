"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateBillRequest, UpdateBillRequest, AddBillPriceRequest, UpdateBillPriceRequest } from "@/lib/api-client/models/index";

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
      apiClient.api.bills.get() as unknown as Promise<BillResponse[]>,
  });
}

export function useBillSummary() {
  return useQuery({
    queryKey: ["billSummary"],
    queryFn: () =>
      apiClient.api.bills.summary.get() as unknown as Promise<BillSummaryResponse>,
  });
}

export function useBill(id: number) {
  return useQuery({
    queryKey: ["bill", id],
    queryFn: () =>
      apiClient.api.bills.byId(id).get() as unknown as Promise<BillResponse>,
    enabled: !!id,
  });
}

export function useBillPriceHistory(billId: number) {
  return useQuery({
    queryKey: ["billPriceHistory", billId],
    queryFn: () =>
      apiClient.api.bills
        .byId(billId)
        .priceHistory.get() as unknown as Promise<BillPriceHistoryResponse[]>,
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
    }) => {
      const body: CreateBillRequest = {
        name: data.name,
        vendorId: data.vendorId ?? null,
        frequency: data.frequency,
        isAutomated: data.isAutomated,
        locationId: data.locationId ?? null,
        managementUrl: data.managementUrl ?? null,
        category: data.category ?? null,
        notes: data.notes ?? null,
        initialAmount: data.initialAmount ?? null,
        initialEffectiveDate: data.initialEffectiveDate ? new Date(data.initialEffectiveDate) : null,
      };
      return apiClient.api.bills.post(body);
    },
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
    }) => {
      const body: UpdateBillRequest = {
        name: data.name,
        vendorId: data.vendorId ?? null,
        frequency: data.frequency,
        isAutomated: data.isAutomated,
        locationId: data.locationId ?? null,
        managementUrl: data.managementUrl ?? null,
        category: data.category ?? null,
        notes: data.notes ?? null,
      };
      return apiClient.api.bills.byId(data.id).put(body);
    },
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
      apiClient.api.bills.byId(id).delete(),
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
    }) => {
      const body: AddBillPriceRequest = {
        amount: data.amount,
        effectiveDate: new Date(data.effectiveDate),
        notes: data.notes ?? null,
      };
      return apiClient.api.bills.byId(data.billId).priceHistory.post(body);
    },
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
    }) => {
      const body: UpdateBillPriceRequest = {
        amount: data.amount,
        effectiveDate: new Date(data.effectiveDate),
        notes: data.notes ?? null,
      };
      return apiClient.api.bills
        .byId(data.billId)
        .priceHistory.byHistoryId(data.historyId)
        .put(body);
    },
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
      apiClient.api.bills
        .byId(data.billId)
        .priceHistory.byHistoryId(data.historyId)
        .delete(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billPriceHistory", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bill", variables.billId] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["billSummary"] });
    },
  });
}
