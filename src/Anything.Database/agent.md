# Anything.Database

Infrastructure layer. EF Core implementation of the repository/UoW pattern; owns the DB schema.

## Structure

- `ApplicationDbContext.cs` — single `DbContext`; all `DbSet<T>` registrations here
- `Configurations/` — one `IEntityTypeConfiguration<T>` class per entity (table names, columns, indexes, FK constraints)
- `Migrations/` — EF Core auto-generated migration files; never edit manually
- `Repositories/Repository.cs` — generic `IRepository<T>` implementation backed by `DbContext`
- `Repositories/UnitOfWork.cs` — wraps `SaveChangesAsync()`
- `DependencyInjection.cs` — `AddDatabase()` extension; registers DbContext and repositories

## Key Patterns

- Keep all EF-specific config (column types, indexes, cascade rules) in the `Configurations/` classes, not in entity attributes.
- Add migrations with: `dotnet ef migrations add <Name> --project src/Anything.Database --startup-project src/Anything.API`
- Apply with: `dotnet ef database update --project src/Anything.Database --startup-project src/Anything.API`
- Global query filters for soft deletes (`DeletedOn == null`) should be set in entity configurations, not per-query.
- The `Repository<T>` exposes `Query()` as raw `IQueryable<T>` — callers are responsible for filtering and projection.

## Migrations are auto-generated — do not hand-write them

- The `update-ef-migrations` workflow detects pending model changes (new/changed entities or `IEntityTypeConfiguration`s under `src/Anything.Core/**` or `src/Anything.Database/**`) on non-main pushes, runs `dotnet ef migrations add`, and commits the migration back. **Do not hand-write migrations** (especially in web sessions where `dotnet ef` is unavailable) — push the entity/configuration change and let the workflow generate it. Design-time generation needs only a connection string, not a live DB.
- Integration tests build their schema from the model via `EnsureCreated`, so they pass without the migration; the running app applies migrations on startup (`MigrateAsync`), so the migration IS required for the deployed app and for `aspire run`. See CLAUDE.md → CI Automation & Deployment for the model-change push ordering gotcha.

## pg_trgm fuzzy search

`EF.Functions.TrigramsSimilarity`/`TrigramsWordSimilarity` are **not** available in `Npgsql.EntityFrameworkCore.PostgreSQL` 10 (the Trigrams plugin stopped at EF Core 5); referencing them fails the build with `CS1061`. Instead:

- Declare a static stub (`src/Anything.Core/Search/PgTrigramFunctions.cs`) and map it in `ApplicationDbContext.OnModelCreating` with `modelBuilder.HasDbFunction(...).HasName("word_similarity")`.
- Enable the extension with `modelBuilder.HasPostgresExtension("pg_trgm")` and add GIN trigram indexes via `builder.HasIndex(e => e.Name).HasMethod("gin").HasOperators("gin_trgm_ops")` in the entity configs (model-level, so `update-ef-migrations` generates the `CREATE EXTENSION`/GIN-index migration).
- `word_similarity`/`similarity` return SQL `real`, so the C# stub must return `float` (not `double`) or Npgsql throws a read cast error.
- Use `word_similarity(query, name)` (not `similarity`) — it scores the query against the closest word-extent of the name, so a typo like `"chickn"` still matches `"Chicken Curry"` (plain `similarity` is penalised by length difference). The shared threshold lives in `Anything.Application.Common.FuzzySearch`.

## ShoppingListRecommendation uniqueness (index mechanics)

Suggestions are list-scoped via a nullable `ShoppingListId` (`null` = shared; see `src/Anything.Application/agent.md` for query/seeding semantics). Enforce uniqueness on `(HouseholdId, ShoppingListId, Name)` with **two partial unique indexes** — one `WHERE "ShoppingListId" IS NOT NULL`, one on `(HouseholdId, Name) WHERE "ShoppingListId" IS NULL` — **not** a single index with `.AreNullsDistinct(false)`. Postgres `NULLS NOT DISTINCT` requires PG15+ and broke the deploy: the API crashes on `MigrateAsync()` before `app.RunAsync()`, which passes CapRover's build-only check but makes every request (including login) fail. The two-partial-index form gives identical semantics on any Postgres version.
