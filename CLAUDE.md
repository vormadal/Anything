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
npm run test:e2e:visual:update   # Regenerate baseline screenshots — REQUIRED after any new/changed UI, not just "intentional" restyling; see .claude/rules/e2e.md
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
- **API client:** Use `apiClient` from `@/lib/apiClient` for all API calls — **never** raw `fetch` or `apiFetch`. It's a Kiota-generated typed client, auto-regenerated by the `update-api-client` workflow. Full usage (fluent builder, `ApiError` handling, base URL) and the "endpoint not in the client yet" workflow live in [`anything-frontend/src/lib/agent.md`](anything-frontend/src/lib/agent.md).
- **React Query hooks:** Each entity gets a dedicated hook file in `src/hooks/` (e.g. `useSomethings`, `useCreateSomething`); mutations invalidate related query keys on success. See [`anything-frontend/src/hooks/agent.md`](anything-frontend/src/hooks/agent.md).
- **Components:** Use Shadcn UI components in `src/components/ui/`, added manually from the Shadcn docs. Components using hooks/browser APIs are marked `"use client"`.
- **Toasts (sonner) — only for outcomes not otherwise on screen.** Before any `toast.success`, ask: *does the screen already show the outcome (inline row/value update, dialog close, or navigation to a page reflecting it)?* If yes, **no toast** — React Query invalidation already re-renders the change. Toast only for **errors**, **out-of-band success** (clipboard, a different surface, share links, import/export, whole-form saves with no visible delta), and **destructive/terminal actions that navigate away**. **Form validation is never a toast** — use an inline field error and keep native `required`. Full rules in [`anything-frontend/src/components/agent.md`](anything-frontend/src/components/agent.md).
- **Testing:** Jest + React Testing Library for behavioural/unit tests, colocated `.test.tsx`/`.test.ts`; render via `renderWithClient` from `@/__tests__/utils/test-utils`. Do NOT use `.toMatchSnapshot()` — visual assertions go through Playwright.
- **Every UI change needs a Playwright visual snapshot — a hard requirement, not follow-up polish.** Adding or changing a component, page, dialog, or a distinct visual state (empty/error/loaded, a new mode, a new indicator) without a corresponding snapshot in `e2e/visual.spec.ts` means the change is incomplete, even if `npm run build`/`lint`/`test` all pass — those don't cover this. Full authoring rules (mocking, gotchas, why you can't run `test:e2e:visual:update` in a web session) live in [`.claude/rules/e2e.md`](.claude/rules/e2e.md) — read it before finishing any frontend UI change.

## API Endpoints

All endpoints are under `/api/somethings`:
- `GET /` — List all (non-deleted)
- `GET /{id}` — Get by ID
- `POST /` — Create (body: `{ name }`)
- `PUT /{id}` — Update (body: `{ name }`)
- `DELETE /{id}` — Soft delete

Swagger UI available at `https://localhost:7000/swagger` in development.

## Code Quality (SonarCloud)

SonarCloud runs static analysis on every push to main/develop for both backend (`vormadal_Anything`) and frontend (`vormadal_Anything-frontend`). The language rules to follow live in the path-scoped rule files, which auto-attach when you edit a matching file:

- C# → [`.claude/rules/backend-style.md`](.claude/rules/backend-style.md)
- TypeScript/React → [`.claude/rules/frontend-style.md`](.claude/rules/frontend-style.md)

## Development / Local Config

- CORS is configured for `localhost:3001` (frontend dev server).
- PostgreSQL connection is managed by Aspire when using AppHost, or via `appsettings.Development.json` when running standalone.
- The solution file is `.slnx` format (new XML-based solution format).
- Admin user seeding stays in `Program.cs` to avoid circular dependencies between Database and Application.
- Always run linter, build, and tests before committing changes. For any frontend UI change, that also means adding/updating the Playwright visual snapshot (see Frontend → Key Patterns and [`.claude/rules/e2e.md`](.claude/rules/e2e.md)) — it is not covered by lint/build/Jest.
- **Record expensive learnings.** When a task surfaces a non-obvious gotcha, a tool unavailable in an environment, an automated workflow that handles something for you, or a subtle ordering/dependency constraint, write it down so future sessions don't pay to rediscover it — in this CLAUDE.md for repo-wide or CI/deploy concerns, or the relevant directory [`agent.md`](#directory-documentation) / [`.claude/rules/*.md`](.claude/rules) for layer- or file-type-specific rules.

## CI Automation & Deployment

