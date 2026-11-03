"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { DateOnly } from "@microsoft/kiota-abstractions";
import { apiClient, buildFileUploadBody } from "@/lib/apiClient";
import { UPLOAD_TOO_LARGE_MESSAGE, assertUploadSize, prepareImageForUpload } from "@/lib/images";
import type {
  RenovationPurchaseAttachmentResponse,
  AddRenovationLineToInventoryRequest,
  CreateRenovationProjectRequest,
  CreateRenovationPurchaseLineRequest,
  CreateRenovationPurchaseRequest,
  CreateRenovationRoomRequest,
  ReplaceRenovationMaterialRequest,
  SaveRenovationLineRequest,
  SaveRenovationMaterialRequest,
  UpdateRenovationProjectRequest,
  UpdateRenovationRoomRequest,
} from "@/lib/api-client/models/index";

// Query keys. Anything that touches a project's rooms, lines or purchases also
// invalidates the project itself and the list (its totals change). Material
// mutations only touch the materials list: changing a default never re-prices
// existing lines (see CLAUDE.md, Renovation).
const PROJECTS_KEY = ["renovationProjects"] as const;
const MATERIALS_KEY = ["renovationMaterials"] as const;
const ROOM_TEMPLATES_KEY = ["renovationRoomTemplates"] as const;
// Mirrors ITEMS_KEY in useInventory.ts.
const INVENTORY_ITEMS_KEY = ["inventoryItems"] as const;

const projectKey = (projectId: number) => ["renovationProject", projectId] as const;
const purchasesKey = (projectId: number) => ["renovationPurchases", projectId] as const;
const purchaseAttachmentsKey = (projectId: number, purchaseId: number) =>
  ["renovationPurchaseAttachments", projectId, purchaseId] as const;

export interface RenovationRoomDimensions {
  name: string;
  length: number;
  width: number;
  height: number;
  doors: number;
  windows: number;
}

export interface RenovationRoomInput extends RenovationRoomDimensions {
  roomType?: string;
  /** Template line keys to seed the room with; the server seeds none when omitted. */
  lineKeys?: string[];
}

export interface RenovationLineInput {
  label: string;
  group: string;
  basis: string;
  description?: string;
  materialId?: number;
  unit?: string;
  unitPrice?: number;
  wastePercent?: number;
  fixedQuantity?: number;
  isComplete?: boolean;
}

export interface RenovationMaterialInput {
  name: string;
  category?: string;
  unit?: string;
  defaultPrice?: number;
  wastePercent?: number;
  packSize?: number;
  productUrl?: string;
}

export interface RenovationPurchaseLineInput {
  lineId: number;
  quantity: number;
  markComplete?: boolean;
}

export interface RenovationPurchaseInput {
  /** yyyy-MM-dd */
  purchasedOn: string;
  vendor?: string;
  vendorId?: number;
  totalAmount?: number;
  notes?: string;
  lines: RenovationPurchaseLineInput[];
}

export interface AddRenovationLineToInventoryInput {
  purchaseId: number;
  lineId: number;
  storageUnitId?: number;
  boxId?: number;
  brand?: string;
  model?: string;
  /** yyyy-MM-dd */
  warrantyExpiresOn?: string;
}

function invalidateProject(queryClient: QueryClient, projectId: number) {
  queryClient.invalidateQueries({ queryKey: projectKey(projectId) });
  queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
}

function toLineBody(line: RenovationLineInput): SaveRenovationLineRequest {
  return {
    label: line.label,
    group: line.group,
    basis: line.basis,
    description: line.description ?? null,
    materialId: line.materialId ?? null,
    unit: line.unit ?? null,
    unitPrice: line.unitPrice ?? null,
    wastePercent: line.wastePercent ?? null,
    fixedQuantity: line.fixedQuantity ?? null,
    isComplete: line.isComplete ?? null,
  };
}

function toRoomUpdateBody(room: RenovationRoomDimensions): UpdateRenovationRoomRequest {
  return {
    name: room.name,
    length: room.length,
    width: room.width,
    height: room.height,
    doors: room.doors,
    windows: room.windows,
  };
}

function toMaterialBody(material: RenovationMaterialInput): SaveRenovationMaterialRequest {
  return {
    name: material.name,
    category: material.category ?? null,
    unit: material.unit ?? null,
    defaultPrice: material.defaultPrice ?? null,
    wastePercent: material.wastePercent ?? null,
    packSize: material.packSize ?? null,
    productUrl: material.productUrl ?? null,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useRenovationProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: () => apiClient.api.renovationProjects.get().then((r) => r ?? []),
  });
}

export function useRenovationProject(id: number) {
  return useQuery({
    queryKey: projectKey(id),
    queryFn: async () => {
      const project = await apiClient.api.renovationProjects.byId(id).get();
      if (!project) throw new Error("Renovation project not found");
      return project;
    },
    enabled: !!id,
  });
}

export function useRenovationRoomTemplates() {
  return useQuery({
    queryKey: ROOM_TEMPLATES_KEY,
    queryFn: () => apiClient.api.renovationRoomTemplates.get().then((r) => r ?? []),
    // Built-in and static on the server, so they never need refetching.
    staleTime: Infinity,
  });
}

