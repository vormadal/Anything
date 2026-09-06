/**
 * Sorts checked items most-recently-checked first, so undoing a misclick is a
 * tap on the top row instead of a hunt through the list.
 *
 * `modifiedOn` is touched on every item update, including a check/uncheck
 * toggle (`UpdateShoppingListItemCommand` on the backend), so ordering by it
 * survives a refetch or SSE sync — unlike ordering by local mutation
 * sequence, which a refetch would silently undo.
 *
 * `Array.prototype.sort` is stable, so items with no (or equal) `modifiedOn`
 * keep their existing relative order.
 */
export function sortMostRecentlyCheckedFirst<T extends { modifiedOn?: Date | null }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => (b.modifiedOn?.getTime() ?? 0) - (a.modifiedOn?.getTime() ?? 0)
  );
}

/** The most recent of a set of dates, or `null` if none are set. */
export function latestDate(dates: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const date of dates) {
    if (date && (!latest || date.getTime() > latest.getTime())) {
      latest = date;
    }
  }
  return latest;
}
