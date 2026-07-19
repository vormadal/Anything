"use client";

import { useState, useRef, useEffect } from "react";
import { useUpdateShoppingList } from "@/hooks/useShoppingLists";
import { toast } from "sonner";

/**
 * Encapsulates state and logic for the "Edit list name" dialog.
 * Used by both ShoppingListEditMode and GeneralChecklistEditMode.
 */
export function useEditListNameDialog(
  listId: number,
  listName: string | null | undefined,
  openEditNameDialogRef: React.MutableRefObject<() => void>
) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const updateList = useUpdateShoppingList();

  useEffect(() => {
    openEditNameDialogRef.current = () => {
      setValue(listName ?? "");
      setOpen(true);
    };
  }, [listName, openEditNameDialogRef]);
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === (listName ?? "")) {
      setOpen(false);
      return;
    }
    try {
      await updateList.mutateAsync({ id: listId, name: trimmed });
      setOpen(false);
    } catch {
      toast.error("Failed to update list name. Please try again.");
    }
  };

  return {
    open,
    setOpen,
    value,
    setValue,
    inputRef,
    handleSave,
    isPending: updateList.isPending,
  };
}
