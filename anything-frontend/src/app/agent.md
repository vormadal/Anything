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
- After any UI change run `npm run test:e2e:visual:update` to regenerate Playwright baseline screenshots, then commit the updated PNGs.
- New pages or distinct page states must be covered in `e2e/visual.spec.ts` using `toHaveScreenshot()`. Do NOT use Jest `.toMatchSnapshot()` for visual assertions.
- Use `page.goto()` for test setup navigation; reserve UI-click navigation only when testing the nav element itself.
