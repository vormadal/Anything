# anything-frontend/src/components

Reusable UI components shared across multiple pages.

## Structure

- Root level — feature-specific shared components:
  - Dialogs: `AddToFoodPlanDialog`, `CompleteListDialog`, `CreateLocationDialog`, `CreateVendorDialog`, `EditListNameDialog`
  - `suggestions/` — tab bodies for the consolidated Suggestions admin page (`SuggestionsTab`, `CategoriesTab`, `ImportExportTab`)
  - `inventory/` — pieces shared by the four Storage routes: `PlaceFormDialog`, `BoxFormDialog`, `ItemFormDialog` (create and edit in one component, keyed off whether an entity is passed; item metadata sits behind an "Add more details" toggle, collapsed by default), `ConfirmDeleteDialog`, `DetailActionsMenu`, `InventorySelect`, `InventoryRow`/`InventoryList`, `WarrantyBadge` (renders `describeWarranty` from `@/lib/inventory`), `CustomFieldsEditor` (item-only; wholesale replace via `useUpdateInventoryItemFields`), the photo/document components below, and `inventoryFormStyles.ts` for the repeated Tailwind field classes
  - Layout/nav: `AppLayout`, `PageTitle`
  - Feature UI: `CookingModeDrawer`, `ListItemsStatus`, `RecipeImageUpload`, `BillRecurrenceFields` (Recurring/One-time + Payment/Date toggles, shared by `bills/new` and `bills/[id]/edit` so the two forms can't drift out of sync with the backend's recurrence invariant), `BillEntryForm` (the "quick add" amount+date+notes form shared by the price-history and amount-entries sections of `bills/[id]`)
  - Auth: `AuthGuard`
  - Error: `ErrorBoundary`
  - PWA: `ServiceWorkerRegistration`, `OfflineBanner` (shown app-wide via `useOnlineStatus()`; the underlying offline read/write support is scoped to shopping list / general checklist items only — see `src/lib/agent.md`)
- `ui/` — Shadcn UI primitives (`button`, `dialog`, `dropdown-menu`, `sheet`, `combobox-field`, `count-badge`, `sonner`, etc.)
  - Add new Shadcn components manually by copying from the Shadcn docs into this folder

## Key Patterns

