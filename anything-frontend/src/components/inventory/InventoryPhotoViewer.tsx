"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OFFLINE_HINT } from "@/components/inventory/inventoryFormStyles";
import { PhotoIndicators, PhotoStrip, type StripPhoto } from "@/components/inventory/PhotoStrip";

interface InventoryPhotoViewerProps {
  photos: StripPhoto[];
  /** Photo to open on. Mount the viewer keyed by this so reopening resets the strip. */
  initialIndex: number;
  onClose: () => void;
  onDelete: (photoId: number) => Promise<unknown>;
  isDeleting: boolean;
  title: string;
}

const OVERLAY_BUTTON_CLASS =
  "rounded-full bg-black/55 p-2 text-white backdrop-blur-sm hover:bg-black/75 disabled:opacity-50";

const ARROW_BUTTON_CLASS =
  "absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-black/55 p-2 text-white backdrop-blur-sm hover:bg-black/75 sm:block";

/** Fullscreen, swipeable photo viewer — the large view behind every inventory thumbnail. */
export function InventoryPhotoViewer({
  photos,
  initialIndex,
  onClose,
  onDelete,
  isDeleting,
  title,
}: InventoryPhotoViewerProps) {
  const isOnline = useOnlineStatus();
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Derived rather than stored: deleting a photo can shrink the list out from under the
  // current index, and clamping in an effect would cost an extra render pass.
  const activeIndex = Math.min(selectedIndex, Math.max(0, photos.length - 1));

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setSelectedIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setSelectedIndex((i) => Math.min(photos.length - 1, i + 1));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [photos.length]);

  async function handleDelete() {
    const photo = photos[activeIndex];
    if (!photo) return;
    try {
      await onDelete(photo.id);
      // Nothing else on screen conveys that the last photo is gone, since the viewer
      // itself disappears with it.
      if (photos.length === 1) onClose();
    } catch {
      toast.error("Failed to delete photo");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent fullScreen aria-describedby={undefined}>
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div className="relative flex-1 overflow-hidden">
          <PhotoStrip
            photos={photos}
            activeIndex={activeIndex}
            onActiveIndexChange={setSelectedIndex}
            fit="contain"
            sizes="100vw"
          />

          {activeIndex > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIndex(activeIndex - 1)}
              aria-label="Previous photo"
              className={`${ARROW_BUTTON_CLASS} left-3`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {activeIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={() => setSelectedIndex(activeIndex + 1)}
              aria-label="Next photo"
              className={`${ARROW_BUTTON_CLASS} right-3`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-3">
            <button type="button" onClick={onClose} aria-label="Close" className={OVERLAY_BUTTON_CLASS}>
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting || !isOnline}
              title={isOnline ? undefined : OFFLINE_HINT}
              aria-label="Delete photo"
              className={OVERLAY_BUTTON_CLASS}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>

          <PhotoIndicators
            count={photos.length}
            activeIndex={activeIndex}
            onSelect={setSelectedIndex}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
