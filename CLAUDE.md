# CLAUDE.md

## Project Overview

**Anything** is a monorepo for creating flexible list-based items ("Somethings") — checklists, grocery lists, inventories, expense trackers, etc. It has a .NET 10 backend API and a Next.js 15 frontend.

**If `dotnet`, `ef`, `aspire` is not available**:
- Do NOT attempt workarounds (manual IL, csc, msbuild invocations, etc.)
- STOP and inform the user that the tool is missing and another approach is required

## Directory Documentation

Each major directory has an `agent.md` with structure notes and key patterns:

- [`src/Anything.API/agent.md`](src/Anything.API/agent.md)
- [`src/Anything.Application/agent.md`](src/Anything.Application/agent.md)
- [`src/Anything.Core/agent.md`](src/Anything.Core/agent.md)
- [`src/Anything.Database/agent.md`](src/Anything.Database/agent.md)
- [`src/Anything.Contracts/agent.md`](src/Anything.Contracts/agent.md)
- [`tests/Anything.API.IntegrationTests/agent.md`](tests/Anything.API.IntegrationTests/agent.md)
- [`tests/Anything.Application.UnitTests/agent.md`](tests/Anything.Application.UnitTests/agent.md)
- [`tests/Anything.ArchitectureTests/agent.md`](tests/Anything.ArchitectureTests/agent.md)
- [`anything-frontend/src/app/agent.md`](anything-frontend/src/app/agent.md)
- [`anything-frontend/src/components/agent.md`](anything-frontend/src/components/agent.md)
- [`anything-frontend/src/hooks/agent.md`](anything-frontend/src/hooks/agent.md)
- [`anything-frontend/src/lib/agent.md`](anything-frontend/src/lib/agent.md)

## Repository Structure

```
Anything/
├── src/                              # Backend (.NET)
│   ├── Anything.API/                 # Minimal API — thin endpoint dispatchers
│   ├── Anything.Application/         # Application layer — commands, queries, handlers, services
│   ├── Anything.Core/                # Domain layer — entities, interfaces (no dependencies)
│   ├── Anything.Contracts/           # API contracts — request/response DTOs with validation
│   ├── Anything.Database/            # Infrastructure — EF Core DbContext, repositories, migrations
│   ├── Anything.Mediator/            # Simple mediator pattern (IRequest, IRequestHandler, IMediator)
│   ├── Anything.AppHost/            # Aspire orchestrator (manages PostgreSQL)
│   └── Anything.ServiceDefaults/    # Shared service config (telemetry, health checks)
├── tests/
│   └── Anything.API.IntegrationTests/ # Integration tests (xUnit, Testcontainers, Kiota client)
├── anything-frontend/               # Frontend (Next.js)
│   └── src/
│       ├── app/                     # Next.js App Router pages and layouts
│       ├── components/ui/           # Shadcn UI components
│       ├── hooks/                   # React Query custom hooks (API calls)
│       ├── context/                 # React context providers (QueryProvider)
│       └── lib/                     # Utilities and generated API client
└── Anything.slnx                    # .NET solution file
```

## Tech Stack

**Backend:** .NET 10, Minimal API, Entity Framework Core, PostgreSQL, Aspire, Swashbuckle (Swagger), Scrutor (DI scanning)
**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn UI, React Query (TanStack), Kiota (API client generation)

## Common Commands

```bash
aspire run              # Run with Aspire (starts PostgreSQL, Anything.API and anything-frontend)
```
### Backend

```bash
dotnet build                                                                                # Build solution
dotnet test tests/Anything.API.IntegrationTests/Anything.API.IntegrationTests.csproj       # Run integration tests (requires Docker)
dotnet ef migrations add <Name> --project src/Anything.Database --startup-project src/Anything.API  # Create migration
dotnet ef database update --project src/Anything.Database --startup-project src/Anything.API        # Apply migrations
```

### Frontend

```bash
cd anything-frontend
npm install          # Install dependencies
npm run build        # Production build - always run after finishing work
npm run lint         # Run ESLint - always run after finishing work
npm run test         # Run tests - always run after finishing work
npm run test:coverage # Run tests with coverage report
npm run generate:api # Generate API client from Swagger (API must be running)
npm run test:e2e:visual          # Run visual regression tests
npm run test:e2e:visual:update   # Regenerate baseline screenshots after an intentional UI change
```

