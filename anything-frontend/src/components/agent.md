# anything-frontend/src/components

Reusable UI components shared across multiple pages.

## Structure

- Root level — feature-specific shared components:
  - Dialogs: `AddToFoodPlanDialog`, `CompleteListDialog`, `CreateLocationDialog`, `CreateVendorDialog`, `EditListNameDialog`
  - `suggestions/` — tab bodies for the consolidated Suggestions admin page (`SuggestionsTab`, `CategoriesTab`, `ImportExportTab`)
  - Layout/nav: `AppLayout`, `PageTitle`
  - Feature UI: `CookingModeDrawer`, `ListItemsStatus`, `RecipeImageUpload`
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
