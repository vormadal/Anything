"use client";

import { MoreVertical, Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DESTRUCTIVE_ITEM_CLASS =
  "text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20";

interface RoomMenuProps {
  onEditSize: () => void;
  onDelete: () => void;
}

/** Room overflow menu: resize the room, or delete it. */
export function RoomMenu({ onEditSize, onDelete }: RoomMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Room settings" className="h-11 w-11 shrink-0">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEditSize}>
          <Ruler className="h-4 w-4" />
          Edit size
        </DropdownMenuItem>
        <DropdownMenuItem className={DESTRUCTIVE_ITEM_CLASS} onSelect={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete room
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
