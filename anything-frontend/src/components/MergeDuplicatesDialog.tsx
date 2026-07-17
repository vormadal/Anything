"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useFindDuplicateRecommendations,
  useMergeRecommendations,
} from "@/hooks/useRecommendations";
import { useSuggestionCategories } from "@/hooks/useSuggestionCategories";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import type { MergeRecommendationsRequest, ShoppingListRecommendation, SuggestionCategory } from "@/lib/api-client/models/index";
import { toast } from "sonner";
import { useMemo, useState } from "react";

interface MergeDuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SELECT_CLASS =
  "w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white";

const groupKey = (members: ShoppingListRecommendation[]) => members.map((m) => m.id).join("-");

interface DuplicateGroupEditorProps {
  group: ShoppingListRecommendation[];
  groupNumber: number;
  totalGroups: number;
  categories: SuggestionCategory[];
  scopeLabel: (member: ShoppingListRecommendation) => string;
  isPending: boolean;
  onMerge: (body: MergeRecommendationsRequest) => void;
  onSkip: () => void;
}

// Keyed by the group so each new group remounts with fresh initial state,
// avoiding a setState-in-effect to reset the picker between groups.
function DuplicateGroupEditor({
  group,
  groupNumber,
  totalGroups,
  categories,
  scopeLabel,
  isPending,
  onMerge,
  onSkip,
}: DuplicateGroupEditorProps) {
  // Default the "keep" selection to a member that already has a category, else the first.
  const initial = group.find((m) => m.categoryId != null) ?? group[0];
  const [keepId, setKeepId] = useState<number | null>(initial?.id ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  // Members included in this merge. Defaults to all, so the common typo case still
  // merges the whole group in one click; uncheck any that don't belong to exclude them.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(group.map((m) => m.id).filter((id): id is number => id != null))
  );

  const applyKeep = (member: ShoppingListRecommendation) => {
    setKeepId(member.id ?? null);
    setName(member.name ?? "");
    setCategoryId(member.categoryId ?? null);
  };

  const handlePickKeep = (member: ShoppingListRecommendation) => {
    applyKeep(member);
    // Picking a member as "keep" implicitly includes it in the merge.
    if (member.id != null) {
      setSelected((prev) => new Set(prev).add(member.id!));
    }
  };

  const handleToggleSelected = (member: ShoppingListRecommendation, include: boolean) => {
    if (member.id == null) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (include) {
        next.add(member.id!);
      } else {
        next.delete(member.id!);
        // The kept target must always stay selected: if it was deselected, hand "keep"
        // to the first still-selected member so name/category stay meaningful.
        if (keepId === member.id) {
          const fallback = group.find((m) => m.id != null && next.has(m.id));
          if (fallback) applyKeep(fallback);
        }
      }
      return next;
    });
  };

  const canMerge = selected.size >= 2 && keepId != null && selected.has(keepId) && !!name.trim();

  const handleMerge = () => {
    if (!canMerge || keepId == null) return;
    const sourceIds = [...selected].filter((id) => id !== keepId);
    if (sourceIds.length === 0) return;
    onMerge({ targetId: keepId, sourceIds, name: name.trim(), categoryId });
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Group {groupNumber} of {totalGroups}
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Include the items to merge, and pick the one to keep
          </legend>
          {group.map((member) => {
            const categoryName = categories.find((c) => c.id === member.categoryId)?.name;
            const isSelected = member.id != null && selected.has(member.id);
            return (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-md border border-gray-200 p-2 text-sm dark:border-gray-700"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleToggleSelected(member, e.target.checked)}
                  aria-label={`Include ${member.name}`}
                  className="h-4 w-4"
                />
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="radio"
                    name="keep-recommendation"
                    checked={keepId === member.id}
                    onChange={() => handlePickKeep(member)}
                    disabled={!isSelected}
                    aria-label={`Keep ${member.name}`}
                    className="h-4 w-4 disabled:opacity-40"
                  />
                  <span
                    className={`min-w-0 flex-1 truncate ${
                      isSelected ? "text-gray-900 dark:text-white" : "text-gray-400 line-through dark:text-gray-500"
                    }`}
                  >
                    {member.name}
                  </span>
                </label>
                {categoryName && (
                  <span className="shrink-0 text-xs text-blue-600 dark:text-blue-400">{categoryName}</span>
                )}
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {scopeLabel(member)}
                </span>
              </div>
            );
          })}
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Merged name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label="Merged name"
            className={SELECT_CLASS}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</span>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            aria-label="Merged category"
            className={SELECT_CLASS}
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id ?? ""}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DialogFooter className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={onSkip} disabled={isPending}>
          Skip
        </Button>
        <Button onClick={handleMerge} disabled={isPending || !canMerge}>
          Merge
        </Button>
      </DialogFooter>
    </>
  );
}

