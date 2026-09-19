# anything-frontend/src/app

Next.js 15 App Router pages. Each subfolder maps 1:1 to a URL segment.

## Structure

- `layout.tsx` / `page.tsx` — root layout (providers, nav shell) and home page
- `error.tsx`, `global-error.tsx`, `not-found.tsx` — error boundary pages
- `globals.css` — Tailwind base styles
- Feature route folders (each typically has `page.tsx` + optionally `page.test.tsx` and page-local components):
  - `bills/`, `food-plans/`, `households/`, `inventory/`, `lists/`, `notes/`, `notifications/`, `recipes/`, `shopping-lists/`
  - `admin/` — invite management, recipe tags, suggestion categories
  - `login/`, `register/`, `profile/` — auth and user pages
- Dynamic segments use `[id]/` subfolders with `page.tsx` (detail). Prefer an in-place edit mode toggled by a `?edit=true` query param on the same route (see `lists/[id]/page.tsx`, `recipes/[id]/page.tsx`) over a separate `[id]/edit/page.tsx`; `bills/[id]/edit/page.tsx` is a legacy exception for a single-entity form, not a list-item, and is not the pattern to copy for new dynamic routes.

## Key Patterns

- Pages are **server components by default** — mark client-only logic in dedicated child components with `"use client"`.
- Heavy page-specific UI (e.g., `ShoppingListView.tsx`, `ShoppingListEditMode.tsx`) lives alongside the route's `page.tsx`, not in `components/`.
- Use `AuthGuard` (from `components/`) to wrap protected pages.
- **`inventory/` is the Storage section** (nav label "Storage", API prefix `inventory-*`): `/inventory` (places + a client-side search over every item), `/inventory/places/[id]`, `/inventory/boxes/[id]`, `/inventory/items/[id]`. Detail pages set the title through `PageTitle` and deliberately have **no in-page `<h1>`** — the app header already renders one, and a second trips Playwright's strict mode. Shared pieces live in `components/inventory/`, pure helpers in `lib/inventory.ts`.
- **Don't add redirect shims for moved/removed routes.** When a page/route is relocated or removed, delete the old route and update the in-app links (`ConfigCard` hrefs, `router.push`/`<Link>` targets) to the new location — do not leave a redirect stub. Deep-link sub-views with query params on the surviving route (e.g. the consolidated Suggestions admin uses `?tab=categories`/`?tab=import-export`), not separate routes.
- **A page wrapper needs `w-full` alongside `mx-auto`.** `AppLayout` renders
  `<main className="flex grow flex-col">`, so a page's outermost element is a
  flex item: an auto margin on the cross axis cancels the default `stretch`,
  and the page sizes itself to its *content* instead — `max-w-*` then only caps
  a width it never reaches. `/recipes/[id]` sat at ~490 px in a 1280 px window
  for exactly this reason. Pages that open with `container mx-auto ...` are
  unaffected (`container` sets `width: 100%`); a bare `max-w-Nxl mx-auto` is
  not. Nothing catches it — build, lint and the phone-viewport visual suite all
  stay green, since at phone width the content usually fills the viewport
  anyway.
- **The visual suite is phone-only (Pixel 5), so a `lg:` layout is uncovered by
  default.** A desktop-only change needs its own describe with
  `test.use({ viewport: { width: 1280, height: 1000 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 })`
  — see "Recipe Detail (desktop)" in `e2e/visual.spec.ts`.
- New pages or distinct page states must be covered by a Playwright visual snapshot, and use `page.goto()` for test-setup navigation — see `.claude/rules/e2e.md` for the authoritative visual-snapshot and navigation rules (and do **not** run `test:e2e:visual:update` in a web session; the `update-visual-snapshots` workflow generates the baselines).

## Notifications routes

`notifications/page.tsx` is the inbox and `notifications/settings/page.tsx` the
per-category opt-outs. Three things that are deliberate:

- **The header bell is a `Link`, not a popover.** `NotificationBell` lives in
  `AppLayout`'s header on every authenticated page and just navigates here. On a
  phone a dropdown of notifications is worse than the page it would link to, and
  keeping a global-header control out of Radix's dismissable-layer machinery
  avoids the class of bug CLAUDE.md's Radix gotcha describes.
- **Sending is manager-only, and the UI mirrors the server rather than guarding
  it.** The megaphone action appears only when
  `canManageHousehold(currentHouseholdRole)`; `POST /api/notifications` is
  `RequireHouseholdManager()` regardless, so the check is UX, not the gate.
- **`linkUrl` is followed with `router.push` without sanitising.** That is safe
  only because no request contract accepts a link — every `LinkUrl` is an
  app-relative literal built by a backend handler (see
  `src/Anything.Application/agent.md`). If a future endpoint ever takes a
  caller-supplied link, this becomes an open-redirect and needs a guard.
