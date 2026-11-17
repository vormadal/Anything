"use client";

import { useEffect, useRef } from "react";
import { SquarePen, Trash2 } from "lucide-react";
import { HeaderMenu } from "@/components/HeaderMenu";
import { useHeaderActions } from "@/context/PageActionsContext";
import { usePageActions } from "@/hooks/usePageActions";

interface DetailActionsOptions {
  editLabel: string;
  onEdit: () => void;
  deleteLabel: string;
  onDelete: () => void;
  /** False while the entity isn't loaded, so there is nothing to act on yet. */
  enabled?: boolean;
}

/**
 * Edit/delete actions shared by the place, box, item and renovation-project
 * detail pages: Edit in the floating action button, Delete in the header's ⋮.
 */
export function useDetailActions({ editLabel, onEdit, deleteLabel, onDelete, enabled = true }: DetailActionsOptions) {
  const { setHeaderActions } = useHeaderActions();
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  });

  useEffect(() => {
    if (!enabled) return;
    setHeaderActions(
      <HeaderMenu
        items={[{ label: deleteLabel, icon: Trash2, destructive: true, onSelect: () => onDeleteRef.current() }]}
      />
    );
    return () => setHeaderActions(null);
  }, [deleteLabel, enabled, setHeaderActions]);

  usePageActions(enabled ? [{ label: editLabel, icon: SquarePen, onSelect: onEdit }] : []);
}