// Mounted only while the dialog is open, so the query runs on demand and the
// "resolved" set starts fresh each time — no effects needed to reset state.
function MergeDuplicatesContent({ onClose }: { onClose: () => void }) {
  const { data: groups, isLoading, isError } = useFindDuplicateRecommendations();
  const { data: categories = [] } = useSuggestionCategories();
  const { data: allLists = [] } = useShoppingLists();
  const mergeRecommendations = useMergeRecommendations();

  // Groups already merged or skipped, tracked by a stable key so they drop out
  // of the review even before the refetch removes a merged one.
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const listNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of allLists) {
      if (l.id != null) map.set(l.id, l.name ?? `List #${l.id}`);
    }
    return map;
  }, [allLists]);

  const scopeLabel = (member: ShoppingListRecommendation): string => {
    if (member.shoppingListId == null) return "Shared";
    return listNameById.get(member.shoppingListId) ?? `List #${member.shoppingListId}`;
  };

  const remaining = useMemo(
    () => (groups ?? []).map((g) => g.members ?? []).filter((m) => m.length > 0 && !resolved.has(groupKey(m))),
    [groups, resolved]
  );

  const totalFound = (groups ?? []).filter((g) => (g.members ?? []).length > 0).length;
  const isEmpty = !isLoading && !isError && totalFound === 0;
  const isDone = !isLoading && !isError && totalFound > 0 && remaining.length === 0;
  const currentGroup = remaining[0];

  const handleMerge = async (body: MergeRecommendationsRequest) => {
    const key = currentGroup ? groupKey(currentGroup) : "";
    try {
      await mergeRecommendations.mutateAsync(body);
      toast.success("Suggestions merged.");
      setResolved((prev) => new Set(prev).add(key));
    } catch {
      toast.error("Failed to merge suggestions.");
    }
  };

  const handleSkip = () => {
    if (currentGroup) setResolved((prev) => new Set(prev).add(groupKey(currentGroup)));
  };

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Scanning suggestions...</p>;
  }
  if (isError) {
    return (
      <>
        <p className="py-8 text-center text-sm text-red-500">Failed to scan for duplicates.</p>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </>
    );
  }
  if (isEmpty) {
    return (
      <>
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No similar suggestions found.</p>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </>
    );
  }
  if (isDone || !currentGroup) {
    return (
      <>
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">All duplicate groups reviewed.</p>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <DuplicateGroupEditor
      key={groupKey(currentGroup)}
      group={currentGroup}
      groupNumber={totalFound - remaining.length + 1}
      totalGroups={totalFound}
      categories={categories}
      scopeLabel={scopeLabel}
      isPending={mergeRecommendations.isPending}
      onMerge={handleMerge}
      onSkip={handleSkip}
    />
  );
}

export function MergeDuplicatesDialog({ open, onOpenChange }: MergeDuplicatesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="merge-duplicates-description">
        <DialogHeader>
          <DialogTitle>Find duplicate suggestions</DialogTitle>
        </DialogHeader>
        <p id="merge-duplicates-description" className="text-sm text-gray-600 dark:text-gray-400">
          Similar suggestions are grouped below. Uncheck any that don&apos;t belong, pick the one
          to keep, then merge the rest into it. Leftover similar items reappear as a new group.
        </p>
        {open && <MergeDuplicatesContent onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
