# CLAUDE.md

## Project Overview

**Anything** is a monorepo for creating flexible list-based items ("Somethings") — checklists, grocery lists, inventories, expense trackers, etc. It has a .NET 10 backend API and a Next.js 15 frontend.

## Repository Structure

```
Anything/
├── src/                              # Backend (.NET)
│   ├── Anything.API/                 # Minimal API (main backend)
│   │   ├── Program.cs                # App entry point, service config, middleware
│   │   ├── Endpoints/                # API endpoint groups (extension methods)
│   │   ├── Data/                     # EF Core DbContext and entity models
│   │   └── Properties/              # Launch settings
│   ├── Anything.AppHost/            # Aspire orchestrator (manages PostgreSQL)
│   └── Anything.ServiceDefaults/    # Shared service config (telemetry, health checks)
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

**Backend:** .NET 10, Minimal API, Entity Framework Core, PostgreSQL, Aspire, Swashbuckle (Swagger)
**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn UI, React Query (TanStack), Kiota (API client generation)

## Common Commands

### Backend

```bash
dotnet build                                          # Build solution
dotnet run --project src/Anything.AppHost              # Run with Aspire (starts PostgreSQL)
dotnet run --project src/Anything.API                  # Run API standalone
dotnet ef migrations add <Name> --project src/Anything.API   # Create migration
dotnet ef database update --project src/Anything.API         # Apply migrations
```

### Frontend

```bash
cd anything-frontend
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run generate:api # Generate API client from Swagger (API must be running)
```

## Key Patterns & Conventions

### Backend

- **Endpoints as extension methods:** Each entity gets its own static class in `Endpoints/` with a `Map*Endpoints()` extension method registered in `Program.cs`.
- **Soft deletes:** Entities use a `DeletedOn` nullable DateTime field. All queries filter `WHERE DeletedOn == null`.
- **Timestamps:** Entities use `CreatedOn` (set on creation), `ModifiedOn` (set on update), `DeletedOn` (set on soft delete). All use `DateTime.UtcNow`.
- **Request/response records:** Use C# `record` types for request DTOs (e.g., `CreateSomethingRequest(string Name)`), defined in the same file as endpoints.
- **Route grouping:** Endpoints use `MapGroup("/api/<entity>")` for consistent prefixing.

### Frontend

- **Path alias:** `@/*` maps to `./src/*` in imports.
- **React Query hooks:** Each entity gets a dedicated hook file in `src/hooks/` exporting `useQuery`/`useMutation` hooks (e.g., `useSomethings`, `useCreateSomething`). Mutations invalidate related query keys on success.
- **API base URL:** Configured via `NEXT_PUBLIC_API_URL` env var, defaults to `http://localhost:5000`.
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

## Development Notes

- CORS is configured for `localhost:3000` (frontend dev server).
- PostgreSQL connection is managed by Aspire when using AppHost, or via `appsettings.Development.json` when running standalone.
- No migrations have been committed yet — run `dotnet ef migrations add` to initialize.
- The solution file is `.slnx` format (new XML-based solution format).

## Testing

### Frontend Tests

The frontend uses **Jest** and **React Testing Library** for integration tests:

- **Test Location:** Tests are colocated with source files using `.test.tsx` or `.test.ts` extensions.
- **Running Tests:**
  - `npm test` — Run all tests once
  - `npm run test:watch` — Run tests in watch mode
  - `npm run test:coverage` — Run tests with coverage report
- **Test Structure:**
  - Hook tests mock `fetch` globally to test API interactions
  - Component tests use `renderWithClient` utility to provide React Query context
  - Integration tests verify full user workflows (create, update, delete)
- **Coverage:** Coverage reports are generated in `coverage/` directory and include LCOV format for SonarCloud integration.
- **CI Integration:** Tests run automatically in GitHub Actions on every PR and push to main/develop branches.
