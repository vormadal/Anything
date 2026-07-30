"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MultipartBody } from "@microsoft/kiota-abstractions";
import { apiClient, createMultipartBody } from "@/lib/apiClient";
import type {
  InventoryAttachmentResponse,
  InventoryBoxResponse,
  InventoryItemFieldResponse,
  InventoryItemResponse,
  InventoryItemSummaryResponse,
  InventoryStorageUnitResponse,
} from "@/lib/api-client/models/index";

export type {
  InventoryAttachmentResponse,
  InventoryBoxResponse,
  InventoryItemFieldResponse,
  InventoryItemResponse,
  InventoryItemSummaryResponse,
  InventoryStorageUnitResponse,
};

const STORAGE_UNITS_KEY = ["inventoryStorageUnits"] as const;
const BOXES_KEY = ["inventoryBoxes"] as const;
const ITEMS_KEY = ["inventoryItems"] as const;

const STORAGE_UNIT_KEY = "inventoryStorageUnit";
const BOX_KEY = "inventoryBox";
const ITEM_KEY = "inventoryItem";

/**
 * All three lists are fetched whole (the API returns the household's entire
 * inventory) and joined client-side to derive box/item counts, so every page
 * shares the same three cache entries rather than issuing per-parent requests.
 */

/** Body shared by create and update of a storage place. */
export interface StorageUnitInput {
  name: string;
  type?: string | null;
}

/** Body shared by create and update of a box. */
export interface BoxInput {
  number: number;
  storageUnitId?: number | null;
  label?: string | null;
  description?: string | null;
}

/** Body shared by create and update of an item. Dates are `<input type="date">` strings. */
export interface ItemInput {
  name: string;
  description?: string | null;
  boxId?: number | null;
  storageUnitId?: number | null;
  quantity?: number | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchasedOn?: string | null;
  purchasePrice?: number | null;
  warrantyExpiresOn?: string | null;
  notes?: string | null;
}

// --- Storage places -------------------------------------------------------

export function useInventoryStorageUnits() {
  return useQuery({
    queryKey: STORAGE_UNITS_KEY,
    // Refetch on re-entry so a place created or renamed on a detail page shows
    // without a manual refresh — same reasoning as useNotes/useRecipes.
    refetchOnMount: "always",
    queryFn: async (): Promise<InventoryStorageUnitResponse[]> => {
      const units = await apiClient.api.inventoryStorageUnits.get();
      return units ?? [];
    },
  });
}

export function useInventoryStorageUnit(id: number) {
  return useQuery({
    queryKey: [STORAGE_UNIT_KEY, id],
    enabled: id > 0,
    refetchOnMount: "always",
    queryFn: () =>
      apiClient.api.inventoryStorageUnits.byId(id).get() as Promise<InventoryStorageUnitResponse>,
  });
}

export function useCreateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unit: StorageUnitInput) =>
      apiClient.api.inventoryStorageUnits.post({
        name: unit.name,
        type: unit.type ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORAGE_UNITS_KEY });
    },
  });
}

export function useUpdateInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unit: StorageUnitInput & { id: number }) =>
      apiClient.api.inventoryStorageUnits.byId(unit.id).put({
        name: unit.name,
        type: unit.type ?? null,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: STORAGE_UNITS_KEY });
      queryClient.invalidateQueries({ queryKey: [STORAGE_UNIT_KEY, variables.id] });
    },
  });
}

export function useDeleteInventoryStorageUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.inventoryStorageUnits.byId(id).delete(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: STORAGE_UNITS_KEY });
      queryClient.removeQueries({ queryKey: [STORAGE_UNIT_KEY, id] });
    },
  });
}

// --- Boxes ----------------------------------------------------------------

export function useInventoryBoxes() {
  return useQuery({
    queryKey: BOXES_KEY,
    refetchOnMount: "always",
    queryFn: async (): Promise<InventoryBoxResponse[]> => {
      const boxes = await apiClient.api.inventoryBoxes.get();
      return boxes ?? [];
    },
  });
}

export function useInventoryBox(id: number) {
  return useQuery({
    queryKey: [BOX_KEY, id],
    enabled: id > 0,
    refetchOnMount: "always",
    queryFn: () => apiClient.api.inventoryBoxes.byId(id).get() as Promise<InventoryBoxResponse>,
  });
}

export function useCreateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (box: BoxInput) =>
      apiClient.api.inventoryBoxes.post({
        number: box.number,
        storageUnitId: box.storageUnitId ?? null,
        label: box.label ?? null,
        description: box.description ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOXES_KEY });
    },
  });
}

