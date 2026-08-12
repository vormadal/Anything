# anything-frontend/src/lib

Shared utilities and the generated API client.

## Structure

- `apiClient.ts` — configures and exports the Kiota `apiClient` instance; also re-exports `ApiError` (use for catching HTTP errors with `err.responseStatusCode`)
- `api-client/` — **auto-generated** Kiota client from the backend OpenAPI spec; do not edit manually
  - Regenerate with `npm run generate:api` (API must be running); in practice the `update-api-client` workflow regenerates and commits it — see CLAUDE.md → CI Automation & Deployment
  - Import types from `@/lib/api-client/models/index`
- `../../public/tesseract/` + `public/tessdata/` — OCR assets for the scan-from-photo flow (tesseract.js): the worker/WASM cores in `public/tesseract/` are gitignored and copied from `node_modules` by `scripts/copy-tesseract-assets.mjs` via the `predev`/`prebuild` hooks; the gzipped `tessdata_fast` models in `public/tessdata/` are committed. If OCR fails with 404s on `/tesseract/*`, run `npm run copy:tesseract`.
- `foodPlanUtils.ts` — date/slot helpers for the food plan calendar
- `roles.ts` — household role constants (`HOUSEHOLD_ROLES`) and role-check helpers (`isAdmin`, `canManageHousehold`, `isHouseholdOwner`)
- `utils.ts` — generic helpers (class merging via `cn()`, etc.)
- `offline/` — offline-first read caching for the whole app, plus a write outbox scoped to shopping list / general checklist items only (see below)
- `notes/` — the note editor's Tiptap schema (`extensions.ts`), document (de)serialization (`noteDocument.ts`), and the client-side document importer behind `/notes/import` (`import/`, see below)

## Key Patterns

- Always import `apiClient` from `@/lib/apiClient` (the configured instance), not from `api-client/` directly.
- Use the fluent builder API: `apiClient.api.somethings.get()`, `.post(body)`, `.byId(id).put(body)`, `.byId(id).delete()`.
- Catch `ApiError` (re-exported from `apiClient.ts`) to handle HTTP error responses — inspect `err.responseStatusCode`.
- The base URL defaults to `http://localhost:5238` and is overridden by `NEXT_PUBLIC_API_URL` in production.
- Never cast API response types to `any`; use the generated model types from `api-client/models/index`.
- **Never use raw `fetch` or `apiFetch` for API calls** — use the configured `apiClient`. If the endpoint you need isn't in the generated client yet, do **not** reach for `apiFetch` as a stopgap: push the backend change (or open the PR) first so the `update-api-client` workflow regenerates and commits `api-client/**`, pull/rebase those changes, then implement the call against the regenerated `apiClient`. This holds even when the file you're editing already uses raw `fetch`/`apiFetch` — and when you touch such a file, migrate its legacy calls to `apiClient` as part of your change rather than copying the pattern.

## Note import (`notes/import/`)

Converting an exported document into a note happens **entirely in the browser** — the API only ever
sees the finished ProseMirror JSON (`POST /api/notes`) and any extracted images (`POST /api/notes/images`).
There is no server-side conversion to keep in sync.

Every format follows the same three stages:

1. **Parse** — `importFile.ts` looks the file's extension up in `PARSERS_BY_EXTENSION` and delegates.
   Each parser returns a `ParsedImport` (`types.ts`): `html`, a `title`, extracted `images` (each with a
   `placeholderId` standing in for its eventual `src`), user-facing `warnings`, and — for a file that
   couldn't be read at all — a `fatalError` **instead of** `html`, which the review UI renders as a
   disabled row. Parsers never throw; an unreadable file is a `fatalError`, not an exception.
2. **Upload** — `app/notes/import/page.tsx`'s `importOne` uploads each extracted image. Best-effort:
   a failed upload is swallowed and that one image is dropped from the note.
3. **Build** — `buildNoteDocument.ts` swaps each placeholder `src` for the uploaded URL (dropping any
   `<img>` whose upload failed) and runs the HTML through `generateJSON(html, noteExtensions)`.

