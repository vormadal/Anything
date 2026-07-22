# Anything.Core

Domain layer — zero external dependencies. Everything else depends on this; this depends on nothing.

## Structure

- `Entities/` — 30 domain models (e.g., `Bill`, `Recipe`, `ShoppingList`, `User`, `Household`, `SearchDocument`)
  - Enums live here too: `ListType`, `PaymentFrequency`, `ServingsType`
- `Repositories/` — `IRepository<T>`, `IUnitOfWork` (abstractions only)
- `Services/` — `IHouseholdContext`, `IImageStorageService`, `IPasswordService`, `ITokenService`, `ISearchIndexService`
- `Search/PgTrigramFunctions.cs` — static stubs for the pg_trgm SQL functions (`word_similarity`), mapped via `HasDbFunction` in `ApplicationDbContext`; must return `float`. See `src/Anything.Database/agent.md`.
- `Search/ISearchable.cs`, `SearchEntityTypes.cs`, `SearchHit.cs` — cross-entity search index abstractions. An entity implements `ISearchable` to opt into the `SearchDocument` index; `Anything.Database`'s `SearchIndexInterceptor` keeps it in sync automatically (see `src/Anything.Database/agent.md`). `ISearchIndexService` (the query side) is implemented in `Anything.Database`, not `Anything.Application.Services` like the other Core service interfaces — it needs direct access to Postgres full-text search, which Application must not depend on. `Anything.ArchitectureTests.PlacementTests` only closed-lists the original four service interfaces for the Application-only rule, so this doesn't need a test exemption, but keep it in mind if that test is ever generalized.
- `Constants/` — `HouseholdRoles`, `UserRoles`

## Key Patterns

- All entities use `CreatedOn`, `ModifiedOn`, `DeletedOn` (nullable) for soft deletes.
- `IRepository<T>` exposes `Query()` returning `IQueryable<T>` for complex filtering in handlers.
- `IUnitOfWork` wraps the transaction; call `SaveChangesAsync()` once per handler at the end.
- No business logic in entities — pure data bags with navigation properties.
- Interfaces for infrastructure services (`IImageStorageService`, `ITokenService`) are defined here so Application can depend on them without referencing infrastructure assemblies.
