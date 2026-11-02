"use client";

import { useState } from "react";
import type { RenovationRoomResponse } from "@/lib/api-client/models/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateRenovationRoom } from "@/hooks/useRenovation";
import {
  FIELD_ERROR_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  GENERIC_ERROR_MESSAGE,
} from "./roomDisplay";

interface EditRoomDialogProps {
  projectId: number;
  room: RenovationRoomResponse;
  onClose: () => void;
}

/** Room name, dimensions and openings. Saving re-prices every line that is measured from them. */
export function EditRoomDialog({ projectId, room, onClose }: EditRoomDialogProps) {
  const [name, setName] = useState(room.name ?? "");
  const [length, setLength] = useState(String(room.length ?? ""));
  const [width, setWidth] = useState(String(room.width ?? ""));
  const [height, setHeight] = useState(String(room.height ?? ""));
  const [doors, setDoors] = useState(String(room.doors ?? 0));
  const [windows, setWindows] = useState(String(room.windows ?? 0));
  const [error, setError] = useState<string | null>(null);
  const updateRoom = useUpdateRenovationRoom(projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await updateRoom.mutateAsync({
        roomId: room.id ?? 0,
        name: name.trim(),
        length: Number(length),
        width: Number(width),
        height: Number(height),
        doors: Number(doors),
        windows: Number(windows),
      });
      onClose();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    }
  };

  const numberInput = (id: string, label: string, value: string, onChange: (v: string) => void, step: string) => (
    <div>
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_INPUT_CLASS}
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit size</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="edit-room-name" className={FIELD_LABEL_CLASS}>Room name</label>
            <input
              id="edit-room-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {numberInput("edit-room-length", "Length (m)", length, setLength, "0.01")}
            {numberInput("edit-room-width", "Width (m)", width, setWidth, "0.01")}
            {numberInput("edit-room-height", "Height (m)", height, setHeight, "0.01")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {numberInput("edit-room-doors", "Doors", doors, setDoors, "1")}
            {numberInput("edit-room-windows", "Windows", windows, setWindows, "1")}
          </div>
          {error && (
            <p role="alert" className={FIELD_ERROR_CLASS}>
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-[44px]" disabled={updateRoom.isPending}>
              Save size
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
