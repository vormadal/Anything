/**
 * Shared Tailwind class strings for the inventory forms. Extracted so the four
 * dialogs don't each repeat the same long literal (SonarCloud flags duplicated
 * string literals).
 */
export const FIELD_LABEL_CLASS =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export const FIELD_INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export const OFFLINE_HINT = "This requires an internet connection";
