# anything-frontend/src/app

Next.js 15 App Router pages. Each subfolder maps 1:1 to a URL segment.

## Structure

- `layout.tsx` / `page.tsx` — root layout (providers, nav shell) and home page
- `error.tsx`, `global-error.tsx`, `not-found.tsx` — error boundary pages
- `globals.css` — Tailwind base styles
- Feature route folders (each typically has `page.tsx` + optionally `page.test.tsx` and page-local components):
  - `bills/`, `food-plans/`, `households/`, `lists/`, `recipes/`, `shopping-lists/`
  - `admin/` — invite management, recipe tags, suggestion categories
  - `login/`, `register/`, `profile/` — auth and user pages
- Dynamic segments use `[id]/` subfolders with `page.tsx` (detail) and `[id]/edit/page.tsx` (edit form)

## Key Patterns

- Pages are **server components by default** — mark client-only logic in dedicated child components with `"use client"`.
- Heavy page-specific UI (e.g., `ShoppingListView.tsx`, `ShoppingListEditMode.tsx`) lives alongside the route's `page.tsx`, not in `components/`.
- Use `AuthGuard` (from `components/`) to wrap protected pages.
- **Don't add redirect shims for moved/removed routes.** When a page/route is relocated or removed, delete the old route and update the in-app links (`ConfigCard` hrefs, `router.push`/`<Link>` targets) to the new location — do not leave a redirect stub. Deep-link sub-views with query params on the surviving route (e.g. the consolidated Suggestions admin uses `?tab=categories`/`?tab=import-export`), not separate routes.
- New pages or distinct page states must be covered by a Playwright visual snapshot, and use `page.goto()` for test-setup navigation — see `.claude/rules/e2e.md` for the authoritative visual-snapshot and navigation rules (and do **not** run `test:e2e:visual:update` in a web session; the `update-visual-snapshots` workflow generates the baselines).
