"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

// NOTE: bills/vendors/locations routes are not yet in the generated Kiota client.
// Until `npm run generate:api` is run against the updated backend, these routes
// must be accessed via a cast. The interfaces below mirror the contract types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const billsApi = (apiClient.api as any).bills as BillsApiShape;

interface PriceHistoryByIdShape {
  put: (body: { amount: number; effectiveDate: string; notes?: string | null }) => Promise<void>;
  delete: () => Promise<void>;
}
interface PriceHistoryShape {
  get: () => Promise<BillPriceHistoryResponse[]>;
  post: (body: { amount: number; effectiveDate: string; notes?: string | null }) => Promise<BillPriceHistoryResponse>;
  byId: (id: number) => PriceHistoryByIdShape;
}
interface BillByIdShape {
  get: () => Promise<BillResponse>;
  put: (body: object) => Promise<void>;
  delete: () => Promise<void>;
  priceHistory: PriceHistoryShape;
}
interface BillsApiShape {
  get: () => Promise<BillResponse[]>;
  post: (body: object) => Promise<BillResponse>;
  summary: { get: () => Promise<BillSummaryResponse> };
  byId: (id: number) => BillByIdShape;
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
    queryFn: () =>
      billsApi.get(),
  });
}

export function useBillSummary() {
  return useQuery({
    queryKey: ["billSummary"],
    queryFn: () =>
      billsApi.summary.get(),
  });
}

export function useBill(id: number) {
  return useQuery({
    queryKey: ["bill", id],
    queryFn: () =>
      billsApi.byId(id).get(),
    enabled: !!id,
  });
}

export function useBillPriceHistory(billId: number) {
  return useQuery({
    queryKey: ["billPriceHistory", billId],
    queryFn: () =>
      billsApi
        .byId(billId)
        .priceHistory.get(),
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
      billsApi.post({
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
      billsApi.byId(data.id).put({
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
      billsApi.byId(id).delete(),
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
      billsApi.byId(data.billId).priceHistory.post({
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
      billsApi
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
      billsApi
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
