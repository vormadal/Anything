# anything-frontend/src/lib

Shared utilities and the generated API client.

## Structure

- `apiClient.ts` — configures and exports the Kiota `apiClient` instance; also re-exports `ApiError` (use for catching HTTP errors with `err.responseStatusCode`)
- `api-client/` — **auto-generated** Kiota client from the backend OpenAPI spec; do not edit manually
  - Regenerate with `npm run generate:api` (API must be running)
  - Import types from `@/lib/api-client/models/index`
- `foodPlanUtils.ts` — date/slot helpers for the food plan calendar
- `householdUtils.ts` — household membership/role helpers
- `roles.ts` — role name constants (`HouseholdRoles`, `UserRoles`)
- `utils.ts` — generic helpers (class merging via `cn()`, etc.)
- `offline/` — offline-first support for shopping list / general checklist items only (see below); everything else in the app remains online-only

## Key Patterns

- Always import `apiClient` from `@/lib/apiClient` (the configured instance), not from `api-client/` directly.
- Use the fluent builder API: `apiClient.api.somethings.get()`, `.post(body)`, `.byId(id).put(body)`, `.byId(id).delete()`.
- Catch `ApiError` (re-exported from `apiClient.ts`) to handle HTTP error responses — inspect `err.responseStatusCode`.
- The base URL defaults to `http://localhost:5238` and is overridden by `NEXT_PUBLIC_API_URL` in production.
- Never cast API response types to `any`; use the generated model types from `api-client/models/index`.

## Offline support (`offline/`)

Scoped intentionally to shopping list / general checklist items (`useAddShoppingListItem`/`useUpdateShoppingListItem`/`useRemoveShoppingListItem` in `hooks/useShoppingLists.ts`) — no other entity is offline-capable.

- `outbox.ts` — the mutation queue. Persisted via `idb-keyval`, mirrored in an in-memory array (so reads are synchronous for `useSyncExternalStore`). Client-created items get a **negative integer id** (`createTempItemId()`/`isTempItemId()`) instead of a string tempId — this keeps every existing `itemId: number` signature (hooks, view components, dnd-kit `useSortable`) unchanged, since real server ids are always positive. `enqueueDelete` cancels a still-queued `add` for the same temp id instead of queuing a pointless create-then-delete round trip.
- `outboxStore.ts` — `usePendingItemIds(listId)` reactive read layer for "pending sync" UI indicators.
- `persister.ts` — persists the React Query cache to IndexedDB via `@tanstack/query-persist-client-core`, scoped by `shouldDehydrateQuery` to only `shoppingLists`/`shoppingList`/`shoppingListItems`/`shoppingListTemplates` query keys, so offline **reads** work for those entities only.
- `replay.ts` — `replayOutbox(queryClient)` replays queued mutations grouped by list, strictly FIFO **within** a list (re-reading the live queue each iteration, not a snapshot, so a reconciled temp id is visible to the very next mutation) so an `add` always resolves to a real id before a same-list `update`/`delete` referencing it. A 404 on `update` (item deleted server-side while queued) drops that one mutation with a toast; other failures increment a retry counter and stop that list's remaining queue (preserving order) until the next replay trigger; a 401 aborts without dequeuing anything.
- `networkError.ts` — `isNetworkError()`: a fetch-level failure (offline, DNS, etc.) always rejects with a `TypeError` per spec, distinct from Kiota's `ApiError` (only constructed from an actual HTTP response) — mutations use this to fall back to the outbox even when `navigator.onLine` was (incorrectly) still `true`.
- Jest cannot see real IndexedDB (jsdom has none) — `anything-frontend/__mocks__/idb-keyval.ts` is a root-level automatic manual mock (Jest applies it to every test file with no per-file `jest.mock()` needed) backed by a plain in-memory `Map`. Tests that need isolated/resettable storage add their own local `jest.mock("idb-keyval", ...)`, which takes precedence.
- Reorder (drag-and-drop) is deliberately **not** offline-capable — it's disabled in the UI via `useOnlineStatus()` when offline, to avoid the ordering complexity of a reorder mutation referencing not-yet-synced temp ids.
