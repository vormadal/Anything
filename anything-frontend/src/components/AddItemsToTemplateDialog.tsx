"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useShoppingListItems, useCopyItemsToTemplate } from "@/hooks/useShoppingLists";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: number;
  templateId: number;
  templateName: string;
}

export function AddItemsToTemplateDialog({ open, onOpenChange, listId, templateId, templateName }: Props) {
  const { data: listItems = [] } = useShoppingListItems(listId);
  const { data: templateItems = [] } = useShoppingListItems(templateId);
  const copyItemsToTemplate = useCopyItemsToTemplate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const templateNames = new Set(templateItems.map((i) => (i.name ?? "").trim().toLowerCase()));
  const candidateItems = listItems.filter((i) => !templateNames.has((i.name ?? "").trim().toLowerCase()));

  const toggleItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    try {
      await copyItemsToTemplate.mutateAsync({ id: listId, templateId, itemIds: Array.from(selectedIds) });
      toast.success("Items added to template.");
      onOpenChange(false);
    } catch {
      toast.error("Failed to add items to template. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="add-items-to-template-description">
        <DialogHeader>
          <DialogTitle>Add items to &ldquo;{templateName}&rdquo;</DialogTitle>
        </DialogHeader>
        <p id="add-items-to-template-description" className="text-sm text-gray-600 dark:text-gray-400">
          Choose which items on this list to copy into the template.
        </p>
        {candidateItems.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            All of this list&apos;s items are already in the template.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {candidateItems.map((item) => (
              <li key={item.id}>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id ?? 0)}
                    onChange={() => toggleItem(item.id ?? 0)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                  />
                  {item.name}
                </label>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || copyItemsToTemplate.isPending}
            aria-label="Add selected items to template"
          >
            Add to template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
