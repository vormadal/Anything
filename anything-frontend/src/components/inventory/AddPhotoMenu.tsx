"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { InventoryAttachmentKinds } from "@/lib/inventory";
import { OFFLINE_HINT } from "@/components/inventory/inventoryFormStyles";

interface AddPhotoMenuProps {
  onUpload: (data: { file: File; kind: string }) => Promise<unknown>;
  isUploading: boolean;
  /** Light-on-dark styling for the button overlaid on the gallery. */
  variant?: "overlay" | "plain";
}

const OVERLAY_TRIGGER_CLASS =
  "inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 disabled:opacity-50";

const PLAIN_TRIGGER_CLASS =
  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-50";

/**
 * "Add photo" dropdown offering the camera as well as the library. The two are separate
 * hidden inputs on purpose: `capture` forces the camera and cannot be combined with
 * `multiple`, so only the library picker takes several files at once.
 */
export function AddPhotoMenu({ onUpload, isUploading, variant = "overlay" }: AddPhotoMenuProps) {
  const isOnline = useOnlineStatus();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const input = e.target;
    if (files.length === 0) return;

    try {
      for (const [index, file] of files.entries()) {
        setProgress({ done: index, total: files.length });
        await onUpload({ file, kind: InventoryAttachmentKinds.Photo });
      }
    } catch {
      toast.error(files.length > 1 ? "Failed to upload every photo" : "Failed to upload photo");
    } finally {
      setProgress(null);
      // Cleared so re-picking the same file still fires `change`.
      input.value = "";
    }
  }

  const disabled = isUploading || !isOnline;
  const label = progress
    ? `Uploading ${progress.done + 1}/${progress.total}...`
    : isUploading
      ? "Uploading..."
      : "Add photo";

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="add-photo-camera-input"
        onChange={handleFiles}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="add-photo-library-input"
        onChange={handleFiles}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          title={isOnline ? undefined : OFFLINE_HINT}
          className={variant === "overlay" ? OVERLAY_TRIGGER_CLASS : PLAIN_TRIGGER_CLASS}
        >
          <Plus className="h-3.5 w-3.5" />
          {label}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => cameraInputRef.current?.click()}>
            <Camera className="h-4 w-4" />
            Take photo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => libraryInputRef.current?.click()}>
            <ImageIcon className="h-4 w-4" />
            Choose from library
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
