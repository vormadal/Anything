"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, HOUSEHOLD_ID_KEY, HOUSEHOLD_HEADER } from "@/lib/apiClient";
import type { CreateBillRequest, UpdateBillRequest, AddBillPriceRequest, UpdateBillPriceRequest } from "@/lib/api-client/models/index";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

function getAccessToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken") ?? "";
  }
  return "";
}

function getHouseholdHeader(): Record<string, string> {
  if (typeof window !== "undefined") {
    const id = localStorage.getItem(HOUSEHOLD_ID_KEY);
    if (id !== null) return { [HOUSEHOLD_HEADER]: id };
  }
  return {};
}

export type PaymentFrequency =
  | "None"
  | "Weekly"
  | "BiWeekly"
  | "Monthly"
  | "Quarterly"
  | "SemiAnnually"
  | "Annually";

export const PAYMENT_FREQUENCIES: PaymentFrequency[] = [
  "None",
  "Weekly",
  "BiWeekly",
  "Monthly",
  "Quarterly",
  "SemiAnnually",
  "Annually",
];

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  None: "One-time",
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
  totalCurrentMonthAmount: number;
  totalCurrentYearAmount: number;
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

export interface BillAttachmentResponse {
  id: number;
  billId: number;
  name: string;
  contentType: string;
  url: string;
  thumbnailUrl?: string;
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

export function useBillAttachments(billId: number) {
  return useQuery({
    queryKey: ["billAttachments", billId],
    queryFn: async (): Promise<BillAttachmentResponse[]> => {
      const res = await fetch(`${API_BASE_URL}/api/bills/${billId}/attachments`, {
        headers: { Authorization: `Bearer ${getAccessToken()}`, ...getHouseholdHeader() },
      });
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json() as Promise<BillAttachmentResponse[]>;
    },
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

export function useUploadBillAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { billId: number; file: File; name?: string }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      const baseUrl = `${API_BASE_URL}/api/bills/${data.billId}/attachments`;
      const url = data.name ? `${baseUrl}?name=${encodeURIComponent(data.name)}` : baseUrl;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}`, ...getHouseholdHeader() },
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to upload attachment");
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billAttachments", variables.billId] });
    },
  });
}

export function useUpdateBillAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { billId: number; attachmentId: number; name: string }) => {
      const res = await fetch(`${API_BASE_URL}/api/bills/${data.billId}/attachments/${data.attachmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
          ...getHouseholdHeader(),
        },
        body: JSON.stringify({ name: data.name }),
      });
      if (!res.ok) throw new Error("Failed to update attachment");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billAttachments", variables.billId] });
    },
  });
}

export function useDownloadBillAttachment() {
  return useMutation({
    mutationFn: async (data: { billId: number; attachmentId: number; name: string }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/bills/${data.billId}/attachments/${data.attachmentId}/download`,
        { headers: { Authorization: `Bearer ${getAccessToken()}`, ...getHouseholdHeader() } }
      );
      if (!res.ok) throw new Error("Failed to download attachment");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = data.name;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    },
  });
}

export function useDeleteBillAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { billId: number; attachmentId: number }) => {
      const res = await fetch(`${API_BASE_URL}/api/bills/${data.billId}/attachments/${data.attachmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAccessToken()}`, ...getHouseholdHeader() },
      });
      if (!res.ok) throw new Error("Failed to delete attachment");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billAttachments", variables.billId] });
    },
  });
}