- Components that use hooks or browser APIs must have `"use client"` at the top.
- Shadcn components in `ui/` are owned by this project — modify them freely (they are not a dependency).
- Dialogs manage their own open/close state via a companion hook in `src/hooks/` (e.g., `useEditListNameDialog`).
- **Don't let a dropdown auto-open over content it doesn't own.** A `position: absolute` suggestions list is fine while the user is actively typing (it overlays the space below the input without shifting layout), but breaks when the dropdown can auto-open on mount and stay open indefinitely (e.g. the food-plan day dialog's `showSuggestionsOnOpen` for empty upcoming days, where the input never blurs) — the floating box then covers unrelated controls further down and permanently intercepts their clicks. Render such an auto-openable list in normal document flow (no `absolute`/`z-10`) so it pushes later content down instead of covering it.
- Page-specific components (used by only one route) live next to the route's `page.tsx`, not here.
- `button.test.tsx` is an example of a unit test for a UI primitive — follow that pattern when adding new ui/ components.
- New components with distinct visual states (dialogs, multi-step flows) must be covered by a Playwright visual snapshot — see `.claude/rules/e2e.md` for the authoritative rule.

## Inventory photos (`inventory/`)

Attachments split across four components. All four are presentational — each detail page owns the attachment hooks (list/upload/download/delete) for *its* entity and passes the results down, so no component knows whether it's attached to an item, a box or a place.

- `InventoryPhotoGallery` — the hero at the top of every item/box/place page. Swipes between photos in place, opens `InventoryPhotoViewer` on tap, and carries the `AddPhotoMenu` overlay (or a dashed empty-state placeholder when there are no photos yet).
- `InventoryPhotoViewer` — fullscreen lightbox: swipe, arrow keys, prev/next buttons (`sm:` and up only — phones swipe), delete the photo on screen, and close itself when the last one goes. Mount it **keyed by the tapped index** and only while open; that's what resets the strip without syncing state back through an effect (`react-hooks/set-state-in-effect` is an error here, not a warning).
- `PhotoStrip` / `PhotoIndicators` — the shared scroll-snap mechanics behind both. CSS `snap-x snap-mandatory` on an `overflow-x-auto` flex row gives touch swipe, trackpad and scrollbar behaviour with **no carousel dependency**; the active index comes from `Math.round(scrollLeft / clientWidth)` in an `onScroll` handler. Guard `clientWidth === 0` and a missing `scrollTo` — jsdom has neither.
- `InventoryDocuments` — manuals/receipts/warranty docs only (everything whose `kind` isn't `Photo`), with the kind-picker dialog on upload.
- `AddPhotoMenu` — dropdown with **Take photo** and **Choose from library**, backed by two hidden inputs. They have to be two: `capture="environment"` forces the camera and cannot be combined with `multiple`, so only the library picker is multi-select. Library files upload sequentially, one request each.

Two things worth knowing when touching these:

- **Photos render `url`, not `thumbnailUrl`.** The API returns both (`InventoryAttachmentMapping`): a 300×300 `fill` thumbnail and a 1920×1080 `fit` render. The old banner stretched the 300px one across the full page width; the gallery uses `url`. `thumbnailUrl` is for the 40×40 slot in `InventoryRow`, fed by the list endpoints' own `thumbnailUrl` field rather than a per-row attachments call.
- **Tapping a slide scrolls the hero too.** The slide is a `<button>`, so clicking it natively scrolls it into view and the hero's index follows the viewer's. Harmless, but it means a Playwright assertion on the counter or dots must be scoped to `getByRole("dialog")` or it hits two elements.

## Rich text (`notes/`)

The note editor is Tiptap (ProseMirror). `NoteWorkspace` is the whole note screen — both `/notes/new` and `/notes/[id]` render it — and it has no Save or Cancel button: the title sits in the app header, everything below the header is the editor, and `useNoteAutosave` (see `src/hooks/agent.md`) persists as the user writes. Rules that keep it manageable:

- **One schema, two modes.** `NoteEditor` (editable) and `NoteContentView` (read-only, used when offline) both build from `noteExtensions` in `@/lib/notes/extensions`. Never hand-render the stored JSON — registering a node in that array is what makes it render in both modes, and it is the extension point for referencing other entities — `ListEmbed` (`@/lib/notes/listEmbed`) is the built example, and a future `entityReference` node linking to a recipe would follow the same shape (inline, atomic, `attrs: { entityType, entityId, label }`, no text child — the shape the backend's `NoteContent.ExtractPlainText` already flattens into the search index). Because one array serves both modes, **a node view must tolerate `editor.isEditable === false`**: `EmbeddedListNodeView` keys its interactivity off exactly that.
- **Always load the editor via `next/dynamic` with `ssr: false`.** ProseMirror constructs against the DOM, so a server render throws; `useEditor` also needs `immediatelyRender: false` under the App Router or the first client render mismatches. Lazy loading additionally keeps ~200 KB off the notes list and home card, which render server-provided plain-text snippets and never need the editor.
- **`NoteEditor` reads `value` once, on mount.** A background refetch (autosave invalidates `["note", id]` on every save) must not clobber in-flight edits, so the detail page keys the workspace on the note id to load a different note.
- **The toolbar must read editor state through `useEditorState`, never during render.** `useEditor` defaults `shouldRerenderOnTransaction` to `false` in Tiptap v3, and moving the caret changes no React state — so `editor.isActive(...)` read straight in the render body goes stale the moment the selection moves without an edit. That is invisible for `aria-pressed` but fatal for `NoteEditorToolbar`'s second row, which appears only while the caret is inside a table. `useEditorState` subscribes to the editor's `transaction`/`update` events and deep-compares its selector result, so it re-renders when a flag actually flips rather than on every keystroke. It also means a stubbed `Editor` in Jest needs `on`/`off` methods or the toolbar throws on render.
- **Table controls are a sibling `role="toolbar"`, not a nested one.** Nesting one `toolbar` role inside another is invalid ARIA, and keeping them siblings leaves the existing `getByRole("toolbar", { name: "Formatting" })` locators working. The row is gated on `isActive("table")`; the sticky bar grows by a row when the caret enters a table, which is accepted rather than reserved for, since an always-present empty band would sit above every note.
- **Column resizing is off, and that is what gives tables their scroll wrapper.** Tiptap's `Table` installs its own `TableView` node view (a `div.tableWrapper`) for exactly the *non*-resizable case — in the read-only renderer too — so `NOTE_PROSE_CLASSES` scrolls a too-wide table on `.tableWrapper`. Don't reach for prosemirror-tables' own `TableView`: that one is only constructed by the `columnResizing` plugin, which is never registered here. The editor surface also needs `min-w-0` (flex items default to `min-width: auto`, which would let a wide table stretch the column instead of scrolling inside it).
- **An embedded entity's state belongs in the API, not the document.** `listEmbed` stores only `{ listId, label }` and reads the live list through the ordinary React Query hooks, which is what keeps ticking an item off from producing a ProseMirror transaction — mirroring item state into `ContentJson` would dirty the note on every tap and fight `useNoteAutosave`. Never refresh `label` via `updateAttributes` for the same reason; it is a snapshot, and the fallback when the list has been deleted. The card itself (`EmbeddedListCard`) takes plain props and no Tiptap types, so it is testable without an editor — `EmbeddedListNodeView` is the thin adapter.
- **Toggling a list item is a full PUT.** `UpdateShoppingListItemRequest` carries `Name`/`IsChecked`/`Amount`/`Unit`, so a toggle that omits amount/unit silently wipes a shopping item's quantity. `GeneralChecklistView` gets away with passing nulls because General lists have none; anything that can show a Shopping list (the note embed) must forward the real values. `ChecklistItemRow` is the shared row both use.
- **Printing goes through the live DOM, never a serialised copy.** The Print item in `NoteWorkspace`'s ⋮ menu just calls `window.print()`; the printed layout is the `@media print` block in `globals.css`, hooked on `.note-print-root` (the workspace root) and `.note-prose` (the marker class at the front of `NOTE_PROSE_CLASSES`). `generateHTML(doc, noteExtensions)` is **not** an alternative: `ListEmbed.renderHTML` emits an empty `div`, so a serialised note prints embedded lists as blank boxes — the rendered DOM is the only place they have contents. Three things that are easy to get wrong here:
  - **Dark mode is scoped to `screen` on purpose.** `prefers-color-scheme: dark` keeps matching while a page is printing, so both channels that carry dark styling — the `@custom-variant dark` override at the top of `globals.css` and the `:root` variable block below it — carry the `screen` media type to keep it off paper. A printout is always the light palette, so it looks the same whatever the device is set to. Anyone adding a third dark-mode channel must do the same; `note detail - print layout is light even in dark mode` in `e2e/visual.spec.ts` is the regression test, and it compares print-in-dark against print-in-light rather than pinning colour literals (`text-gray-900` serialises as `lab(...)`).
  - **No `!important` is needed.** Tailwind emits utilities inside `@layer utilities`, and unlayered rules outrank every layered one regardless of specificity. Inheritance is the exception — a `text-sm` on the element itself still beats an inherited size — which is why the print type rules use two-class selectors through `.note-prose`, and why sizes are in `pt` (defined against the page, so a phone and a laptop print alike).
  - **Don't rely on a background to carry meaning.** Whether background colours print at all depends on the browser and the user's "Background graphics" setting, so the print block explicitly clears the three that mattered (`th`, `pre`, the embed card header) and lets borders and weight do the work instead. `print-color-adjust: exact` would fix it the other way and flood the page with ink.
- **Mock the editor in Jest.** jsdom lacks the layout APIs ProseMirror calls (`Range.getClientRects` and friends), so component tests `jest.mock("./NoteEditor")` and replace it with a button that fires `onChange` with a staged document — see `NoteWorkspace.test.tsx`. Editor behaviour itself is covered by the Playwright visual specs. Note that unmounting flushes a pending autosave, so such a suite must `jest.clearAllMocks()` in `beforeEach`, not `afterEach` — the previous test's teardown lands a save while `afterEach` is still running.

### Full-height pages

`AppLayout` is a flex column (`min-h-screen`) whose `<main>` is `flex flex-1 flex-col`, so a page that should fill the viewport uses `flex-1` rather than a `calc(100dvh - …)` guess. Don't reintroduce the guess: the header is **57px**, not the 56px its `h-14` suggests, because of its bottom border — subtracting `3.5rem` leaves the page 1px scrollable.

## Toast usage rules (sonner)

A toast's only job is to communicate an outcome the user **cannot otherwise see on screen**. Mutations run through React Query with invalidation/optimistic updates, so after an add/edit/remove the changed row is already visible — a success toast there just repeats the screen. Before adding `toast.success(...)`, apply the decision test:

> *After this action, does the screen already show the outcome — an inline row/value update, a dialog/sheet closing, or navigation to a page that reflects it?* **Yes → no success toast. No → toast.**

**Show a toast — three cases only:**
- **Errors / failures** that aren't otherwise visible (network error, rejected mutation, offline-sync failure). Keep essentially every `toast.error` on an async operation. (Exception: pre-submit *validation* — see below.)
- **Out-of-band success** — the result lands somewhere the user isn't looking, or the current screen can't reflect it: copied to clipboard; applied to a different surface ("Ingredients added to shopping list", "Added to food plan"); share links; import/export and other file/background jobs; a destination screen that doesn't reflect the action (register → login). An explicit whole-form **Save** with no visible delta (profile name/password, food-plan settings) also counts — the field already held the value, so the toast is the only confirmation.
- **Destructive / terminal confirmation** — an action that removes a whole entity or ends a flow and navigates away: "Recipe deleted", "List deleted", "Bill deleted", "List closed", "Shopping list completed!", "Household deleted". A delete of a **row in a list you're still viewing** does NOT qualify (the row vanishing is the feedback) — no toast.

**Never toast:**
- **Visible inline result** — an add/edit/remove whose row or value updates in the current view.
- **Screen already changes** — a dialog closes on success, or navigation lands on a page showing the result.
- **Form validation** — use an inline field error message (`<p role="alert" className="text-sm text-red-600 dark:text-red-400">`) and keep native `required`, never a toast. Auth pages (login, register) surface *all* errors inline, including the async auth failure; in-app forms keep validation inline but may toast the async outcome.
