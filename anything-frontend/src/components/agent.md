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