**The `generateJSON` step is the safety net, and it is why parsers can emit slightly richer HTML than
the schema supports.** It runs the HTML through the *editor's own* extension list, so anything the
schema has no node or mark for is silently dropped — an imported note can never contain something the
editor can't reopen. The corollary: silence is the failure mode. If a construct is worth keeping, the
parser has to degrade it into a node the schema *does* have (see the task-item handling in
`markdown.ts`), because otherwise it vanishes with no warning.

**Tables are converted, not degraded.** The schema has `table`/`tableRow`/`tableHeader`/`tableCell`,
so both parsers emit real table markup. `markdown.ts` just lets `marked`'s GFM tables through
(cell alignment survives too — the cell node's `align` attribute parses `marked`'s `align="…"` as
well as a `text-align` style). `docx.ts`'s `convertTable` is the involved one:

- It walks **direct** `w:tr`/`w:tc` children, never `getElementsByTagName` — the latter reaches into
  a table nested in a cell and duplicates its cells (the bug the old flattening code had).
- Word writes a `w:tc` at *every* grid position, marking the continuations of a vertical merge with a
  `w:vMerge` carrying no `w:val` (only the starter has `w:val="restart"`). Continuations are dropped
  and counted onto the starter's `rowspan`, which is why cells are modelled first and serialised only
  once every row has been read. `w:gridSpan` maps straight to `colspan`.
- A row is a header when it declares `w:trPr > w:tblHeader`, or — since that attribute means "repeat
  across page breaks" and most real documents never set it — when its whole first row is bold.
- Neither parser emits `<thead>`: the schema has no node for it and ProseMirror descends through it
  anyway, so one `<tbody>` keeps this to a single code path. A bare-text or empty `<td>` needs no
  wrapping pass either; `tableCell`'s `block+` content makes the parser insert the paragraph.
- Cell content goes through the same `convertBlocks` the document body uses, so a list or heading
  inside a cell converts exactly as it would outside one.

Per-format notes:

| File | Parser | Behaviour |
|---|---|---|
| `.txt` | `plainText.ts` | One `<p>` per line, everything escaped. |
| `.md` / `.markdown` | `markdown.ts` | `marked` → HTML, then a `DOMParser` pass that degrades what the schema lacks. GFM tables pass through untouched. |
| `.docx` | `docx.ts` (+ `docxRuns.ts`, `docxNumbering.ts`) | Unzipped with `fflate`; OOXML matched by literal `w:`-prefixed names rather than registered namespaces, since that's how `DOMParser` preserves them. |

Adding a fourth format is: a new `parse<Format>File` returning `ParsedImport`, one entry in
`PARSERS_BY_EXTENSION`, the `accept` list and dropzone sub-label on the import page, and the
`fatalError` copy (asserted verbatim in `importFile.test.ts` and `app/notes/import/page.test.tsx`).
The `LARGE_NOTE_HTML_LENGTH` guard is applied centrally by the dispatcher, so a new parser gets it free.

Gotchas that cost time:

- **An ESM-only parsing dependency needs `transpilePackages` in `next.config.ts`, not a
  `transformIgnorePatterns` override.** `marked` ships ESM only and fails Jest with
  `SyntaxError: Unexpected token 'export'` otherwise; `npm run build` passes either way, so only the
  Jest run catches it. Full explanation in CLAUDE.md → CI Automation & Deployment.
- **Markdown embeds no image bytes.** `markdown.ts` returns `images: []` always — an absolute
  `http(s)` source is kept pointing at its original URL (`storageKey` stays null, which `NoteImage`
  allows), and a path relative to the exported file is dropped with a warning, since this app never
  received the file it names. Only `.docx` actually extracts blobs to upload.
- **Custom image attributes must be `data-*` and already lowercase.** `generateJSON` round-trips
  through `DOMParser(..., "text/html")`, which lowercases attribute names — hence `data-storage-key`
  rather than `storageKey` (see the comment in `notes/extensions.ts`).
