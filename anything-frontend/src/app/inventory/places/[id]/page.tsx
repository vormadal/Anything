"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Box, Package, Plus } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { useHeaderActions } from "@/context/PageActionsContext";
import {
  useDeleteInventoryStorageUnit,
  useInventoryBoxes,
  useInventoryItems,
  useInventoryStorageUnit,
} from "@/hooks/useInventory";
import { BoxFormDialog } from "@/components/inventory/BoxFormDialog";
import { ItemFormDialog } from "@/components/inventory/ItemFormDialog";
import { PlaceFormDialog } from "@/components/inventory/PlaceFormDialog";
import { ConfirmDeleteDialog } from "@/components/inventory/ConfirmDeleteDialog";
import { DetailActionsMenu } from "@/components/inventory/DetailActionsMenu";
import { InventoryList, InventoryRow } from "@/components/inventory/InventoryRow";
import {
  INVENTORY_PATH,
  boxPath,
  boxesInPlace,
  formatBoxName,
  formatPlaceName,
  itemPath,
  itemsInBox,
  looseItemsInPlace,
} from "@/lib/inventory";

const SECTION_HEADING_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

export default function PlaceDetailPage() {
  const params = useParams();
  const placeId = Number(params.id);
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addBoxOpen, setAddBoxOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  const { data: place, isLoading, error } = useInventoryStorageUnit(placeId);
  const { data: boxes } = useInventoryBoxes();
  const { data: items } = useInventoryItems();
  const deletePlace = useDeleteInventoryStorageUnit();

  // Refs keep the header effect's deps stable, matching the lists detail page.
  const openEditRef = useRef(() => setEditOpen(true));
  const openDeleteRef = useRef(() => setDeleteOpen(true));

  useEffect(() => {
    setHeaderActions(
      <DetailActionsMenu
        onEdit={() => openEditRef.current()}
        onDelete={() => openDeleteRef.current()}
        deleteLabel="Delete place"
      />,
      false
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const placeBoxes = boxesInPlace(boxes ?? [], placeId);
  const loose = looseItemsInPlace(items ?? [], placeId);

  const handleDelete = async () => {
    try {
      await deletePlace.mutateAsync(placeId);
      setDeleteOpen(false);
      // Terminal action that navigates away — the overview can't show what is
      // no longer there, so confirm the outcome out of band.
      toast.success("Place deleted");
      router.push(INVENTORY_PATH);
    } catch {
      // The API refuses (409) while boxes or items still reference the place,
      // rather than silently orphaning them.
      toast.error("Empty this place first — it still has boxes or items in it.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <PageTitle>Place</PageTitle>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">
          Failed to load this place. It may have been deleted.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <PageTitle>{formatPlaceName(place)}</PageTitle>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setAddBoxOpen(true)}>
          <Plus className="h-4 w-4" />
          Add box
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAddItemOpen(true)}>
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className={SECTION_HEADING_CLASS}>Boxes</h2>
        {placeBoxes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No boxes here yet.
          </p>
        ) : (
          <InventoryList>
            {placeBoxes.map((box) => {
              const count = itemsInBox(items ?? [], box.id ?? 0).length;
              return (
                <InventoryRow
                  key={box.id}
                  href={boxPath(box.id ?? 0)}
                  title={formatBoxName(box)}
                  subtitle={`${count} ${count === 1 ? "item" : "items"}`}
                  count={count}
                  icon={<Box className="h-4 w-4" />}
                />
              );
            })}
          </InventoryList>
        )}
      </section>

      {loose.length > 0 && (
        <section className="space-y-2">
          <h2 className={SECTION_HEADING_CLASS}>Loose items</h2>
          <InventoryList>
            {loose.map((item) => (
              <InventoryRow
                key={item.id}
                href={itemPath(item.id ?? 0)}
                title={item.name ?? ""}
                subtitle={item.description}
                icon={<Package className="h-4 w-4" />}
              />
            ))}
          </InventoryList>
        </section>
      )}

      {editOpen && (
        <PlaceFormDialog place={place} onClose={() => setEditOpen(false)} />
      )}
      {addBoxOpen && (
        <BoxFormDialog defaultPlaceId={placeId} onClose={() => setAddBoxOpen(false)} />
      )}
      {addItemOpen && (
        <ItemFormDialog defaultPlaceId={placeId} onClose={() => setAddItemOpen(false)} />
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        title="Delete place"
        message={`Delete "${formatPlaceName(place)}"? Move its boxes and items somewhere else first — this cannot be undone.`}
        isPending={deletePlace.isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
