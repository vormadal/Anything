"use client";

import type { RenovationRoomResponse } from "@/lib/api-client/models/index";
import { AddLineDialog } from "./AddLineDialog";
import { ChangeMaterialDialog } from "./ChangeMaterialDialog";
import { DeleteRoomDialog } from "./DeleteRoomDialog";
import { EditLineDialog } from "./EditLineDialog";
import { EditRoomDialog } from "./EditRoomDialog";
import { LineDialog } from "./LineDialog";
import type { RoomDialogState } from "./roomDisplay";

interface RoomDialogsProps {
  projectId: number;
  room: RenovationRoomResponse;
  dialog: RoomDialogState | null;
  onOpen: (next: RoomDialogState) => void;
  onClose: () => void;
}

/**
 * Mounts only the dialog that is open, so each one starts from fresh form state and never
 * stacks on another (a line's sheet hands off to its material or edit dialog by replacing it).
 */
export function RoomDialogs({ projectId, room, dialog, onOpen, onClose }: RoomDialogsProps) {
  if (!dialog) return null;
  const roomId = room.id ?? 0;

  switch (dialog.kind) {
    case "addLine":
      return <AddLineDialog projectId={projectId} roomId={roomId} onClose={onClose} />;
    case "editRoom":
      return <EditRoomDialog projectId={projectId} room={room} onClose={onClose} />;
    case "deleteRoom":
      return <DeleteRoomDialog projectId={projectId} room={room} onClose={onClose} />;
    default:
      break;
  }

  const line = room.lines?.find((candidate) => candidate.id === dialog.lineId);
  if (!line) return null;

  switch (dialog.kind) {
    case "material":
      return <ChangeMaterialDialog projectId={projectId} line={line} onClose={onClose} />;
    case "editLine":
      return <EditLineDialog projectId={projectId} line={line} onClose={onClose} />;
    default:
      return <LineDialog projectId={projectId} line={line} onOpen={onOpen} onClose={onClose} />;
  }
}
