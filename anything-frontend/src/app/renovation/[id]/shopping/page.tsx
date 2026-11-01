"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { LoadErrorState } from "@/components/LoadErrorState";
import { ConfirmDeleteDialog } from "@/components/inventory/ConfirmDeleteDialog";
import { loadFailure } from "@/lib/queryState";
import { formatKr, groupToBuy, type GroupedToBuy } from "@/lib/renovation";
import {
  useAddRenovationLineToInventory,
  useCreateRenovationPurchase,
  useDeleteRenovationPurchase,
  useRenovationMaterials,
  useRenovationProject,
  useRenovationPurchases,
  type RenovationPurchaseInput,
} from "@/hooks/useRenovation";
import { useVendors } from "@/hooks/useVendors";
import type { RenovationMaterialResponse, RenovationPurchaseLineResponse } from "@/lib/api-client/models/index";
import { AddToInventoryDialog, type InventoryDetails, type InventoryTarget } from "@/components/renovation/shopping/AddToInventoryDialog";
import { PurchaseHistory } from "@/components/renovation/shopping/PurchaseHistory";
import { RecordPurchaseDialog } from "@/components/renovation/shopping/RecordPurchaseDialog";
import { SelectionBar } from "@/components/renovation/shopping/SelectionBar";
import { ToBuySection } from "@/components/renovation/shopping/ToBuySection";
import {
  allGroups,
  initialSelection,
  parseLineParam,
  selectedGroups,
  statusOf,
  summarizeSelection,
  toggleKey,
} from "@/components/renovation/shopping/shoppingView";

const NOTHING_TO_BUY: GroupedToBuy = { materials: [], services: [] };

export default function RenovationShoppingPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusLineId = parseLineParam(searchParams.get("line"));

  const projectQuery = useRenovationProject(projectId);
  const purchasesQuery = useRenovationPurchases(projectId);
  const materialsQuery = useRenovationMaterials();
  const vendorsQuery = useVendors();
  const createPurchase = useCreateRenovationPurchase(projectId);
  const deletePurchase = useDeleteRenovationPurchase(projectId);
  const addToInventory = useAddRenovationLineToInventory(projectId);
  const { setLeftAction } = useHeaderActions();

  // `null` means the user hasn't touched the selection yet, so the `?line=` preselect applies.
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [recording, setRecording] = useState(false);
  const [inventoryTarget, setInventoryTarget] = useState<InventoryTarget | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setLeftAction({ type: "back", href: `/renovation/${projectId}` });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction, projectId]);

  const grouped = useMemo(
    () => (projectQuery.data ? groupToBuy(projectQuery.data) : NOTHING_TO_BUY),
    [projectQuery.data],
  );
  const selectedKeys = useMemo(
    () => picked ?? initialSelection(grouped, focusLineId),
    [picked, grouped, focusLineId],
  );
  const selected = useMemo(() => selectedGroups(grouped, selectedKeys), [grouped, selectedKeys]);
  const remaining = useMemo(() => summarizeSelection(allGroups(grouped)), [grouped]);
  const selection = useMemo(() => summarizeSelection(selected), [selected]);

  const materialsById = useMemo(
    () =>
      new Map<number, RenovationMaterialResponse>(
        (materialsQuery.data ?? []).map((material): [number, RenovationMaterialResponse] => [
          material.id ?? 0,
          material,
        ]),
      ),
    [materialsQuery.data],
  );

  const projectLoad = loadFailure(projectQuery);
  const purchasesLoad = loadFailure(purchasesQuery);
  const purchases = useMemo(() => purchasesQuery.data ?? [], [purchasesQuery.data]);
  const spent = purchases.reduce((sum, purchase) => sum + (purchase.totalAmount ?? 0), 0);

  const handleToggle = (key: string) => setPicked(toggleKey(selectedKeys, key));

  const handleRecord = async (input: RenovationPurchaseInput) => {
    try {
      await createPurchase.mutateAsync(input);
      setRecording(false);
      setPicked(new Set());
    } catch {
      toast.error("Couldn't record purchase");
    }
  };

  const handleAddToInventory = async (details: InventoryDetails) => {
    if (!inventoryTarget) return;
    const { purchaseId, line } = inventoryTarget;
    try {
      const item = await addToInventory.mutateAsync({
        purchaseId,
        lineId: line.lineId ?? 0,
        ...details,
      });
      setInventoryTarget(null);
      const itemId = item?.id;
      toast.success(
        "Added to inventory",
        itemId
          ? { action: { label: "View item", onClick: () => router.push(`/inventory/items/${itemId}`) } }
          : undefined,
      );
    } catch (err) {
      toast.error(
        statusOf(err) === 409 ? "This line is already in the inventory" : "Couldn't add to inventory",
      );
    }
  };

  const handleDeletePurchase = async () => {
    if (pendingDeleteId === null) return;
    try {
      await deletePurchase.mutateAsync(pendingDeleteId);
    } catch {
      toast.error("Couldn't delete purchase");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const openInventoryDialog = (purchaseId: number, line: RenovationPurchaseLineResponse) =>
    setInventoryTarget({ purchaseId, line });

  if (projectQuery.isLoading) {
    return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</p>;
  }

  const hasAnythingToBuy = allGroups(grouped).length > 0;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-4">
      <PageTitle>Shopping & purchases</PageTitle>

      <section aria-label="Still to buy" className="space-y-4">
        {projectLoad.failed ? (
          <LoadErrorState what="this shopping list" onRetry={projectLoad.retry} isRetrying={projectLoad.isRetrying} />
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">Still to buy, all rooms</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatKr(remaining.estimate)}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{remaining.lineCount} lines</span>
            </div>

            {!hasAnythingToBuy && (
              <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Nothing left to buy. Every line is covered.
              </p>
            )}

            <ToBuySection
              title="Materials"
              groups={grouped.materials}
              selected={selectedKeys}
              materialsById={materialsById}
              onToggle={handleToggle}
            />
            <ToBuySection
              title="Services"
              groups={grouped.services}
              selected={selectedKeys}
              materialsById={materialsById}
              onToggle={handleToggle}
            />

            {selected.length > 0 && !recording && (
              <SelectionBar summary={selection} onRecord={() => setRecording(true)} />
            )}
          </>
        )}
      </section>

      <section aria-labelledby="purchases-heading" className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 id="purchases-heading" className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Purchases
          </h2>
          {!purchasesLoad.failed && purchasesQuery.data && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatKr(spent)} spent</span>
          )}
        </div>
        {purchasesLoad.failed ? (
          <LoadErrorState what="purchases" onRetry={purchasesLoad.retry} isRetrying={purchasesLoad.isRetrying} />
        ) : purchasesQuery.isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading purchases…</p>
        ) : purchases.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            No purchases recorded yet.
          </p>
        ) : (
          <PurchaseHistory
            purchases={purchases}
            onAddToInventory={openInventoryDialog}
            onDeletePurchase={setPendingDeleteId}
          />
        )}
      </section>

      <RecordPurchaseDialog
        open={recording && selected.length > 0}
        onOpenChange={setRecording}
        groups={selected}
        vendors={vendorsQuery.data ?? []}
        isPending={createPurchase.isPending}
        onSubmit={handleRecord}
      />

      <AddToInventoryDialog
        target={inventoryTarget}
        isPending={addToInventory.isPending}
        onClose={() => setInventoryTarget(null)}
        onSubmit={handleAddToInventory}
      />

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        title="Delete purchase?"
        message="Its quantities go back on the shopping list."
        isPending={deletePurchase.isPending}
        onConfirm={handleDeletePurchase}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
