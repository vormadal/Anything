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
- **API client:** Use `apiClient` from `@/lib/apiClient` for all API calls. It is a Kiota-generated typed client backed by `DefaultRequestAdapter` with `BaseBearerTokenAuthenticationProvider` — it automatically handles the base URL (`NEXT_PUBLIC_API_URL`, defaults to `http://localhost:5238`), `Content-Type: application/json`, and `Authorization: Bearer <token>` headers. All types (request/response models) come from the Kiota-generated models in `@/lib/api-client/models/index`. Use the fluent builder API: `apiClient.api.somethings.get()`, `apiClient.api.somethings.post(body)`, `apiClient.api.somethings.byId(id).put(body)`, etc. For auth-specific error handling, catch `ApiError` (exported from `@/lib/apiClient`, which re-exports Kiota's `DefaultApiError`) and inspect `err.responseStatusCode`. Never use raw `fetch` for API calls.
- **React Query hooks:** Each entity gets a dedicated hook file in `src/hooks/` exporting `useQuery`/`useMutation` hooks (e.g., `useSomethings`, `useCreateSomething`). Mutations invalidate related query keys on success.
- **Components:** Use Shadcn UI components in `src/components/ui/`. Add new ones manually from the Shadcn docs.
- **Client components:** Hook files are marked `"use client"`.
- **Testing:** Use Jest and React Testing Library for behavioural/unit tests. Test files use `.test.tsx` or `.test.ts` extension and are colocated with source files. Run `npm test` for tests, `npm run test:coverage` for coverage reports. Do NOT use `.toMatchSnapshot()` — use Playwright visual tests in `e2e/visual.spec.ts` instead (see the file for patterns).
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

## E2E Testing Rules (CI vs Deploy)

The CI workflow uses a fresh local database; the deploy workflow runs against the live deployed environment with persistent data and real network latency. Write tests to be robust against both:

- **Use `page.goto()` for setup navigation.** When a test navigates to a page only as setup (e.g., going to `/recipes/new` to create a recipe), use `page.goto()` directly instead of clicking a UI navigation element. Clicking header icon-links is unreliable in the deployed environment because in-flight API data-loading can cause React re-renders that momentarily detach the element. Reserve UI navigation clicks only for tests that specifically assert the navigation element works.
- **Use `page.waitForURL(pattern)` when navigation IS what's being tested.** After a user action that triggers navigation (button click, form submit), prefer `page.waitForURL("**/path")` over `expect(page).toHaveURL(...)` — `waitForURL` is purpose-built for navigation and avoids races where the assertion runs before the router has committed the new URL.
- **Always use timestamp-based unique names for test data** (e.g., `` `E2E Item ${Date.now()}` ``) to avoid collisions with data accumulated from previous test runs in the persistent deploy database.
- **Clean up test data after each test** — delete records created during a test (via the UI or a direct API call via `page.evaluate`) so they do not accumulate in the deploy environment and slow down data-fetching for subsequent tests.
- **Read `env.apiUrl` for direct API calls in `page.evaluate`**, not a hard-coded `localhost` URL. In the deploy environment the API is proxied at the same origin as the frontend (`E2E_API_URL=E2E_BASE_URL`), so direct fetch calls inside tests must use `env.apiUrl` from `e2e/env.ts`.
