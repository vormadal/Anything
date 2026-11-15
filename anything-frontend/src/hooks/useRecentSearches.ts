"use client";

import { useSyncExternalStore } from "react";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
  subscribeRecentSearches,
} from "@/lib/recentSearches";

const EMPTY: readonly string[] = [];
const getServerSnapshot = () => EMPTY;

/** Device-local recent global searches, newest first. */
export function useRecentSearches() {
  const recent = useSyncExternalStore(subscribeRecentSearches, getRecentSearches, getServerSnapshot);
  return { recent, add: addRecentSearch, remove: removeRecentSearch, clear: clearRecentSearches };
}
