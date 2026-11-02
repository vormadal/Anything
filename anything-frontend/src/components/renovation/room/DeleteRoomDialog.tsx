"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RenovationRoomResponse } from "@/lib/api-client/models/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeleteRenovationRoom } from "@/hooks/useRenovation";
import {
  FIELD_ERROR_CLASS,
  GENERIC_ERROR_MESSAGE,
  ROOM_HAS_PURCHASES_MESSAGE,
  isConflict,
} from "./roomDisplay";

interface DeleteRoomDialogProps {
  projectId: number;
  room: RenovationRoomResponse;
  onClose: () => void;
}

/** Confirms, then deletes the room and returns to its project (the room's page no longer exists). */
export function DeleteRoomDialog({ projectId, room, onClose }: DeleteRoomDialogProps) {
  const router = useRouter();
  const deleteRoom = useDeleteRenovationRoom(projectId);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteRoom.mutateAsync(room.id ?? 0);
      toast.success(`${room.name ?? "Room"} deleted`);
      router.push(`/renovation/${projectId}`);
    } catch (err) {
      setError(isConflict(err) ? ROOM_HAS_PURCHASES_MESSAGE : GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {room.name ?? "room"}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Its budget lines go with it. This can&apos;t be undone.
        </p>
        {error && (
          <p role="alert" className={FIELD_ERROR_CLASS}>
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="min-h-[44px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="min-h-[44px]"
            onClick={handleDelete}
            disabled={deleteRoom.isPending}
          >
            Delete room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
