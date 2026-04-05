import { HOUSEHOLD_ID_KEY, HOUSEHOLD_HEADER } from "@/lib/apiClient";

/**
 * Returns an object containing the X-Household-Id header if a household ID is
 * stored in localStorage, or an empty object otherwise.  Spread this into the
 * `headers` of any direct `fetch()` call that needs to reach a household-aware
 * API endpoint.
 */
export function getHouseholdHeader(): Record<string, string> {
  if (typeof window !== "undefined") {
    const id = localStorage.getItem(HOUSEHOLD_ID_KEY);
    if (id !== null) return { [HOUSEHOLD_HEADER]: id };
  }
  return {};
}