Three GitHub Actions workflows auto-generate committed artifacts on **non-main** branches. They mirror each other: they run only on non-main branches, skip when the actor is `github-actions[bot]`, commit with `[skip ci]`, and rebase before pushing (so concurrent auto-committers don't race). **Do not hand-edit their outputs** — push the source change and let the workflow regenerate:

- `update-ef-migrations` — generates EF migrations from model changes under `src/Anything.Core/**` / `src/Anything.Database/**` (details: [`src/Anything.Database/agent.md`](src/Anything.Database/agent.md)).
- `update-api-client` — regenerates `anything-frontend/src/lib/api-client/**` from the API surface (`src/Anything.{API,Contracts,Application,Core}/**`; the `kiota` binary is a .NET tool, `Microsoft.OpenApi.Kiota`, not an npm package. Details: [`anything-frontend/src/lib/agent.md`](anything-frontend/src/lib/agent.md)).
- `update-visual-snapshots` — regenerates Playwright baseline PNGs from `src/**`, `public/**`, or `e2e/visual.spec.ts`; the runner needs a production build (`npm run build`) served via `npx next start` (authoring rules: [`.claude/rules/e2e.md`](.claude/rules/e2e.md)).

**Web sessions lack the .NET toolchain** (`dotnet`, `dotnet ef`, `aspire`) — rely on these workflows for migrations/client generation and flag anything needing local verification (see the top-of-file note).

Non-obvious gotchas:

- **Model-changing pushes break `update-api-client` on the first push — this is expected.** When a push adds/changes an entity, `update-ef-migrations` and `update-api-client` run in parallel on the *same* pre-migration commit. `update-api-client` boots the API, whose startup `MigrateAsync` escalates `PendingModelChangesWarning` to a fatal error because the migration doesn't exist yet, so Swagger never comes up and Kiota generation times out (exit 124). `update-ef-migrations` meanwhile commits the migration. To regenerate the client you must re-trigger `update-api-client` on a commit that *already contains* the migration — and it only triggers on `src/Anything.{API,Contracts,Application,Core}/**` (NOT `src/Anything.Database/**`, where migrations live). Fix: after the migration lands, make a small backend-path change (e.g. XML-doc the new contracts) in your next push, then pull/rebase the regenerated client before validating the frontend.
- **Snapshot bot `[skip ci]` commits don't re-trigger PR checks.** The PR's `Visual Snapshot Tests` check does NOT rerun on the baseline-containing commit — the PR stays red with the pre-baseline failure as its latest check. After the bot commit lands, push a small non-`[skip ci]` commit (docs, comment) to sync the PR and rerun checks on a tip that includes the baselines.
- **Regenerating a single visual snapshot: the snapshot dir is not a workflow trigger path.** Playwright's `--update-snapshots` won't overwrite (or commit) a baseline it considers a match, so `git rm` the specific `anything-frontend/e2e/visual.spec.ts-snapshots/<name>.png` to force a clean regeneration. But that directory is **not** in the workflow's `paths:` filter — pair the deletion with a change to a trigger path (`e2e/visual.spec.ts`, `src/**`, `public/**`, …) in the same push so the workflow runs.
- **CapRover's "deploy success" only means the image built — it never checks the app actually started, and its log API is undocumented.** `deployedVersion === latestVersion` on `/user/apps/appDefinitions` just means Docker finished handing off the image; the entrypoint can crash-loop forever (e.g. `MigrateAsync()` throwing on a `PendingModelChangesWarning`) and CapRover still reports success — the bug `.github/actions/verify-caprover-deploy` catches by additionally polling the app's `/health` endpoint. Two undocumented REST calls (found by reading `caprover-api`'s — not `caprover-cli`'s — TypeScript source on npm): build logs are `GET /user/apps/appData/<appName>` → `{ logs: { lines: [...] } }`; runtime container logs are `GET /user/apps/appData/<appName>/logs?encoding=hex` → `{ logs: "<hex>" }`, a raw hex-encoded Docker multiplexed stdout/stderr stream (8-byte frame header per chunk: 1 byte stream type, 3 reserved, 4-byte big-endian length) that must be decoded — see `decodeDockerHexLogs` in the action's script.
- **`caprover api` GET calls fail immediately (and misleadingly) if `--data` is omitted — always pass it.** The CLI's `data` option has no `when: false` guard, so a `--data`-less call falls back to an interactive `? API data JSON string:` prompt; in non-interactive CI that gets EOF and exits non-zero within ~1s before any polling happens. The catch then dumps runtime logs and exits 1, so the job looks like it failed on whatever the runtime logs show — which can be a stale, already-fixed error from the *previous* crashed container, not the current deploy. Fix: `callCaproverApi` must always append `--data <json>`, defaulting to `{}` when the caller passes none.
