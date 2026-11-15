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
