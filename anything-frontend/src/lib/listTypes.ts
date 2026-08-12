/**
 * `ListType` on the backend (`Anything.Core/Entities/ListType.cs`) crosses the
 * wire as a plain int, so the two values are named here rather than repeated as
 * bare `0`/`1` literals at every call site.
 */
export const GENERAL_LIST_TYPE = 0;
export const SHOPPING_LIST_TYPE = 1;

/** Shopping lists carry amounts, units and suggestions; General ones don't. */
export function isShoppingList(type: number | null | undefined): boolean {
  return type === SHOPPING_LIST_TYPE;
}
