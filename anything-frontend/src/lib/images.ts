/**
 * Client-side image helpers shared by every feature that lets a user attach a
 * photo (inventory/bill attachments, recipe images, note images, OCR scans):
 * downscaling and size-capping before upload.
 */

const MAX_IMAGE_DIMENSION = 1920;
const UPLOAD_IMAGE_QUALITY = 0.85;

// Re-encode even an already-small-dimension image once it gets this heavy
// (e.g. an unoptimized screenshot or PNG) — dimensions alone don't catch that.
const REENCODE_BYTE_THRESHOLD = 2 * 1024 * 1024;

async function encodeAtScale(bitmap: ImageBitmap, scale: number): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", UPLOAD_IMAGE_QUALITY));
}

/**
 * Downscale a photo so its longest side is at most `maxDim` pixels, re-encoding
 * as JPEG even when no resize is needed if the file is still unreasonably
 * heavy for its dimensions. Phone photos are often 4000px+, which is slower to
 * upload/process and no more useful than a smaller copy. Falls back to the
 * original file if the image cannot be decoded.
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
    if (scale >= 1 && file.size <= REENCODE_BYTE_THRESHOLD) return file;

    const blob = await encodeAtScale(bitmap, Math.min(scale, 1));
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

const NON_RESIZABLE_IMAGE_TYPES = new Set(["image/gif", "image/svg+xml"]);

/**
 * Whether a file is a raster image `downscaleImage` can safely re-encode.
 * Excludes GIF (canvas would flatten animation to a single frame) and SVG
 * (vector; re-encoding to JPEG is lossy and pointless).
 */
export function isResizableImage(file: File): boolean {
  const mediaType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  return mediaType.startsWith("image/") && !NON_RESIZABLE_IMAGE_TYPES.has(mediaType);
}

/**
 * Shrinks an image file before upload so a full-resolution phone photo isn't
 * stored forever server-side when nothing in the app ever renders it larger
 * than `MAX_IMAGE_DIMENSION`. Non-images, GIFs and SVGs pass through untouched
 * (see `isResizableImage`); anything else is returned as a `File` (not a bare
 * `Blob`) so callers can keep reading `.name`/`.type` for the multipart part.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isResizableImage(file)) return file;

  const blob = await downscaleImage(file);
  if (blob === file) return file;

  const jpegName = `${file.name.replace(/\.[^./]+$/, "")}.jpg`;
  return new File([blob], jpegName, { type: "image/jpeg" });
}

// 10 MB — matches the API's Kestrel/form body limit (see UploadLimits.cs).
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

/** Generic fallback for a server-side 413 (the request never reached the size check below). */
export const UPLOAD_TOO_LARGE_MESSAGE = `File is too large. Please use a file under ${MAX_UPLOAD_MB} MB.`;

/** Throws with the file's actual size when it exceeds the shared upload cap. */
export function assertUploadSize(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_UPLOAD_MB} MB.`
    );
  }
}
