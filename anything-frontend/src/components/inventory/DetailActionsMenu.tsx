"use client";

import { MoreVertical, SquarePen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DESTRUCTIVE_ITEM_CLASS =
  "text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20";

interface DetailActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  deleteLabel: string;
}

/** Edit/delete overflow menu shared by the place, box and item detail pages. */
export function DetailActionsMenu({
  onEdit,
  onDelete,
  deleteLabel,
}: DetailActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More options">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <SquarePen className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className={DESTRUCTIVE_ITEM_CLASS} onSelect={onDelete}>
          <Trash2 className="h-4 w-4" />
          {deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
