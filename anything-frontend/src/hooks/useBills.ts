"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, createMultipartBody } from "@/lib/apiClient";
import type { CreateBillRequest, UpdateBillRequest, AddBillPriceRequest, UpdateBillPriceRequest, BillAttachmentResponse } from "@/lib/api-client/models/index";

// Re-export API model type so consumers can import it from this hook
export type { BillAttachmentResponse };

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
    queryFn: () =>
      apiClient.api.bills.byId(billId).attachments.get().then(r => r ?? []) as Promise<BillAttachmentResponse[]>,
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
      const multipartBody = createMultipartBody();
      multipartBody.addOrReplacePart("file", data.file.type || "application/octet-stream", data.file);
      try {
        await apiClient.api.bills.byId(data.billId).attachments.post(multipartBody, {
          queryParameters: { name: data.name },
        });
      } catch (e) {
        const kiota = e as { message?: string };
        throw new Error(kiota.message || "Failed to upload attachment");
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
    mutationFn: (data: { billId: number; attachmentId: number; name: string }) =>
      apiClient.api.bills.byId(data.billId).attachments.byAttachmentId(data.attachmentId).put({ name: data.name }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billAttachments", variables.billId] });
    },
  });
}

export function useDownloadBillAttachment() {
  return useMutation({
    mutationFn: async (data: { billId: number; attachmentId: number; name: string }) => {
      const arrayBuffer = await apiClient.api.bills
        .byId(data.billId)
        .attachments.byAttachmentId(data.attachmentId)
        .download.get();
      if (!arrayBuffer) throw new Error("Attachment data not returned by server");
      const blob = new Blob([arrayBuffer]);
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
    mutationFn: (data: { billId: number; attachmentId: number }) =>
      apiClient.api.bills.byId(data.billId).attachments.byAttachmentId(data.attachmentId).delete(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billAttachments", variables.billId] });
    },
  });
}

