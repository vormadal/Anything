"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Package, Plus } from "lucide-react";
import Image from "next/image";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { useHeaderActions } from "@/context/PageActionsContext";
import {
  useDeleteInventoryBox,
  useDeleteInventoryBoxAttachment,
  useDownloadInventoryBoxAttachment,
  useInventoryBox,
  useInventoryBoxAttachments,
  useInventoryItems,
  useInventoryStorageUnits,
  useUploadInventoryBoxAttachment,
} from "@/hooks/useInventory";
import { BoxFormDialog } from "@/components/inventory/BoxFormDialog";
import { ItemFormDialog } from "@/components/inventory/ItemFormDialog";
import { ConfirmDeleteDialog } from "@/components/inventory/ConfirmDeleteDialog";
import { DetailActionsMenu } from "@/components/inventory/DetailActionsMenu";
import { InventoryList, InventoryRow } from "@/components/inventory/InventoryRow";
import { InventoryAttachments } from "@/components/inventory/InventoryAttachments";
import {
  INVENTORY_PATH,
  InventoryAttachmentKinds,
  formatBoxName,
  formatPlaceName,
  itemPath,
  itemsInBox,
  placePath,
} from "@/lib/inventory";

export default function BoxDetailPage() {
  const params = useParams();
  const boxId = Number(params.id);
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  const { data: box, isLoading, error } = useInventoryBox(boxId);
  const { data: items } = useInventoryItems();
  const { data: places } = useInventoryStorageUnits();
  const deleteBox = useDeleteInventoryBox();

  const attachments = useInventoryBoxAttachments(boxId);
  const uploadAttachment = useUploadInventoryBoxAttachment(boxId);
  const downloadAttachment = useDownloadInventoryBoxAttachment(boxId);
  const deleteAttachment = useDeleteInventoryBoxAttachment(boxId);
  const headerPhoto = attachments.data?.find((a) => a.kind === InventoryAttachmentKinds.Photo);

  const openEditRef = useRef(() => setEditOpen(true));
  const openDeleteRef = useRef(() => setDeleteOpen(true));

  useEffect(() => {
    setHeaderActions(
      <DetailActionsMenu
        onEdit={() => openEditRef.current()}
        onDelete={() => openDeleteRef.current()}
        deleteLabel="Delete box"
      />,
      false
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const contents = itemsInBox(items ?? [], boxId);
  const place = box?.storageUnitId
    ? places?.find((p) => p.id === box.storageUnitId)
    : undefined;

  const handleDelete = async () => {
    try {
      await deleteBox.mutateAsync(boxId);
      setDeleteOpen(false);
      toast.success("Box deleted");
      router.push(place?.id ? placePath(place.id) : INVENTORY_PATH);
    } catch {
      toast.error("Failed to delete box");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !box) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <PageTitle>Box</PageTitle>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">
          Failed to load this box. It may have been deleted.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <PageTitle>{formatBoxName(box)}</PageTitle>

      {headerPhoto?.thumbnailUrl && (
        <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          <Image
            src={headerPhoto.thumbnailUrl}
            alt={box.label ?? formatBoxName(box)}
            fill
            sizes="(max-width: 672px) 100vw, 672px"
            className="object-cover"
          />
        </div>
      )}

      {/* The app header already renders the box number (via PageTitle), so the
          page body only adds what the header can't show. */}
      {box.label && (
        <p className="text-base font-medium text-gray-900 dark:text-white">{box.label}</p>
      )}
      {box.description && (
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {box.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {place ? (
          <Link
            href={placePath(place.id ?? 0)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {formatPlaceName(place)}
          </Link>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Not in a place yet</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setAddItemOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add item
        </Button>
      </div>

      {contents.length === 0 ? (
        <p className="text-center py-12 text-gray-500 dark:text-gray-400">
          This box is empty. Add what you packed into it.
        </p>
      ) : (
        <InventoryList>
          {contents.map((item) => (
            <InventoryRow
              key={item.id}
              href={itemPath(item.id ?? 0)}
              title={item.name ?? ""}
              subtitle={item.description}
              icon={<Package className="h-4 w-4" />}
            />
          ))}
        </InventoryList>
      )}

      <InventoryAttachments
        attachments={attachments.data}
        isLoading={attachments.isLoading}
        onUpload={(data) => uploadAttachment.mutateAsync(data)}
        isUploading={uploadAttachment.isPending}
        onDownload={(data) => downloadAttachment.mutate(data)}
        onDelete={(id) => deleteAttachment.mutateAsync(id)}
        isDeleting={deleteAttachment.isPending}
      />

      {editOpen && <BoxFormDialog box={box} onClose={() => setEditOpen(false)} />}
      {addItemOpen && (
        <ItemFormDialog
          defaultBoxId={boxId}
          defaultPlaceId={box.storageUnitId ?? null}
          onClose={() => setAddItemOpen(false)}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        title="Delete box"
        message={
          contents.length > 0
            ? `Delete ${formatBoxName(box)}? Its ${contents.length} ${contents.length === 1 ? "item stays" : "items stay"} in your inventory but will no longer be in a box.`
            : `Delete ${formatBoxName(box)}? This cannot be undone.`
        }
        isPending={deleteBox.isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