export function useUpdateInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (box: BoxInput & { id: number }) =>
      apiClient.api.inventoryBoxes.byId(box.id).put({
        number: box.number,
        storageUnitId: box.storageUnitId ?? null,
        label: box.label ?? null,
        description: box.description ?? null,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: BOXES_KEY });
      queryClient.invalidateQueries({ queryKey: [BOX_KEY, variables.id] });
    },
  });
}

export function useDeleteInventoryBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.inventoryBoxes.byId(id).delete(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: BOXES_KEY });
      queryClient.removeQueries({ queryKey: [BOX_KEY, id] });
      // Deleting a box clears BoxId on every item it held (the server keeps the
      // items and only unassigns them), so the item list is stale too.
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
    },
  });
}

// --- Items ----------------------------------------------------------------

export function useInventoryItems() {
  return useQuery({
    queryKey: ITEMS_KEY,
    refetchOnMount: "always",
    queryFn: async (): Promise<InventoryItemSummaryResponse[]> => {
      const items = await apiClient.api.inventoryItems.get();
      return items ?? [];
    },
  });
}

export function useInventoryItem(id: number) {
  return useQuery({
    queryKey: [ITEM_KEY, id],
    enabled: id > 0,
    refetchOnMount: "always",
    queryFn: () => apiClient.api.inventoryItems.byId(id).get() as Promise<InventoryItemResponse>,
  });
}

/** Shared by create/update: builds the wire body from an `ItemInput`. */
function toItemRequestBody(item: ItemInput) {
  return {
    name: item.name,
    description: item.description ?? null,
    boxId: item.boxId ?? null,
    storageUnitId: item.storageUnitId ?? null,
    quantity: item.quantity ?? null,
    brand: item.brand ?? null,
    model: item.model ?? null,
    serialNumber: item.serialNumber ?? null,
    purchasedOn: item.purchasedOn ? new Date(item.purchasedOn) : null,
    purchasePrice: item.purchasePrice ?? null,
    warrantyExpiresOn: item.warrantyExpiresOn ? new Date(item.warrantyExpiresOn) : null,
    notes: item.notes ?? null,
  };
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ItemInput) => apiClient.api.inventoryItems.post(toItemRequestBody(item)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ItemInput & { id: number }) =>
      apiClient.api.inventoryItems.byId(item.id).put(toItemRequestBody(item)),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
      queryClient.invalidateQueries({ queryKey: [ITEM_KEY, variables.id] });
    },
  });
}

export function useUpdateInventoryItemFields(itemId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fields: { label: string; value: string }[]) =>
      apiClient.api.inventoryItems.byId(itemId).fields.put({ fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEM_KEY, itemId] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.inventoryItems.byId(id).delete(),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
      queryClient.removeQueries({ queryKey: [ITEM_KEY, id] });
    },
  });
}

// --- Attachments ------------------------------------------------------------
//
// Items, boxes and places each get their own `.../attachments` sub-resource on
// the generated client, but the three request builders are structurally
// identical (mirroring the backend's shared `InventoryAttachment` table), so
// upload/download are written once here and reused for all three owners.

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface AttachmentsRequestBuilder {
  get(): Promise<InventoryAttachmentResponse[] | undefined>;
  post(
    body: MultipartBody,
    requestConfiguration?: { queryParameters?: { kind?: string; name?: string } }
  ): Promise<InventoryAttachmentResponse | undefined>;
  byAttachmentId(attachmentId: number): {
    delete(): Promise<void>;
    download: { get(): Promise<ArrayBuffer | undefined> };
  };
}

async function uploadInventoryAttachment(
  builder: AttachmentsRequestBuilder,
  data: { file: File; kind?: string; name?: string }
): Promise<void> {
  if (data.file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(
      `File is too large (${(data.file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`
    );
  }

  const multipartBody = createMultipartBody();
  // Kiota's multipart serializer only supports string/ArrayBuffer/Uint8Array
  // part content — passing the File object itself throws before any request.
  const fileContent = await data.file.arrayBuffer();
  multipartBody.addOrReplacePart(
    "file",
    data.file.type || "application/octet-stream",
    fileContent,
    undefined,
    data.file.name
  );

  try {
    await builder.post(multipartBody, { queryParameters: { kind: data.kind, name: data.name } });
  } catch (e) {
    const kiota = e as { responseStatusCode?: number; message?: string };
    if (kiota.responseStatusCode === 413) {
      throw new Error("File is too large. Please use a file under 10 MB.");
    }
    throw new Error(kiota.message || "Failed to upload attachment");
  }
}