export function useRenovationMaterials() {
  return useQuery({
    queryKey: MATERIALS_KEY,
    queryFn: () => apiClient.api.renovationMaterials.get().then((r) => r ?? []),
  });
}

export function useRenovationPurchases(projectId: number) {
  return useQuery({
    queryKey: purchasesKey(projectId),
    queryFn: () =>
      apiClient.api.renovationProjects.byId(projectId).purchases.get().then((r) => r ?? []),
    enabled: !!projectId,
  });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function useCreateRenovationProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; budget?: number; notes?: string }) => {
      const body: CreateRenovationProjectRequest = {
        name: data.name,
        budget: data.budget ?? null,
        notes: data.notes ?? null,
      };
      return apiClient.api.renovationProjects.post(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useUpdateRenovationProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: number; name: string; budget?: number; notes?: string }) => {
      const body: UpdateRenovationProjectRequest = {
        name: data.name,
        budget: data.budget ?? null,
        notes: data.notes ?? null,
      };
      return apiClient.api.renovationProjects.byId(data.id).put(body);
    },
    onSuccess: (_data, variables) => {
      invalidateProject(queryClient, variables.id);
    },
  });
}

export function useDeleteRenovationProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.api.renovationProjects.byId(id).delete(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      queryClient.removeQueries({ queryKey: projectKey(id) });
      queryClient.removeQueries({ queryKey: purchasesKey(id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Rooms and lines
// ---------------------------------------------------------------------------

export function useCreateRenovationRoom(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenovationRoomInput) => {
      const body: CreateRenovationRoomRequest = {
        name: data.name,
        roomType: data.roomType ?? null,
        length: data.length,
        width: data.width,
        height: data.height,
        doors: data.doors,
        windows: data.windows,
        lineKeys: data.lineKeys ?? null,
      };
      return apiClient.api.renovationProjects.byId(projectId).rooms.post(body);
    },
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useUpdateRenovationRoom(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenovationRoomDimensions & { roomId: number }) =>
      apiClient.api.renovationProjects
        .byId(projectId)
        .rooms.byRoomId(data.roomId)
        .put(toRoomUpdateBody(data)),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useDeleteRenovationRoom(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: number) =>
      apiClient.api.renovationProjects.byId(projectId).rooms.byRoomId(roomId).delete(),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useCreateRenovationLine(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenovationLineInput & { roomId: number }) =>
      apiClient.api.renovationProjects
        .byId(projectId)
        .rooms.byRoomId(data.roomId)
        .lines.post(toLineBody(data)),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useUpdateRenovationLine(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenovationLineInput & { lineId: number }) =>
      apiClient.api.renovationProjects
        .byId(projectId)
        .lines.byLineId(data.lineId)
        .put(toLineBody(data)),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useDeleteRenovationLine(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lineId: number) =>
      apiClient.api.renovationProjects.byId(projectId).lines.byLineId(lineId).delete(),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useReplaceRenovationMaterial(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { fromMaterialId: number; toMaterialId: number }) => {
      const body: ReplaceRenovationMaterialRequest = {
        fromMaterialId: data.fromMaterialId,
        toMaterialId: data.toMaterialId,
      };
      return apiClient.api.renovationProjects.byId(projectId).lines.replaceMaterial.post(body);
    },
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

// ---------------------------------------------------------------------------
// Materials (household price list)
// ---------------------------------------------------------------------------

export function useCreateRenovationMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenovationMaterialInput) =>
      apiClient.api.renovationMaterials.post(toMaterialBody(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY });
    },
  });
}

export function useUpdateRenovationMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenovationMaterialInput & { id: number }) =>
      apiClient.api.renovationMaterials.byId(data.id).put(toMaterialBody(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY });
    },
  });
}

export function useDeleteRenovationMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.api.renovationMaterials.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export function useCreateRenovationPurchase(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenovationPurchaseInput) => {
      const lines: CreateRenovationPurchaseLineRequest[] = data.lines.map((line) => ({
        lineId: line.lineId,
        quantity: line.quantity,
        // Not `?? null`: Kiota writes an explicit null, which the backend's non-nullable
        // `bool MarkComplete` rejects with a 400 — that failed every ordinary purchase.
        markComplete: line.markComplete ?? false,
      }));
      const body: CreateRenovationPurchaseRequest = {
        purchasedOn: DateOnly.parse(data.purchasedOn),
        vendor: data.vendor ?? null,
        vendorId: data.vendorId ?? null,
        totalAmount: data.totalAmount ?? null,
        notes: data.notes ?? null,
        lines,
      };
      return apiClient.api.renovationProjects.byId(projectId).purchases.post(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKey(projectId) });
      invalidateProject(queryClient, projectId);
    },
  });
}

export function useDeleteRenovationPurchase(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (purchaseId: number) =>
      apiClient.api.renovationProjects.byId(projectId).purchases.byPurchaseId(purchaseId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKey(projectId) });
      invalidateProject(queryClient, projectId);
    },
  });
}

