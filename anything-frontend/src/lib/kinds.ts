/**
 * One colour per kind of thing the app holds — the octopus theme's "arms".
 * The colours themselves are the `--kind-*` tokens in `globals.css` (light and
 * dark values there); this file only maps areas to the Tailwind utilities
 * generated from them.
 *
 * Class strings are written out in full on purpose: Tailwind finds utilities
 * by scanning source text, so a template like `text-kind-${kind}` would never
 * be generated.
 */
export type Kind = "lists" | "notes" | "food" | "bills" | "storage" | "renovation";

/** Icon/text colour for a kind. */
export const KIND_TEXT: Record<Kind, string> = {
  lists: "text-kind-lists",
  notes: "text-kind-notes",
  food: "text-kind-food",
  bills: "text-kind-bills",
  storage: "text-kind-storage",
  renovation: "text-kind-renovation",
};

/**
 * A coloured left edge for a bordered surface belonging to a kind. The `dark:`
 * repeat is needed because the surfaces also carry `dark:border-gray-*`, and
 * variant utilities are emitted after plain ones — without it, dark mode's
 * all-sides border colour would paint over the edge.
 */
export const KIND_EDGE: Record<Kind, string> = {
  lists: "border-l-4 border-l-kind-lists dark:border-l-kind-lists",
  notes: "border-l-4 border-l-kind-notes dark:border-l-kind-notes",
  food: "border-l-4 border-l-kind-food dark:border-l-kind-food",
  bills: "border-l-4 border-l-kind-bills dark:border-l-kind-bills",
  storage: "border-l-4 border-l-kind-storage dark:border-l-kind-storage",
  renovation: "border-l-4 border-l-kind-renovation dark:border-l-kind-renovation",
};

/** Which kind a top-level route belongs to, for the navigation drawer. */
export const ROUTE_KIND: Record<string, Kind> = {
  "/lists": "lists",
  "/notes": "notes",
  "/recipes": "food",
  "/food-plans": "food",
  "/bills": "bills",
  "/inventory": "storage",
  "/renovation": "renovation",
};

/**
 * Accents that aren't a "kind" but used to carry their own off-palette colour.
 * Auto/manual payment is not good-vs-bad, so it deliberately avoids the
 * green/amber status colours: brand violet for auto, neutral for manual.
 */
export const BILL_PAYMENT = {
  auto: {
    icon: "text-blue-600 dark:text-blue-400",
    chip: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  },
  manual: {
    icon: "text-gray-400 dark:text-gray-500",
    chip: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  },
} as const;

/** Selected segment / filter chip in the brand colour. */
export const SELECTED_SEGMENT = "bg-blue-600 text-white";

/** A bill category: tinted in the bills kind colour. */
export const BILL_CATEGORY_CHIP = "bg-kind-bills/15 text-gray-800 dark:text-gray-100";
export const BILL_CATEGORY_SELECTED = "bg-kind-bills text-gray-950";

/** Cooking mode belongs to recipes, so it takes the food kind colour. */
export const COOKING = {
  bar: "bg-ink text-ink-foreground border-l-4 border-l-kind-food",
  outline: "border-kind-food text-kind-food hover:bg-kind-food/10",
} as const;