async function downloadInventoryAttachment(
  builder: AttachmentsRequestBuilder,
  attachmentId: number,
  name: string
): Promise<void> {
  const arrayBuffer = await builder.byAttachmentId(attachmentId).download.get();
  if (!arrayBuffer) throw new Error("Attachment data not returned by server");
  const blob = new Blob([arrayBuffer]);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function useInventoryAttachments(queryKeyPrefix: string, id: number, builder: AttachmentsRequestBuilder) {
  return useQuery({
    queryKey: [queryKeyPrefix, id],
    enabled: id > 0,
    queryFn: async () => (await builder.get()) ?? [],
  });
}

function useUploadInventoryAttachment(queryKeyPrefix: string, id: number, builder: AttachmentsRequestBuilder) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { file: File; kind?: string; name?: string }) =>
      uploadInventoryAttachment(builder, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, id] });
    },
  });
}

function useDownloadInventoryAttachment(builder: AttachmentsRequestBuilder) {
  return useMutation({
    mutationFn: (data: { attachmentId: number; name: string }) =>
      downloadInventoryAttachment(builder, data.attachmentId, data.name),
  });
}

function useDeleteInventoryAttachment(queryKeyPrefix: string, id: number, builder: AttachmentsRequestBuilder) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => builder.byAttachmentId(attachmentId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, id] });
    },
  });
}

const ITEM_ATTACHMENTS_KEY = "inventoryItemAttachments";
const BOX_ATTACHMENTS_KEY = "inventoryBoxAttachments";
const STORAGE_UNIT_ATTACHMENTS_KEY = "inventoryStorageUnitAttachments";

export function useInventoryItemAttachments(itemId: number) {
  return useInventoryAttachments(ITEM_ATTACHMENTS_KEY, itemId, apiClient.api.inventoryItems.byId(itemId).attachments);
}
export function useUploadInventoryItemAttachment(itemId: number) {
  return useUploadInventoryAttachment(ITEM_ATTACHMENTS_KEY, itemId, apiClient.api.inventoryItems.byId(itemId).attachments);
}
export function useDownloadInventoryItemAttachment(itemId: number) {
  return useDownloadInventoryAttachment(apiClient.api.inventoryItems.byId(itemId).attachments);
}
export function useDeleteInventoryItemAttachment(itemId: number) {
  return useDeleteInventoryAttachment(ITEM_ATTACHMENTS_KEY, itemId, apiClient.api.inventoryItems.byId(itemId).attachments);
}

export function useInventoryBoxAttachments(boxId: number) {
  return useInventoryAttachments(BOX_ATTACHMENTS_KEY, boxId, apiClient.api.inventoryBoxes.byId(boxId).attachments);
}
export function useUploadInventoryBoxAttachment(boxId: number) {
  return useUploadInventoryAttachment(BOX_ATTACHMENTS_KEY, boxId, apiClient.api.inventoryBoxes.byId(boxId).attachments);
}
export function useDownloadInventoryBoxAttachment(boxId: number) {
  return useDownloadInventoryAttachment(apiClient.api.inventoryBoxes.byId(boxId).attachments);
}
export function useDeleteInventoryBoxAttachment(boxId: number) {
  return useDeleteInventoryAttachment(BOX_ATTACHMENTS_KEY, boxId, apiClient.api.inventoryBoxes.byId(boxId).attachments);
}

export function useInventoryStorageUnitAttachments(storageUnitId: number) {
  return useInventoryAttachments(
    STORAGE_UNIT_ATTACHMENTS_KEY, storageUnitId, apiClient.api.inventoryStorageUnits.byId(storageUnitId).attachments
  );
}
export function useUploadInventoryStorageUnitAttachment(storageUnitId: number) {
  return useUploadInventoryAttachment(
    STORAGE_UNIT_ATTACHMENTS_KEY, storageUnitId, apiClient.api.inventoryStorageUnits.byId(storageUnitId).attachments
  );
}
export function useDownloadInventoryStorageUnitAttachment(storageUnitId: number) {
  return useDownloadInventoryAttachment(apiClient.api.inventoryStorageUnits.byId(storageUnitId).attachments);
}
export function useDeleteInventoryStorageUnitAttachment(storageUnitId: number) {
  return useDeleteInventoryAttachment(
    STORAGE_UNIT_ATTACHMENTS_KEY, storageUnitId, apiClient.api.inventoryStorageUnits.byId(storageUnitId).attachments
  );
}
