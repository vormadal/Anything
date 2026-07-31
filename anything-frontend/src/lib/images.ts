/**
 * Client-side image helpers shared by every feature that lets a user attach a
 * photo (recipe OCR scans, note images): downscaling before upload.
 */

const MAX_IMAGE_DIMENSION = 2000;

/**
 * Downscale a photo so its longest side is at most `maxDim` pixels. Phone
 * photos are often 4000px+, which is slower to upload/process and no more
 * useful than a smaller copy. Falls back to the original file if the image
 * cannot be decoded.
 */
export async function downscaleImage(file: File, maxDim: number = MAX_IMAGE_DIMENSION): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = maxDim / Math.max(bitmap.width, bitmap.height);
    if (scale >= 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}
