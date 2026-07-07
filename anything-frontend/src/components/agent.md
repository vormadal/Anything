# anything-frontend/src/components

Reusable UI components shared across multiple pages.

## Structure

- Root level — feature-specific shared components:
  - Dialogs: `AddToFoodPlanDialog`, `CompleteListDialog`, `CreateLocationDialog`, `CreateVendorDialog`, `EditListNameDialog`, `ExportSuggestionsDialog`
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
- Page-specific components (used by only one route) live next to the route's `page.tsx`, not here.
- `button.test.tsx` is an example of a unit test for a UI primitive — follow that pattern when adding new ui/ components.
- For visual regression: new components with distinct visual states (dialogs, multi-step flows) must be covered in `e2e/visual.spec.ts` using Playwright `toHaveScreenshot()`. Do NOT use Jest `.toMatchSnapshot()` for visual assertions.