## Key Patterns & Conventions

### Backend

- **Clean architecture:** Domain (Core), Application, Infrastructure (Database), API layers with strict dependency rules.
- **Mediator pattern:** Endpoints dispatch to command/query handlers via `IMediator.Send()`. Each handler is a single class in `Features/<Area>/Commands/` or `Features/<Area>/Queries/`.
- **Thin endpoints:** Each entity gets its own static class in `Endpoints/` with a `Map*Endpoints()` extension method. Endpoints only extract request data and dispatch to the mediator.
- **Repository + Unit of Work:** All data access goes through `IRepository<T>` and `IUnitOfWork`. Complex queries use `repository.Query()` which returns `IQueryable<T>`.
- **Soft deletes:** Entities use a `DeletedOn` nullable DateTime field. All queries filter `WHERE DeletedOn == null`.
- **Timestamps:** Entities use `CreatedOn` (set on creation), `ModifiedOn` (set on update), `DeletedOn` (set on soft delete). All use `DateTime.UtcNow`.
- **Request/response records:** Use C# `record` types for request DTOs in `Anything.Contracts`, organized by feature area.
- **Route grouping:** Endpoints use `MapGroup("/api/<entity>")` for consistent prefixing.
- **Validation:** Data annotations on DTOs in Contracts. `WithParameterValidation()` from MinimalApis.Extensions.
- **DI registration:** `builder.AddDatabase()` + `builder.Services.AddRepositories()` + `builder.Services.AddApplication(configuration)` in Program.cs.
- **Entity configurations:** Each entity has a separate `IEntityTypeConfiguration<T>` class in `Anything.Database/Configurations/`.
- **Handler return types:** Handlers that return entities use the entity type directly (endpoint wraps in `Results.Created()`). Handlers that need HTTP semantics (update, delete, validation) return `IResult`.

### Frontend

