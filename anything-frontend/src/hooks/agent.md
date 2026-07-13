# anything-frontend/src/hooks

React Query hooks for all API interactions. One file per feature domain.

## Structure

- `use{Feature}.ts` — query + mutation hooks (e.g., `useBills.ts`, `useRecipes.ts`, `useShoppingLists.ts`)
  - Domains: Auth, Bills, FoodPlans, Households, Locations, Recipes, Recommendations, ShoppingLists, SuggestionCategories, Vendors
- Dialog-state hooks: `useAddToFoodPlanDialog.ts`, `useEditListNameDialog.ts`
- Utility hooks: `useSmartBack.ts` (history-aware back navigation), `useRealtimeSync.ts` (SSE subscription)
- Offline hooks: `useOnlineStatus.ts` (`navigator.onLine` via `useSyncExternalStore`, plus a non-hook `isOffline()` for use inside `mutationFn`), `useOfflineSync.ts` (mounted once from `AppLayout`; replays the outbox on `online`/focus/visibilitychange — see `src/lib/agent.md`'s "Offline support" section for the full picture)
- Most hooks have a paired `.test.tsx` file

## Key Patterns

- All hook files are marked `"use client"` — they cannot be imported in server components.
- Use `apiClient` from `@/lib/apiClient` for all API calls — never raw `fetch`.
- Mutations call `queryClient.invalidateQueries(...)` on success to keep the cache fresh.
- Exception: the three shopping-list-item mutations in `useShoppingLists.ts` (`useAddShoppingListItem`/`useUpdateShoppingListItem`/`useRemoveShoppingListItem`) only invalidate when the mutation actually reached the server — see `src/lib/agent.md`'s "Offline support" section.
- Query keys follow the pattern `[entityName]` or `[entityName, id]` for consistent invalidation.
- Tests that involve polling/intervals must use `jest.useFakeTimers()` / `jest.useRealTimers()` to prevent CI hangs.
- Use `renderWithClient` from `@/__tests__/utils/test-utils` for rendering hooks/components in tests.
- **Importing Kiota runtime helpers (e.g. `DateOnly` from `@microsoft/kiota-abstractions`) directly in a hook:** the package ships ESM, which Jest (via `next/jest`) only transforms for packages listed in `transpilePackages` in `next.config.ts`. `@microsoft/kiota-abstractions` is already listed there; add other `@microsoft/kiota-*` packages if you import their runtime values un-mocked. Without this, tests fail with `SyntaxError: Unexpected token 'export'`. (Tests that `jest.mock('@/lib/apiClient')` don't hit this, because the generated client — the usual kiota importer — is never loaded.)
