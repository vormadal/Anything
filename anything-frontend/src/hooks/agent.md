# anything-frontend/src/hooks

React Query hooks for all API interactions. One file per feature domain.

## Structure

- `use{Feature}.ts` — query + mutation hooks (e.g., `useBills.ts`, `useRecipes.ts`, `useShoppingLists.ts`)
  - Domains: Auth, Bills, FoodPlans, Households, Inventory, Locations, Recipes, Recommendations, ShoppingLists, SuggestionCategories, Vendors
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
- `useRecommendations.ts` is list-scoped: `useRecommendationSearch(query, shoppingListId?)` and `useAllRecommendations({ shoppingListId?, sharedOnly?, uncategorized?, includeInSuggestions? })` pass the filters as query params, and `useDeleteRecommendationsForList()` clears one list's own suggestions. Pass no `shoppingListId` for the household-wide (recipe) autocomplete. (Backend scoping semantics live in `src/Anything.Application/agent.md`.)
- **Kiota multipart uploads must pass `ArrayBuffer`, not `File`.** Kiota's multipart serializer only supports `string`/`ArrayBuffer`/`Uint8Array` part content — `multipartBody.addOrReplacePart("file", type, file)` with a `File`/`Blob` throws "unsupported content type for multipart body" client-side before any request is made. Use `await file.arrayBuffer()` and pass the file name as the fifth argument (see `uploadRecipeImageFile` in `useRecipes.ts`).
- **Onboarding tour (`useOnboardingTour.ts`):** auto-opens once for any authenticated user with a household when `localStorage.tourSeenVersion` doesn't match `TOUR_VERSION` (`src/lib/tourSteps.ts`). When bumping `TOUR_VERSION`, also update the pre-set flag in both e2e auth fixtures — see `.claude/rules/e2e.md`.
- **Importing Kiota runtime helpers (e.g. `DateOnly` from `@microsoft/kiota-abstractions`) directly in a hook:** the package ships ESM, which Jest (via `next/jest`) only transforms for packages listed in `transpilePackages` in `next.config.ts`. `@microsoft/kiota-abstractions` is already listed there; add other `@microsoft/kiota-*` packages if you import their runtime values un-mocked. Without this, tests fail with `SyntaxError: Unexpected token 'export'`. (Tests that `jest.mock('@/lib/apiClient')` don't hit this, because the generated client — the usual kiota importer — is never loaded.)
- **`useNoteAutosave.ts` is the note editor's only save path — there is no Save button.** Three rules it encodes, each of which is easy to break by accident:
  - **The title is derived, not typed.** It is the note's first line capped at six words (`deriveNoteTitle`), and it keeps tracking the first line until the user renames the note. "Was it renamed?" is answered without a backend flag by comparing the loaded title against what the loaded body derives — so notes written before this feature (whose hand-typed titles won't match) correctly keep their titles.
  - **A new note is not created on the first keystroke.** It waits for `hasCompletedFirstLine` — text in the first block plus a block after it, i.e. the user pressed Enter — so opening the editor and backing out leaves nothing behind. Leaving the page with something written also creates it, rather than silently dropping the text.
  - **Saves are serialised and flushed on the way out.** One request at a time (a second edit mid-flight re-runs the save after), and the debounce is flushed from both the unmount cleanup and `pagehide`. If a create ever resolves without an id, autosave *stops* — otherwise every later keystroke would create another copy of the note.
- **`useInventory.ts` covers all three storage entities** (places/`inventoryStorageUnits`, `inventoryBoxes`, `inventoryItems`) in one file, because every page joins all three lists client-side to derive box and item counts — there are no per-parent endpoints. `useDeleteInventoryBox` also invalidates the item list: the server keeps a deleted box's items and only clears their `boxId`. Two backend behaviours the UI has to encode: `DELETE /api/inventory-storage-units/{id}` answers **409** while the place still holds boxes or items (it never orphans them), and `InventoryItem` carries `boxId` and `storageUnitId` independently with nothing keeping them in sync — `resolvePlacement` in `@/lib/inventory` derives the place from the box so a write can't persist a contradiction.
- **`useNotes(limit?)` keys on the limit** (`["notes", limit ?? null]`) because the home card asks for the top 5 while `/notes` asks for all — sharing one key would let the truncated list satisfy the full page. Mutations invalidate the `["notes"]` prefix, which covers both.
