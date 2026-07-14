/**
 * Client-side OCR for the "scan recipe from photo" flow.
 *
 * tesseract.js is dynamically imported so the (heavy) worker/WASM machinery
 * only loads when the user actually scans a photo. The worker, WASM cores and
 * Danish+English traineddata are served same-origin from /tesseract and
 * /tessdata (see scripts/copy-tesseract-assets.mjs and public/tessdata).
 */

interface ClassifiedRecipeText {
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

// Printed recipes usually label their sections; an exact header match is the
// strongest classification signal available. Matched after lowercasing and
// stripping trailing punctuation, so "INGREDIENSER:" hits "ingredienser".
const INGREDIENT_HEADERS = new Set([
  "ingredienser", "ingredients", "du skal bruge", "det skal du bruge",
]);
const STEP_HEADERS = new Set([
  "fremgangsmåde", "tilberedning", "sådan gør du", "sådan gør man",
  "instructions", "method", "directions", "steps", "preparation",
  // OCR frequently misreads å/ø; accept common transliterations.
  "fremgangsmaade", "fremgangsmade", "sadan gor du", "saadan goer du",
]);
const MAX_HEADER_LENGTH = 32;

// Steps are imperative sentences; their first word is a cooking verb.
const STEP_VERBS = new Set([
  // Danish
  "rør", "bland", "pisk", "steg", "bag", "hæld", "tilsæt", "kom", "varm",
  "opvarm", "forvarm", "skær", "hak", "lad", "smelt", "server", "servér",
  "anret", "fordel", "vend", "dæk", "stil", "sæt", "tag", "kog", "bring",
  "drys", "smag", "riv", "pensl", "mos", "si", "afkøl", "ælt", "skræl",
  // English
  "whisk", "mix", "stir", "add", "heat", "bake", "fry", "pour", "combine",
  "let", "melt", "serve", "preheat", "place", "put", "remove", "cut", "chop",
  "slice", "season", "cover", "boil", "simmer", "cook", "drain", "transfer",
  "sprinkle", "spread", "fold", "beat", "knead", "cool", "garnish", "repeat",
  "flip", "reduce", "blend", "mash",
]);

// "250", "1,5", "1/2", "1 1/2", "½", "1 ½"
const LEADING_QUANTITY =
  /^(\d+\s+\d+\/\d+|\d+\s+[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+|\d+(?:[.,]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])/;
// "1. " / "3) " enumeration, as used for numbered instructions
const NUMBERED_STEP_PREFIX = /^\d{1,2}[.)]\s+/;
const LEADING_BULLET = /^[-–•*·]\s*/;
const MAX_INGREDIENT_LINE_LENGTH = 60;

const stripWordPunctuation = (word: string): string => word.replace(/[.,:;!?]+$/, "");

function startsWithQuantityAndUnit(text: string): boolean {
  const quantity = LEADING_QUANTITY.exec(text);
  if (!quantity) return false;
  const nextWord = text.slice(quantity[0].length).trimStart().split(/\s+/)[0];
  return UNIT_TOKENS.has(stripWordPunctuation(nextWord ?? "").toLowerCase());
}

function headerLabel(line: string): "ingredients" | "steps" | null {
  const normalized = stripWordPunctuation(line.trim()).toLowerCase();
  if (normalized.length > MAX_HEADER_LENGTH) return null;
  if (INGREDIENT_HEADERS.has(normalized)) return "ingredients";
  if (STEP_HEADERS.has(normalized)) return "steps";
  return null;
}

/**
 * Signed ingredient-likelihood score for one line: positive means
 * ingredient-ish, negative means instruction-ish, magnitude is confidence.
 */
function scoreLine(rawLine: string): number {
  const line = rawLine.trim();
  const bulleted = LEADING_BULLET.test(line);
  const body = line.replace(LEADING_BULLET, "");
  let score = bulleted ? 1 : 0;

  const numbered = NUMBERED_STEP_PREFIX.exec(body);
  const unnumberedBody = numbered ? body.slice(numbered[0].length) : body;
  if (numbered) {
    // "1. Whisk the flour…" is an enumerated instruction, but "1. 2 dl mælk"
    // is an enumerated ingredient.
    score += startsWithQuantityAndUnit(unnumberedBody) ? 1 : -3;
  } else if (LEADING_QUANTITY.test(body)) {
    score += startsWithQuantityAndUnit(body) ? 3 : 1;
  }

  const words = unnumberedBody
    .toLowerCase()
    .split(/\s+/)
    .map(stripWordPunctuation)
    .filter((word) => word.length > 0);
  const firstWord = words[0] ?? "";

  if (!numbered && !LEADING_QUANTITY.test(body) && words.slice(0, 2).some((word) => UNIT_TOKENS.has(word))) {
    score += 1;
  }
  if (STEP_VERBS.has(firstWord)) score -= 3;
  if (line.length > MAX_INGREDIENT_LINE_LENGTH) score -= 1;
  if (words.length > 8) score -= 1;
  if (/[.!]$/.test(line)) score -= 0.5;
  if (words.length <= 5 && !STEP_VERBS.has(firstWord)) score += 0.5;

  return score;
}

/**
 * Split a run of unlabeled lines into a contiguous ingredients block followed
 * by a contiguous steps block — recipes virtually always list ingredients
 * first, and contiguity lets confidently-scored neighbours absorb the odd
 * ambiguous or misread line instead of flipping category mid-block.
 *
 * Picks the split index maximising (sum of scores before it) − (sum after
 * it), which reduces to maximising the prefix sum. `preferIngredients`
 * controls tie-breaking: sections introduced by an "Ingredienser" header
 * default to ingredients, headerless text defaults to steps.
 */
function bestSplit(
  lines: string[],
  preferIngredients: boolean
): { ingredients: string[]; steps: string[] } {
  const scores = lines.map(scoreLine);
  let splitIndex = 0;
  let bestPrefixSum = 0;
  let prefixSum = 0;
  for (let k = 1; k <= lines.length; k++) {
    prefixSum += scores[k - 1];
    if (prefixSum > bestPrefixSum || (preferIngredients && prefixSum === bestPrefixSum)) {
      bestPrefixSum = prefixSum;
      splitIndex = k;
    }
  }
  return { ingredients: lines.slice(0, splitIndex), steps: lines.slice(splitIndex) };
}

interface Section {
  label: "ingredients" | "steps" | null;
  lines: string[];
}

/**
 * Prefill classifier for OCR output: the first line becomes the name, then
 * lines are split into ingredients and steps using printed section headers
 * where present and scored contiguous segmentation where not. The user
 * reviews and corrects the result before importing, so this only needs to be
 * a good starting point, not perfect.
 */
export function classifyOcrLines(text: string): ClassifiedRecipeText {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let name = "";
  const sections: Section[] = [{ label: null, lines: [] }];
  for (const line of lines) {
    const label = headerLabel(line);
    if (label) {
      sections.push({ label, lines: [] });
    } else if (!name && sections.length === 1 && sections[0].lines.length === 0) {
      name = line;
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }

  const ingredients: string[] = [];
  const steps: string[] = [];
  sections.forEach((section, index) => {
    if (section.lines.length === 0) return;
    const isLastSection = index === sections.length - 1;
    if (section.label === "steps") {
      steps.push(...section.lines);
    } else if (section.label === "ingredients" && !isLastSection) {
      ingredients.push(...section.lines);
    } else {
      // Headerless text, a preamble, or a trailing "Ingredienser" section
      // that may run straight into unlabeled instructions.
      const split = bestSplit(section.lines, section.label === "ingredients");
      ingredients.push(...split.ingredients);
      steps.push(...split.steps);
    }
  });

  return {
    name,
    ingredientsText: ingredients.join("\n"),
    stepsText: steps.join("\n"),
  };
}
