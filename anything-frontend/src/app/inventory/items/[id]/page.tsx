"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageTitle } from "@/components/PageTitle";
import { useHeaderActions } from "@/context/PageActionsContext";
import {
  useDeleteInventoryItem,
  useDeleteInventoryItemAttachment,
  useDownloadInventoryItemAttachment,
  useInventoryBoxes,
  useInventoryItem,
  useInventoryItemAttachments,
  useInventoryStorageUnits,
  useUploadInventoryItemAttachment,
} from "@/hooks/useInventory";
import { ItemFormDialog } from "@/components/inventory/ItemFormDialog";
import { ConfirmDeleteDialog } from "@/components/inventory/ConfirmDeleteDialog";
import { DetailActionsMenu } from "@/components/inventory/DetailActionsMenu";
import { WarrantyBadge } from "@/components/inventory/WarrantyBadge";
import { CustomFieldsEditor } from "@/components/inventory/CustomFieldsEditor";
import { InventoryDocuments } from "@/components/inventory/InventoryDocuments";
import { InventoryPhotoGallery } from "@/components/inventory/InventoryPhotoGallery";
import {
  INVENTORY_PATH,
  boxPath,
  formatBoxName,
  formatPlaceName,
  placePath,
} from "@/lib/inventory";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
  }).format(amount);
}

// `item.purchasedOn`/`warrantyExpiresOn` are typed as `Date` by the generated
// client, but a query restored from the offline persister (see
// lib/offline/persister.ts) has been through a JSON.stringify/parse round
// trip, which turns Date instances back into plain ISO strings until the
// post-restore refetch lands. Re-wrapping in `new Date()` here handles both.
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("da-DK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ItemDetailPage() {
  const params = useParams();
  const itemId = Number(params.id);
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: item, isLoading, error } = useInventoryItem(itemId);
  const { data: boxes } = useInventoryBoxes();
  const { data: places } = useInventoryStorageUnits();
  const deleteItem = useDeleteInventoryItem();

  const attachments = useInventoryItemAttachments(itemId);
  const uploadAttachment = useUploadInventoryItemAttachment(itemId);
  const downloadAttachment = useDownloadInventoryItemAttachment(itemId);
  const deleteAttachment = useDeleteInventoryItemAttachment(itemId);

  const openEditRef = useRef(() => setEditOpen(true));
  const openDeleteRef = useRef(() => setDeleteOpen(true));

  useEffect(() => {
    setHeaderActions(
      <DetailActionsMenu
        onEdit={() => openEditRef.current()}
        onDelete={() => openDeleteRef.current()}
        deleteLabel="Delete item"
      />,
      false
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const box = item?.boxId ? boxes?.find((b) => b.id === item.boxId) : undefined;
  // The box wins over the item's own storageUnitId: if the two ever disagree,
  // the physical box is where the item actually is.
  const placeId = box?.storageUnitId ?? item?.storageUnitId;
  const place = placeId ? places?.find((p) => p.id === placeId) : undefined;

  const metadataRows: { label: string; value: string }[] = [];
  if (item?.quantity != null) metadataRows.push({ label: "Quantity", value: String(item.quantity) });
  if (item?.brand) metadataRows.push({ label: "Brand", value: item.brand });
  if (item?.model) metadataRows.push({ label: "Model", value: item.model });
  if (item?.serialNumber) metadataRows.push({ label: "Serial number", value: item.serialNumber });
  if (item?.purchasedOn) metadataRows.push({ label: "Purchased on", value: formatDate(item.purchasedOn) });
  if (item?.purchasePrice != null) {
    metadataRows.push({ label: "Purchase price", value: formatCurrency(item.purchasePrice) });
  }

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(itemId);
      setDeleteOpen(false);
      toast.success("Item deleted");
      router.push(box?.id ? boxPath(box.id) : INVENTORY_PATH);
    } catch {
      toast.error("Failed to delete item");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <PageTitle>Item</PageTitle>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">
          Failed to load this item. It may have been deleted.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-5">
      <PageTitle>{item.name ?? "Item"}</PageTitle>

      <InventoryPhotoGallery
        attachments={attachments.data}
        label={item.name ?? "Item"}
        onUpload={(data) => uploadAttachment.mutateAsync(data)}
        isUploading={uploadAttachment.isPending}
        onDelete={(id) => deleteAttachment.mutateAsync(id)}
        isDeleting={deleteAttachment.isPending}
      />

      {/* The app header already renders the item name (via PageTitle). No
          section headers here — description vs. location is distinguished by
          size/weight/color alone, matching how a business card separates a
          name from a title without labelling either. */}
      {item.description && (
        <p className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {item.description}
        </p>
      )}

      {place || box ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
          {place && (
            <Link
              href={placePath(place.id ?? 0)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {formatPlaceName(place)}
            </Link>
          )}
          {place && box && <span>·</span>}
          {box && (
            <Link
              href={boxPath(box.id ?? 0)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {formatBoxName(box)}
            </Link>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Not placed yet</p>
      )}

      {item.warrantyExpiresOn && <WarrantyBadge warrantyExpiresOn={item.warrantyExpiresOn} />}

      {metadataRows.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {metadataRows.map((row) => (
            <div key={row.label}>
              <dt className="text-gray-500 dark:text-gray-400">{row.label}</dt>
              <dd className="text-gray-900 dark:text-white">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {item.notes && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Notes</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.notes}</p>
        </div>
      )}

      <CustomFieldsEditor itemId={itemId} fields={item.fields ?? []} />

      <InventoryDocuments
        attachments={attachments.data}
        isLoading={attachments.isLoading}
        onUpload={(data) => uploadAttachment.mutateAsync(data)}
        isUploading={uploadAttachment.isPending}
        onDownload={(data) => downloadAttachment.mutate(data)}
        onDelete={(id) => deleteAttachment.mutateAsync(id)}
        isDeleting={deleteAttachment.isPending}
      />

      {editOpen && <ItemFormDialog item={item} onClose={() => setEditOpen(false)} />}

      <ConfirmDeleteDialog
        open={deleteOpen}
        title="Delete item"
        message={`Delete "${item.name}"? This cannot be undone.`}
        isPending={deleteItem.isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