- **Word list nesting is flattened on purpose** (`w:ilvl` ignored) — but markdown nesting is *not*,
  because `marked` emits real nested `<ul>`/`<ol>` and Tiptap's `listItem` content (`paragraph block*`)
  accepts them. Don't "fix" the asymmetry.
- **Tests build their fixtures in-process** — `new File([...], "name.md")` for text formats, and
  `docx.test.ts`'s `buildDocxFile()` helper over `fflate`'s `zipSync` for Word. There are no binary
  fixture files in the repo; keep it that way.

## Offline support (`offline/`)

Two separate layers with different scopes — don't conflate them:

- **Reads**: `persister.ts` persists the *entire* React Query cache to IndexedDB via `@tanstack/query-persist-client-core`/`@tanstack/react-query-persist-client`, denylisted by `shouldPersistQuery` to exclude only `auth`-prefixed query keys (`auth.user` reads straight from `localStorage` already; invite tokens are time-sensitive). This is what lets a cold, offline app open still render the last-loaded household/recipes/food-plan/bills/etc. instead of a blank screen (issue #622) — new query keys are persisted automatically, no opt-in needed. `QueryProvider` wires this up via `PersistQueryClientProvider`, and `AuthGuard` holds its loading state on `useIsRestoring()` so children never mount before the persisted cache has rehydrated.
- **Writes**: the mutation outbox remains scoped intentionally to shopping list / general checklist items (`useAddShoppingListItem`/`useUpdateShoppingListItem`/`useRemoveShoppingListItem` in `hooks/useShoppingLists.ts`) — no other entity queues writes for offline replay. Every other write action in the app is disabled while offline via `useOnlineStatus()` (`disabled={!isOnline}` + a `title` tooltip) instead, following the pattern in `components/CreateListDialog.tsx`/`app/HomeCards.tsx`.

- `outbox.ts` — the mutation queue. Persisted via `idb-keyval`, mirrored in an in-memory array (so reads are synchronous for `useSyncExternalStore`). Client-created items get a **negative integer id** (`createTempItemId()`/`isTempItemId()`) instead of a string tempId — this keeps every existing `itemId: number` signature (hooks, view components, dnd-kit `useSortable`) unchanged, since real server ids are always positive. `enqueueDelete` cancels a still-queued `add` for the same temp id instead of queuing a pointless create-then-delete round trip.
- `outboxStore.ts` — `usePendingItemIds(listId)` reactive read layer for "pending sync" UI indicators.
- `persister.ts` — see "Reads" above.
- `replay.ts` — `replayOutbox(queryClient)` replays queued mutations grouped by list, strictly FIFO **within** a list (re-reading the live queue each iteration, not a snapshot, so a reconciled temp id is visible to the very next mutation) so an `add` always resolves to a real id before a same-list `update`/`delete` referencing it. A 404 on `update` (item deleted server-side while queued) drops that one mutation with a toast; other failures increment a retry counter and stop that list's remaining queue (preserving order) until the next replay trigger; a 401 aborts without dequeuing anything.
- `networkError.ts` — `isNetworkError()`: a fetch-level failure (offline, DNS, etc.) always rejects with a `TypeError` per spec, distinct from Kiota's `ApiError` (only constructed from an actual HTTP response) — mutations use this to fall back to the outbox even when `navigator.onLine` was (incorrectly) still `true`.
- Jest cannot see real IndexedDB (jsdom has none) — `anything-frontend/__mocks__/idb-keyval.ts` is a root-level automatic manual mock (Jest applies it to every test file with no per-file `jest.mock()` needed) backed by a plain in-memory `Map`. Tests that need isolated/resettable storage add their own local `jest.mock("idb-keyval", ...)`, which takes precedence.
- Reorder (drag-and-drop) is deliberately **not** offline-capable anywhere in the app — it's disabled in the UI via `useOnlineStatus()` when offline, to avoid the ordering complexity of a reorder mutation referencing not-yet-synced temp ids (shopping lists) or simply because no non-shopping-list write is queueable offline at all.