/** Adds a purchased line to the inventory as one item; the server answers 409 on a second call. */
export function useAddRenovationLineToInventory(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddRenovationLineToInventoryInput) => {
      const body: AddRenovationLineToInventoryRequest = {
        storageUnitId: data.storageUnitId ?? null,
        boxId: data.boxId ?? null,
        brand: data.brand ?? null,
        model: data.model ?? null,
        warrantyExpiresOn: data.warrantyExpiresOn ? new Date(data.warrantyExpiresOn) : null,
      };
      return apiClient.api.renovationProjects
        .byId(projectId)
        .purchases.byPurchaseId(data.purchaseId)
        .lines.byLineId(data.lineId)
        .inventoryItem.post(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_ITEMS_KEY });
      queryClient.invalidateQueries({ queryKey: purchasesKey(projectId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Purchase receipts (attachments). Mirrors the bill attachment hooks in
// useBills.ts; the purchase's attachmentCount lives on the purchases list, so
// every write also refreshes that list.
// ---------------------------------------------------------------------------

export type { RenovationPurchaseAttachmentResponse };

export function useRenovationPurchaseAttachments(projectId: number, purchaseId: number, enabled = true) {
  return useQuery({
    queryKey: purchaseAttachmentsKey(projectId, purchaseId),
    queryFn: () =>
      apiClient.api.renovationProjects
        .byId(projectId)
        .purchases.byPurchaseId(purchaseId)
        .attachments.get()
        .then((r) => r ?? []),
    enabled: enabled && !!projectId && !!purchaseId,
  });
}

export function useUploadRenovationPurchaseAttachment(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { purchaseId: number; file: File; name?: string }) => {
      const file = await prepareImageForUpload(data.file);
      assertUploadSize(file);

      const multipartBody = await buildFileUploadBody(file);
      try {
        await apiClient.api.renovationProjects
          .byId(projectId)
          .purchases.byPurchaseId(data.purchaseId)
          .attachments.post(multipartBody, {
            queryParameters: { name: data.name },
          });
      } catch (e) {
        const kiota = e as { responseStatusCode?: number; message?: string };
        if (kiota.responseStatusCode === 413) {
          throw new Error(UPLOAD_TOO_LARGE_MESSAGE);
        }
        throw new Error(kiota.message || "Failed to upload receipt");
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseAttachmentsKey(projectId, variables.purchaseId) });
      queryClient.invalidateQueries({ queryKey: purchasesKey(projectId) });
    },
  });
}

export function useDownloadRenovationPurchaseAttachment(projectId: number) {
  return useMutation({
    mutationFn: async (data: { purchaseId: number; attachmentId: number; name: string }) => {
      const arrayBuffer = await apiClient.api.renovationProjects
        .byId(projectId)
        .purchases.byPurchaseId(data.purchaseId)
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

export function useDeleteRenovationPurchaseAttachment(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { purchaseId: number; attachmentId: number }) =>
      apiClient.api.renovationProjects
        .byId(projectId)
        .purchases.byPurchaseId(data.purchaseId)
        .attachments.byAttachmentId(data.attachmentId)
        .delete(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseAttachmentsKey(projectId, variables.purchaseId) });
      queryClient.invalidateQueries({ queryKey: purchasesKey(projectId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Room templates (household overrides of the built-in defaults)
// ---------------------------------------------------------------------------

export interface RenovationTemplateLineInput {
  key: string;
  label: string;
  group: string;
  category: string;
  materialName: string;
  basis: string;
  unit: string;
  defaultPrice?: number;
  wastePercent?: number;
  fixedQuantity?: number;
  enabledByDefault: boolean;
}

/** The whole template, sent on every save: the server replaces its fields and lines wholesale. */
export interface RenovationRoomTemplateInput {
  label: string;
  length: number;
  width: number;
  height: number;
  doors: number;
  windows: number;
  lines: RenovationTemplateLineInput[];
}

/** Upserts a room type's template for the household. Managers only (the server answers 403 otherwise). */
export function useSaveRenovationRoomTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomType, ...data }: RenovationRoomTemplateInput & { roomType: string }) =>
      apiClient.api.renovationRoomTemplates.byRoomType(roomType).put({
        label: data.label,
        length: data.length,
        width: data.width,
        height: data.height,
        doors: data.doors,
        windows: data.windows,
        lines: data.lines.map((line) => ({
          key: line.key,
          label: line.label,
          group: line.group,
          category: line.category,
          materialName: line.materialName,
          basis: line.basis,
          unit: line.unit,
          defaultPrice: line.defaultPrice ?? null,
          wastePercent: line.wastePercent ?? null,
          fixedQuantity: line.fixedQuantity ?? null,
          enabledByDefault: line.enabledByDefault,
        })),
      }),
    // Returned, not fired and forgotten, so mutateAsync resolves once the list has refetched.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOM_TEMPLATES_KEY }),
  });
}

/** Resets a customised built-in to its default, or removes a household-defined room type. */
export function useDeleteRenovationRoomTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomType: string) =>
      apiClient.api.renovationRoomTemplates.byRoomType(roomType).delete(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOM_TEMPLATES_KEY }),
  });
}