- **Path alias:** `@/*` maps to `./src/*` in imports.
- **API client:** Use `apiClient` from `@/lib/apiClient` for all API calls. It is a Kiota-generated typed client backed by `DefaultRequestAdapter` with `BaseBearerTokenAuthenticationProvider` — it automatically handles the base URL (`NEXT_PUBLIC_API_URL`, defaults to `http://localhost:5238`), `Content-Type: application/json`, and `Authorization: Bearer <token>` headers. All types (request/response models) come from the Kiota-generated models in `@/lib/api-client/models/index`. Use the fluent builder API: `apiClient.api.somethings.get()`, `apiClient.api.somethings.post(body)`, `apiClient.api.somethings.byId(id).put(body)`, etc. For auth-specific error handling, catch `ApiError` (exported from `@/lib/apiClient`, which re-exports Kiota's `DefaultApiError`) and inspect `err.responseStatusCode`. **Never use raw `fetch`, and never use `apiFetch`, for API calls.** If the endpoint you need isn't in the generated client yet, do **not** reach for `apiFetch` as a stopgap — push the backend change (or open the PR) first so the `update-api-client` workflow regenerates and commits `@/lib/api-client/**`, pull/rebase those changes, and only then implement the frontend call against the regenerated `apiClient`. This holds **even when the file you are editing already uses raw `fetch`/`apiFetch`** — do not copy the legacy pattern. **When you modify a file that still contains raw-`fetch` or `apiFetch` calls, migrate them to `apiClient` as part of your change** — don't leave the debt behind.
- **React Query hooks:** Each entity gets a dedicated hook file in `src/hooks/` exporting `useQuery`/`useMutation` hooks (e.g., `useSomethings`, `useCreateSomething`). Mutations invalidate related query keys on success.
- **Components:** Use Shadcn UI components in `src/components/ui/`. Add new ones manually from the Shadcn docs.
- **Client components:** Hook files are marked `"use client"`.
- **Testing:** Use Jest and React Testing Library for behavioural/unit tests. Test files use `.test.tsx` or `.test.ts` extension and are colocated with source files. Run `npm test` for tests, `npm run test:coverage` for coverage reports. Do NOT use `.toMatchSnapshot()` — use Playwright visual tests in `e2e/visual.spec.ts` instead (see the file for patterns).
- **Visual snapshots for new UI (required):** Whenever you add a new component, page, dialog, or a distinct visual state (empty/error/loaded, a new mode, a new indicator), you MUST add at least one Playwright visual snapshot in `e2e/visual.spec.ts` that showcases it — mock its API data in `setupApiMocks`, drive the UI to the state, and `toHaveScreenshot(...)`. This is not optional polish: reviewers rely on these screenshots to see UI changes in PRs without running the app. Do NOT run `test:e2e:visual:update` in a web session — push the spec and let the `update-visual-snapshots` workflow generate and commit the baseline PNGs. A frontend change that introduces new UI without a corresponding snapshot is incomplete.
- **Test utilities:** Use `renderWithClient` from `@/__tests__/utils/test-utils` to render components with React Query provider.
- **Prevent test hangs:** Tests that use real timers or intervals must call `jest.useFakeTimers()` and restore with `jest.useRealTimers()` in `afterEach` — hanging tests cause the CI `test` job to exceed its `timeout-minutes` and fail the workflow.

## API Endpoints

All endpoints are under `/api/somethings`:
- `GET /` — List all (non-deleted)
- `GET /{id}` — Get by ID
- `POST /` — Create (body: `{ name }`)
- `PUT /{id}` — Update (body: `{ name }`)
- `DELETE /{id}` — Soft delete

Swagger UI available at `https://localhost:7000/swagger` in development.

## Code Quality (SonarCloud)

This project uses SonarCloud for static analysis. Both backend (`vormadal_Anything`) and frontend (`vormadal_Anything-frontend`) are analyzed on every push to main/develop.

### Rules to Follow

**General (all languages):**
- Do not leave unused variables or imports.
- Do not shadow variables from an outer scope — use distinct names. E.g., use `err` in catch blocks when `error` is already in scope.
- Do not duplicate string literals — extract repeated strings into constants.
- Do not duplicate logic — extract shared code into helper methods.
- Keep functions and methods focused; avoid high cognitive complexity
- Remove dead code and commented-out code blocks

**Backend (C#):**
- Use `private const` fields for repeated string literals in handler classes.
- Extract shared validation into `private static` helper methods rather than duplicating across handlers.
- Avoid unused local variables — discard return values with `_` if intentionally unused, or remove the assignment entirely.

**Frontend (TypeScript/React):**
- Avoid variable shadowing — use `err` (not `error`) in catch blocks when a component already has an `error` variable in scope.
- Prefer structured error handling over `console.error` in production code when possible.
- Ensure all declared variables and imports are used.
- never cast to `any`

## Development Notes

- CORS is configured for `localhost:3001` (frontend dev server).
- PostgreSQL connection is managed by Aspire when using AppHost, or via `appsettings.Development.json` when running standalone.
- The solution file is `.slnx` format (new XML-based solution format).
- Admin user seeding stays in `Program.cs` to avoid circular dependencies between Database and Application.
- always run linter, build and tests before committing changes.
- **Visual regression tests:** The `update-visual-snapshots` GitHub Actions workflow automatically regenerates and commits snapshots whenever `src/**`, `public/**`, or `e2e/visual.spec.ts` is pushed to a non-main branch. **Do not manually run `test:e2e:visual:update` in a web session** — push the code and let the workflow handle it. The visual runner requires a production build (`npm run build`) and uses `npx next start` to serve it.
- **EF migrations are auto-generated:** The `update-ef-migrations` GitHub Actions workflow detects pending model changes (new/changed entities or `IEntityTypeConfiguration`s under `src/Anything.Core/**` or `src/Anything.Database/**`) on pushes to a non-main branch, runs `dotnet ef migrations add`, and commits the migration back. **Do not hand-write migrations** (especially in web sessions where `dotnet ef` is unavailable) — push the entity/configuration changes and let the workflow generate the migration. Design-time generation needs only a connection string, not a live database. Integration tests build their schema from the model via `EnsureCreated`, so they pass without the migration; the running app applies migrations on startup (`MigrateAsync`), so the migration IS required for the deployed app and for `aspire run`.
- **pg_trgm fuzzy search: map the functions via `HasDbFunction`, not `EF.Functions`.** `EF.Functions.TrigramsSimilarity`/`TrigramsWordSimilarity` are **not** available in `Npgsql.EntityFrameworkCore.PostgreSQL` 10 — the `Npgsql.EntityFrameworkCore.PostgreSQL.Trigrams` plugin that provided them stopped at EF Core 5. Referencing them fails the build with `CS1061`. Instead, declare a static stub (`src/Anything.Core/Search/PgTrigramFunctions.cs`) and map it in `ApplicationDbContext.OnModelCreating` with `modelBuilder.HasDbFunction(...).HasName("word_similarity")`; enable the extension with `modelBuilder.HasPostgresExtension("pg_trgm")` and add GIN trigram indexes via `builder.HasIndex(e => e.Name).HasMethod("gin").HasOperators("gin_trgm_ops")` in the entity configs (these are model-level, so `update-ef-migrations` generates the `CREATE EXTENSION`/GIN-index migration). `word_similarity`/`similarity` return SQL `real`, so the C# stub must return `float` (not `double`) or Npgsql throws a read cast error. Use `word_similarity(query, name)` (not `similarity`) for search: it scores the query against the closest word-extent of the name, so a typo like `"chickn"` still matches `"Chicken Curry"` — plain `similarity` is penalised by length difference. The shared threshold lives in `Anything.Application.Common.FuzzySearch`.
- **Regenerating a single visual snapshot: delete the baseline, and remember the snapshot dir is not a workflow trigger path.** `update-visual-snapshots` runs `test:e2e:visual:update`, but Playwright's `--update-snapshots` will **not** overwrite (and thus won't commit) a baseline it considers a match, so editing a test without deleting its `.png` can leave a stale baseline in place with "No snapshot changes to commit". To force a clean regeneration, `git rm` the specific `anything-frontend/e2e/visual.spec.ts-snapshots/<name>.png`. But the snapshot directory is **not** in the workflow's `paths:` filter — a commit that only deletes/changes a PNG under `e2e/visual.spec.ts-snapshots/**` won't trigger the workflow. Pair the deletion with a change to a trigger path (`e2e/visual.spec.ts`, `src/**`, `public/**`, …) in the same push so the workflow runs and regenerates the missing baseline. Also note: a suggestion/typeahead visual test must target data **not already present** in the list it renders over (suggestions filtered against existing items are dropped, so the assertion silently matches an existing row instead of the dropdown).
- **API client is auto-generated:** The `update-api-client` workflow boots the API (Postgres + Minio, in the `Development` environment so Swagger is exposed) and runs `npm run generate:api`, committing the regenerated `anything-frontend/src/lib/api-client/**` back to the branch on pushes that touch the backend API surface (`src/Anything.API/**`, `src/Anything.Contracts/**`, `src/Anything.Application/**`, `src/Anything.Core/**`). **Do not hand-edit the generated client.** If the frontend needs an endpoint that isn't in the generated client yet, **do not use `apiFetch` as a stopgap.** Push the backend change (or open the PR) first so the `update-api-client` workflow regenerates and commits the client, pull/rebase those changes into your branch, and only then implement the frontend call against the regenerated `apiClient`. Note: the `kiota` binary is a .NET tool (`Microsoft.OpenApi.Kiota`), not an npm package.
- Both auto-generation workflows mirror `update-visual-snapshots`: they run only on non-main branches, skip when the actor is `github-actions[bot]`, commit with `[skip ci]`, and rebase before pushing (so concurrent auto-committers don't race).
- **Model-changing pushes break `update-api-client` on the first push — this is expected.** When a push adds/changes an entity (new column, etc.), `update-ef-migrations` and `update-api-client` run in parallel on the *same* pre-migration commit. `update-api-client` boots the API, whose startup `MigrateAsync` escalates `PendingModelChangesWarning` to a fatal error because the migration doesn't exist yet, so Swagger never comes up and Kiota generation times out (exit 124). `update-ef-migrations` meanwhile commits the migration. To get the client regenerated you must trigger `update-api-client` again on a commit that *already contains* the migration — and it only triggers on `src/Anything.{API,Contracts,Application,Core}/**` changes (NOT `src/Anything.Database/**`, where migrations live), so a frontend-only or migration-only push won't re-trigger it. The fix: after the migration lands, make a small backend-path change (e.g. XML-doc the new contracts) in your next push so the client regenerates on a migration-containing tip, then pull/rebase the regenerated client before validating the frontend.
- **Snapshot bot commits don't re-trigger PR checks.** Because `update-visual-snapshots` commits with `[skip ci]`, the PR's `Visual Snapshot Tests` check does NOT rerun on the baseline-containing commit — the PR stays red with the pre-baseline failure as its latest check. After the bot commit lands, push a small non-`[skip ci]` commit (docs, comment) to sync the PR and rerun checks on a tip that includes the baselines.
- **The onboarding tour auto-opens over e2e tests unless the seen flag is pre-set.** The guided tour (`src/hooks/useOnboardingTour.ts`) auto-opens once for any authenticated user with a household when `localStorage.tourSeenVersion` doesn't match `TOUR_VERSION` (`src/lib/tourSteps.ts`). Both e2e auth fixtures pre-set it — `e2e/global.setup.ts` (chromium project) and `e2e/fixtures/visual-auth.json` (visual project) — so the dialog doesn't overlay unrelated tests. When bumping `TOUR_VERSION`, update the value in both places.
- **Kiota multipart uploads must pass `ArrayBuffer`, not `File`.** Kiota's multipart serializer only supports `string`/`ArrayBuffer`/`Uint8Array` part content — calling `multipartBody.addOrReplacePart("file", type, file)` with a `File`/`Blob` throws "unsupported content type for multipart body" client-side before any request is made. Use `await file.arrayBuffer()` and pass the file name as the fifth argument (see `uploadRecipeImageFile` in `anything-frontend/src/hooks/useRecipes.ts`).
- **tesseract.js OCR assets are self-hosted, partly gitignored.** The scan-from-photo flow serves the worker/WASM cores from `public/tesseract/` (gitignored; copied from node_modules by `scripts/copy-tesseract-assets.mjs` via the `predev`/`prebuild` npm hooks) and the gzipped `tessdata_fast` models from `public/tessdata/` (committed). If OCR fails with 404s on `/tesseract/*`, run `npm run copy:tesseract`.
- **Food-plan visual tests: weekday-name locators match two rows.** The calendar renders ±1 week, so every weekday appears twice (e.g. torsdag Jan 9 AND Jan 16 around the fixed clock 2025-01-15). `getByRole("button", { name: /torsdag/i }).first()` silently picks the PREVIOUS week's (past) day. Target the upcoming day via its full aria-label (e.g. `"torsdag, i morgen"`).
- **Web sessions lack the .NET toolchain:** `dotnet`, `dotnet ef`, and `aspire` are NOT available in Claude Code web sessions. Do not attempt workarounds (manual IL, hand-written migrations, hand-edited generated client) — write the source changes, rely on the auto-generation workflows above, and clearly flag anything that still needs local verification.
- **Suggestions (`ShoppingListRecommendation`) are list-scoped via a nullable `ShoppingListId`.** `null` = *shared* (surfaces in every shopping list's autocomplete — the legacy/global scope); a non-null value scopes the suggestion to that one list. This preserved backwards compatibility with **zero data migration**: pre-existing rows stayed `null` and thus visible everywhere. Query rule for a list's typeahead/management view: `HouseholdId == h && (ShoppingListId == listId || ShoppingListId == null)`. The item-add/recipe/food-plan seeding sites (`AddShoppingListItem`, `ShoppingListHelpers`, `AddRecipeToShoppingList`, `AddFoodPlanToShoppingList`) set `ShoppingListId` to the destination list, and their "already exists" check is scoped to `(list-or-shared)`. Uniqueness on `(HouseholdId, ShoppingListId, Name)` is enforced by **two partial unique indexes** — one `WHERE "ShoppingListId" IS NOT NULL`, one on `(HouseholdId, Name) WHERE "ShoppingListId" IS NULL` — instead of a single index with `.AreNullsDistinct(false)` (Postgres `NULLS NOT DISTINCT`, which requires PG15+ and broke the e2e/production deploy: the API crashes on `MigrateAsync()` before `app.RunAsync()` ever runs, which passes CapRover's build-only `verify-deploy.js` check but makes every request — including login — fail, surfacing as a `waitForURL` timeout in the auth setup e2e test). The two-partial-index form gives identical uniqueness semantics on any Postgres version. `GetShoppingListItems` resolves the name→category sort order **in memory** (preferring the list-specific row over the shared one) because a SQL join on name would now duplicate an item row when both a shared and a list-specific recommendation share the name. Admin: `DELETE /api/shopping-list-recommendations/by-list/{id}` clears only a list's own suggestions (shared ones stay); `GET /all` accepts `shoppingListId`/`sharedOnly`/`uncategorized`/`includeInSuggestions` filters. Recipe ingredient autocomplete stays household-wide (a recipe isn't a shopping list), so it passes no `shoppingListId`.
- **Record expensive learnings here.** When a task surfaces an important or expensive-to-rediscover learning — a non-obvious gotcha, a tool that's unavailable in an environment, an automated workflow that handles something for you, or a subtle ordering/dependency constraint — add it to this CLAUDE.md (or the relevant directory `agent.md`) so future sessions don't pay the cost of rediscovering it.

## E2E Testing Rules (CI vs Deploy)

The CI workflow uses a fresh local database; the deploy workflow runs against the live deployed environment with persistent data and real network latency. Write tests to be robust against both:

- **Use `page.goto()` for setup navigation.** When a test navigates to a page only as setup (e.g., going to `/recipes/new` to create a recipe), use `page.goto()` directly instead of clicking a UI navigation element. Clicking header icon-links is unreliable in the deployed environment because in-flight API data-loading can cause React re-renders that momentarily detach the element. Reserve UI navigation clicks only for tests that specifically assert the navigation element works.
- **Use `page.waitForURL(pattern)` when navigation IS what's being tested.** After a user action that triggers navigation (button click, form submit), prefer `page.waitForURL("**/path")` over `expect(page).toHaveURL(...)` — `waitForURL` is purpose-built for navigation and avoids races where the assertion runs before the router has committed the new URL.
- **Always use timestamp-based unique names for test data** (e.g., `` `E2E Item ${Date.now()}` ``) to avoid collisions with data accumulated from previous test runs in the persistent deploy database.
- **Clean up test data after each test** — delete records created during a test (via the UI or a direct API call via `page.evaluate`) so they do not accumulate in the deploy environment and slow down data-fetching for subsequent tests.
- **Read `env.apiUrl` for direct API calls in `page.evaluate`**, not a hard-coded `localhost` URL. In the deploy environment the API is proxied at the same origin as the frontend (`E2E_API_URL=E2E_BASE_URL`), so direct fetch calls inside tests must use `env.apiUrl` from `e2e/env.ts`.
- **Shared `apiRequest` helper:** `e2e/apiRequest.ts` exports the authenticated `page.evaluate`-based fetch helper (reads the bearer token + household ID from `localStorage`). Import it instead of redefining a local copy per spec file.
- **Uncleaned test recipes silently corrupt food-plan suggestion rankings.** `GET /api/food-plan/suggestions` scores every household recipe and returns only the top `count` (max 200, see `GetFoodPlanSuggestions.MaxCount`). A recipe with real planning history (rotation/favorites/seasonality) scores far higher than a brand-new "not planned yet" recipe (a fixed, low score). Any e2e test that creates a recipe (and especially one that also schedules it on the food plan) without deleting it in a `finally` block leaves a permanently-scoring competitor in the persistent deploy household — over many runs this pushes freshly-created test recipes out of the ranked suggestions window, causing unrelated suggestion tests in `food-plans.spec.ts` to fail. Always wrap recipe/food-plan-entry/shopping-list creation in `try {} finally { /* delete via apiRequest */ }`, even in tests that aren't primarily about food plans (e.g. `flows.spec.ts`, `recipes.spec.ts`).
  - **Raising `MaxCount` and cleaning up leaks is not sufficient once the shared household is already crowded.** This was tried (`MaxCount` 50→200, cleanup added to `flows.spec.ts`/`recipes.spec.ts`) and the very next deploy run failed with the same errors — the shared `anything-e2e` household had *already* accumulated 200+ recipes that permanently outscore a fresh candidate, and a code fix can't undo data that already leaked in past runs. Any test asserting a specific recipe's rank/membership in `/api/food-plan/suggestions` is fundamentally unreliable against a real, ever-growing shared household — no `count` value fixes it. The actual fix (see `food-plans.spec.ts`'s `useEphemeralHousehold` helper): create a throwaway household via `POST /api/households`, point the page at it via `localStorage.setItem("householdId", ...)`, run the ranking-sensitive assertions there (guaranteed empty, so ranking is deterministic), then `DELETE /api/households/{id}` in `finally` — which also makes any recipes/entries created in it permanently invisible to every other household's suggestions, so no per-recipe cleanup is needed for those specific tests either.
- **Don't let a dropdown auto-open over content it doesn't own.** The food-plan day dialog's ranked-suggestions `<ul>` used to be `position: absolute`, which is fine while the user is actively typing (it overlays the space below the input without shifting layout) but breaks when the dropdown can auto-open on mount (`showSuggestionsOnOpen`, for empty upcoming days) and stay open indefinitely because the input never blurs — the floating box then visually covers unrelated controls further down the dialog (e.g. the note's "Clear note" button), permanently intercepting clicks meant for them. The fix was to render that specific list in normal document flow (no `absolute`/`z-10`) so it pushes later content down instead of covering it. If you re-introduce an auto-opening overlay anywhere, make sure it can't render on top of controls it doesn't logically own.
- **A full-page reload re-fetches list items, which can lag behind a just-completed write in deploy.** Leaving edit mode via `page.goto(url.split("?")[0])` (there is no client-side "done editing" button — see `src/app/lists/[id]/page.tsx`) wipes the React Query cache and forces a fresh `GET /items`. In the persistent deploy environment that first fetch can occasionally miss an item whose `POST` just succeeded (read-after-write lag), and React Query won't refetch on its own, so a plain `toBeVisible` retry can never recover — the test flakes on a missing item (e.g. "Bread"). Wrap the post-reload item assertions in `await expect(async () => { await page.reload(); /* toBeVisible checks */ }).toPass()` so a reload re-fetches and the assertion self-heals.
- **Register the offline transition before acting on it.** After `page.context().setOffline(true)`, wait for the `OfflineBanner` (`await expect(page.getByText(/you're offline/i)).toBeVisible()`) before triggering a shopping-list/checklist mutation. Otherwise the mutation can run before the app registers offline, take the online path, and have to fail a real request before it enqueues — racing the pending-sync-indicator assertion. Both offline specs now do this. Also give the "pending indicator clears once back online" assertions a generous timeout (`{ timeout: 20000 }`): the replay is a real POST/PUT round-trip plus refetch and can exceed the default 10s under deploy latency.
- **The "pending indicator clears once back online" assertion needs a reload-retry, not just a longer timeout.** The automatic outbox replay (`useOfflineSync`) is a *single-shot* triggered by the browser `online` event; `replayListQueue` stops a list's queue on the first failed request (increments retries and `break`s) and only retries on the *next* sync trigger (`online`/`focus`/`visibilitychange`). In the deploy env a transient first-attempt PUT/POST after reconnect leaves the mutation queued with no further trigger, so `expect('[aria-label="Pending sync"]').not.toBeVisible({ timeout: 20000 })` times out even though nothing is really broken — bumping the timeout can't fix a stuck (not slow) queue. The robust fix (see `offline.spec.ts`'s checked-off test) is to wrap the assertion in `await expect(async () => { await page.reload(); /* item visible + no pending */ }).toPass({ timeout: 40000 })`: reloading re-mounts `useOfflineSync`, which retriggers the replay, and re-fetches from the server, so it self-heals against both the stuck-queue case and read-after-write lag. Only safe for **idempotent** replays (an `update`/check-off PUT); do NOT reload-retry an `add` test — a reload mid-POST (before the outbox dequeues) re-posts on the next mount and creates a duplicate item, so the "added while offline" test keeps the plain 20s timeout.
- **The full-flow shopping-list spec must clean up its list.** `shopping-lists.spec.ts`'s create→add→check→complete test creates a list every run; wrap the body in `try {} finally { apiRequest(page, "DELETE", \`/api/checklists/${listId}\`) }` so lists don't accumulate in the shared deploy household.
