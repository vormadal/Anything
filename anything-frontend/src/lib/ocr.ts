/**
 * Client-side OCR for the "scan recipe from photo" flow.
 *
 * tesseract.js is dynamically imported so the (heavy) worker/WASM machinery
 * only loads when the user actually scans a photo. The worker, WASM cores and
 * Danish+English traineddata are served same-origin from /tesseract and
 * /tessdata (see scripts/copy-tesseract-assets.mjs and public/tessdata).
 */

export interface ClassifiedRecipeText {
  name: string;
  ingredientsText: string;
  stepsText: string;
}

const MAX_IMAGE_DIMENSION = 2000;

/**
 * Downscale a photo so its longest side is at most `maxDim` pixels. Phone
 * photos are often 4000px+, which is slower and no more accurate to OCR.
 * Falls back to the original file if the image cannot be decoded.
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

/**
 * Run OCR (Danish + English) on a recipe photo and return the raw text.
 * Reports progress in [0, 1] while text recognition runs.
 */
export async function recognizeRecipePhoto(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const { createWorker } = await import("tesseract.js");

  const image = await downscaleImage(file);
  const worker = await createWorker("dan+eng", undefined, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract",
    langPath: "/tessdata",
    logger: (message) => {
      if (message.status === "recognizing text") {
        onProgress?.(message.progress);
      }
    },
  });

  try {
    const result = await worker.recognize(image);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

const UNIT_TOKENS = new Set([
  "g", "kg", "mg", "dl", "l", "ml", "cl",
  "tsk", "spsk", "stk", "knsp", "ds", "dåse", "pk", "pose", "bundt", "fed",
  "cup", "cups", "tbsp", "tsp", "oz", "lb", "lbs", "clove", "cloves",
  "can", "cans", "pinch", "handful", "dash", "slice", "slices", "piece", "pieces",
]);

const NUMERIC_START = /^[\d¼½¾⅓⅔⅛]/;
const MAX_INGREDIENT_LINE_LENGTH = 60;

function looksLikeIngredient(line: string): boolean {
  if (NUMERIC_START.test(line)) return true;
  if (line.length > MAX_INGREDIENT_LINE_LENGTH) return false;
  return line
    .toLowerCase()
    .split(/\s+/)
    .slice(0, 2)
    .some((word) => UNIT_TOKENS.has(word.replace(/[.,]$/, "")));
}

/**
 * Crude prefill classifier for OCR output: first non-empty line becomes the
 * name, short/numeric lines become ingredients, the rest become steps. The
 * user reviews and corrects the result before importing, so this only needs
 * to be a decent starting point.
 */
export function classifyOcrLines(text: string): ClassifiedRecipeText {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const name = lines.shift() ?? "";
  const ingredients: string[] = [];
  const steps: string[] = [];

  for (const line of lines) {
    if (looksLikeIngredient(line)) {
      ingredients.push(line);
    } else {
      steps.push(line);
    }
  }

  return {
    name,
    ingredientsText: ingredients.join("\n"),
    stepsText: steps.join("\n"),
  };
}
