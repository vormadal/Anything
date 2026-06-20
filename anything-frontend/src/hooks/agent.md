# anything-frontend/src/hooks

React Query hooks for all API interactions. One file per feature domain.

## Structure

- `use{Feature}.ts` — query + mutation hooks (e.g., `useBills.ts`, `useRecipes.ts`, `useShoppingLists.ts`)
  - Domains: Auth, Bills, FoodPlans, Households, Inventory (Boxes/Items/StorageUnits), Locations, Recipes, Recommendations, ShoppingLists, Somethings, SuggestionCategories, Vendors
- Dialog-state hooks: `useAddToFoodPlanDialog.ts`, `useEditListNameDialog.ts`
- Utility hooks: `useSmartBack.ts` (history-aware back navigation), `useRealtimeSync.ts` (SSE subscription)
- Most hooks have a paired `.test.tsx` file

## Key Patterns

- All hook files are marked `"use client"` — they cannot be imported in server components.
- Use `apiClient` from `@/lib/apiClient` for all API calls — never raw `fetch`.
- Mutations call `queryClient.invalidateQueries(...)` on success to keep the cache fresh.
- Query keys follow the pattern `[entityName]` or `[entityName, id]` for consistent invalidation.
- Tests that involve polling/intervals must use `jest.useFakeTimers()` / `jest.useRealTimers()` to prevent CI hangs.
- Use `renderWithClient` from `@/__tests__/utils/test-utils` for rendering hooks/components in tests.
