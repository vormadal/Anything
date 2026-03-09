# CLAUDE.md

## Project Overview

**Anything** is a monorepo for creating flexible list-based items ("Somethings") — checklists, grocery lists, inventories, expense trackers, etc. It has a .NET 10 backend API and a Next.js 15 frontend.

## Repository Structure

```
Anything/
├── src/                              # Backend (.NET)
│   ├── Anything.API/                 # Minimal API — thin endpoint dispatchers
│   │   ├── Program.cs                # App entry point, JWT, CORS, Swagger, admin seeding
│   │   ├── Endpoints/                # Thin endpoint groups (dispatch to mediator)
│   │   └── Properties/              # Launch settings
│   ├── Anything.Application/         # Application layer — commands, queries, handlers, services
│   │   ├── Configuration/            # JwtSettings, AdminSettings
│   │   ├── Services/                 # PasswordService, TokenService implementations
│   │   ├── Features/                 # Command/query handlers organized by feature
│   │   └── DependencyInjection.cs    # AddApplication() extension method
│   ├── Anything.Core/                # Domain layer — entities, interfaces (no dependencies)
│   │   ├── Constants/                # UserRoles
│   │   ├── Entities/                 # 14 entity POCOs
│   │   ├── Repositories/             # IRepository<T>, IUnitOfWork
│   │   └── Services/                 # IPasswordService, ITokenService
│   ├── Anything.Contracts/           # API contracts — request/response DTOs with validation
│   │   ├── Auth/                     # Auth DTOs
│   │   ├── Somethings/               # Something DTOs
│   │   ├── Inventory/                # Inventory DTOs
│   │   ├── ShoppingLists/            # Shopping list DTOs
│   │   └── Recipes/                  # Recipe DTOs
│   ├── Anything.Database/            # Infrastructure — EF Core DbContext, repositories, migrations
│   │   ├── ApplicationDbContext.cs    # DbContext with ApplyConfigurationsFromAssembly
│   │   ├── Configurations/           # 14 IEntityTypeConfiguration<T> classes
│   │   ├── Repositories/             # Repository<T>, UnitOfWork implementations
│   │   ├── Migrations/               # EF Core migrations
│   │   └── DependencyInjection.cs    # AddDatabase(), AddRepositories() extension methods
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

## Architecture

### Clean Architecture Layers

```
Anything.Mediator  (standalone — IRequest, IRequestHandler, IMediator)
Anything.Core      (standalone — entities, repository/service interfaces)
Anything.Contracts (standalone — request/response DTOs with validation)
Anything.Application → Core, Contracts, Mediator (handlers, services, configuration)
Anything.Database    → Core (DbContext, repositories, migrations)
Anything.API         → Application, Database, Contracts, ServiceDefaults (thin endpoints)
```

### Mediator Pattern

Each API operation follows: **Endpoint → Command/Query → Handler → Repository → Database**

- Endpoints are thin dispatchers that create a command/query and call `mediator.Send()`
- Commands/queries implement `IRequest<TResponse>` from `Anything.Mediator`
- Handlers implement `IRequestHandler<TRequest, TResponse>` and contain all business logic
- Handlers are colocated with their command/query in a single `.cs` file under `Features/`
- Handlers are auto-registered via Scrutor assembly scanning

### Repository Pattern

- `IRepository<T>` — generic interface with `GetById`, `GetAll`, `Query()` (IQueryable), `Add`, `Update`, `Remove`
- `IUnitOfWork` — wraps `DbContext.SaveChangesAsync`
- Open generic registration: `typeof(IRepository<>)` → `typeof(Repository<>)` — no per-entity registration needed

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
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run generate:api # Generate API client from Swagger (API must be running)
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
- **Testing:** Use Jest and React Testing Library for integration tests. Test files use `.test.tsx` or `.test.ts` extension and are colocated with source files. Run `npm test` for tests, `npm run test:coverage` for coverage reports.
- **Test utilities:** Use `renderWithClient` from `@/__tests__/utils/test-utils` to render components with React Query provider.

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
- Do not leave unused variables or imports (S1481, S1128).
- Do not shadow variables from an outer scope — use distinct names (S1117). E.g., use `err` in catch blocks when `error` is already in scope.
- Do not duplicate string literals — extract repeated strings into constants (S1192).
- Do not duplicate logic — extract shared code into helper methods.
- Keep functions and methods focused; avoid high cognitive complexity (S3776).
- Remove dead code and commented-out code blocks (S1854, S125).

**Backend (C#):**
- Use `private const` fields for repeated string literals in handler classes.
- Extract shared validation into `private static` helper methods rather than duplicating across handlers.
- Avoid unused local variables — discard return values with `_` if intentionally unused, or remove the assignment entirely.

**Frontend (TypeScript/React):**
- Avoid variable shadowing — use `err` (not `error`) in catch blocks when a component already has an `error` variable in scope.
- Prefer structured error handling over `console.error` in production code when possible.
- Ensure all declared variables and imports are used.

### SonarCloud Configuration

- **Backend CI:** `.github/workflows/backend-ci.yml` — scans `src/`, excludes `**/Program.cs`, `**/Migrations/**`, `**/bin/**`, `**/obj/**`
- **Frontend CI:** `.github/workflows/frontend-ci.yml` — scans `anything-frontend/src/`, excludes test files, `node_modules`, `.next`, `public`, `lib/api-client`
- **Frontend sonar config:** `anything-frontend/sonar-project.properties`

## Development Notes

- CORS is configured for `localhost:3001` (frontend dev server).
- PostgreSQL connection is managed by Aspire when using AppHost, or via `appsettings.Development.json` when running standalone.
- The solution file is `.slnx` format (new XML-based solution format).
- Admin user seeding stays in `Program.cs` to avoid circular dependencies between Database and Application.
- always run linter, build and tests before committing changes.

## Testing

### Backend Integration Tests

Located in `tests/Anything.API.IntegrationTests/`. Uses **xUnit** + **Testcontainers** (spins up a PostgreSQL 17 container automatically — Docker required).

```bash
dotnet test tests/Anything.API.IntegrationTests/Anything.API.IntegrationTests.csproj
```

- Tests are grouped by endpoint area (e.g., `SomethingEndpointTests`, `FoodPlanEndpointTests`).
- Each test resets the database to a clean state via `ResetDatabaseAsync()`, then re-seeds the admin user.
- A Kiota-generated typed `AnythingApiClient` in `ApiClient/` is used for HTTP calls — regenerate it with `kiota update` when the API changes (do not edit generated files manually).

### Frontend Tests

Located alongside source files (`*.test.tsx` / `*.test.ts`). Uses **Jest** and **React Testing Library**.

```bash
cd anything-frontend
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

- Hook tests mock `@/lib/apiClient`; component tests use `renderWithClient` from `@/__tests__/utils/test-utils`.
- Coverage reports are written to `coverage/` (LCOV format) and fed to SonarCloud.
- CI runs tests automatically on every PR and push to main/develop.
