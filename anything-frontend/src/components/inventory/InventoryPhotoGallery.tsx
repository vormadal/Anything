"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { InventoryAttachmentKinds } from "@/lib/inventory";
import type { InventoryAttachmentResponse } from "@/hooks/useInventory";
import { AddPhotoMenu } from "@/components/inventory/AddPhotoMenu";
import { InventoryPhotoViewer } from "@/components/inventory/InventoryPhotoViewer";
import { PhotoIndicators, PhotoStrip, type StripPhoto } from "@/components/inventory/PhotoStrip";

interface InventoryPhotoGalleryProps {
  attachments: InventoryAttachmentResponse[] | undefined;
  /** Entity name, used for alt text on photos that have no name of their own. */
  label: string;
  onUpload: (data: { file: File; kind: string }) => Promise<unknown>;
  isUploading: boolean;
  onDelete: (attachmentId: number) => Promise<unknown>;
  isDeleting: boolean;
}

const HERO_SIZES = "(max-width: 672px) 100vw, 672px";

/**
 * The photo hero at the top of an item, box or place. Swipes between photos in place and
 * opens the fullscreen viewer on tap, so every photo is reachable at full resolution
 * rather than only the first one being visible as a banner.
 */
export function InventoryPhotoGallery({
  attachments,
  label,
  onUpload,
  isUploading,
  onDelete,
  isDeleting,
}: InventoryPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const photos: StripPhoto[] = (attachments ?? [])
    .filter((a) => a.kind === InventoryAttachmentKinds.Photo && a.url)
    .map((a, index) => ({
      id: a.id ?? index,
      // The full render rather than the 300px thumbnail — this fills the width of the page.
      src: a.url ?? "",
      alt: a.name ?? `${label} photo ${index + 1}`,
    }));

  if (photos.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
        <ImageIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
        <AddPhotoMenu onUpload={onUpload} isUploading={isUploading} variant="plain" />
      </div>
    );
  }

  return (
    <>
      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        <PhotoStrip
          photos={photos}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          fit="cover"
          sizes={HERO_SIZES}
          onPhotoClick={setViewerIndex}
        />
        <div className="absolute right-2 top-2">
          <AddPhotoMenu onUpload={onUpload} isUploading={isUploading} />
        </div>
        <PhotoIndicators count={photos.length} activeIndex={activeIndex} onSelect={setActiveIndex} />
      </div>

      {viewerIndex !== null && (
        // Keyed so reopening on a different photo remounts the strip at that index,
        // rather than syncing it back through an effect.
        <InventoryPhotoViewer
          key={viewerIndex}
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={onDelete}
          isDeleting={isDeleting}
          title={`${label} photos`}
        />
      )}
    </>
  );
}
