"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FIELD_ERROR_CLASS, FIELD_INPUT_CLASS, FIELD_LABEL_CLASS } from "@/components/renovation/room/roomDisplay";
import { deriveSlug, validateNewRoomType } from "./templateModel";

interface NewRoomTypeDialogProps {
  existingTypes: readonly string[];
  onOpenChange: (open: boolean) => void;
  onCreate: (label: string) => void;
}

/** Asks for the name of a new room type. The stored key is derived from it, and the template is saved from the editor. */
export function NewRoomTypeDialog({ existingTypes, onOpenChange, onCreate }: NewRoomTypeDialogProps) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const slug = deriveSlug(label);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const message = validateNewRoomType(label, existingTypes);
    setError(message);
    if (!message) onCreate(label.trim());
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New room type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div>
            <label htmlFor="new-room-type-label" className={FIELD_LABEL_CLASS}>
              Name
            </label>
            <input
              id="new-room-type-label"
              type="text"
              required
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              aria-invalid={error ? true : undefined}
              className={`${FIELD_INPUT_CLASS} min-h-[44px]`}
            />
            {slug && !error && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Stored as “{slug}”</p>}
            {error && (
              <p role="alert" className={`mt-1 ${FIELD_ERROR_CLASS}`}>
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-11">
              Continue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
