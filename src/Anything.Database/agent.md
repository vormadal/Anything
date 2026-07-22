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

## Cross-entity search index (SearchDocument)

`SearchDocument` (one row per indexed source entity — `Recipe`, `ShoppingList`, `InventoryItem`) backs a single `/api/search` endpoint spanning entity types, combining Postgres full-text search with the existing pg_trgm fuzzy fallback:

- **Generated `tsvector` column, not a mapped CLR property.** `SearchDocumentConfiguration` declares it as a shadow property (`builder.Property<NpgsqlTsVector>("SearchVector").HasComputedColumnSql("to_tsvector('simple', \"Title\" || ' ' || \"Content\")", stored: true)`) with a GIN index. There is no `HasGeneratedTsVectorColumn` helper in `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.1 — this raw computed-column SQL *is* the idiomatic way, not a fallback. Query it with `EF.Property<NpgsqlTsVector>(d, "SearchVector")` — never add a `NpgsqlTsVector` CLR property to `SearchDocument` itself, since `Anything.Core` must stay dependency-free.
- **`EF.Functions.ToTsVector`/`PlainToTsQuery`/`ToTsQuery` and `.Matches(...)` are natively supported** by the Npgsql EF provider (unlike `word_similarity`/`similarity` — no `HasDbFunction` stub needed for these). **But they must be called inline, inside the query expression** — `var tsQuery = EF.Functions.PlainToTsQuery("simple", term);` followed by referencing `tsQuery` inside `.Where()`/`.Select()` executes the call as an ordinary, untranslated C# statement (it runs *before* the query is built, not as part of it) and throws at runtime — a 500 that unit tests mocking `IRepository<T>` can't catch and `dotnet build` can't catch either, only a real query execution. Same rule as `PgTrigramFunctions.WordSimilarity`/`Similarity`: these `EF.Functions`-style calls are stubs with no in-memory implementation, meaningful only when EF's LINQ provider sees the method call *inside* the expression tree it's translating. Write `EF.Property<NpgsqlTsVector>(d, "SearchVector").Matches(EF.Functions.PlainToTsQuery("simple", term))` directly in the `.Select()`/`.Where()` lambda instead.
- **Why the query lives in `Anything.Database.Services.SearchIndexService`, not an Application handler using `IRepository<SearchDocument>` directly:** `EF.Property<NpgsqlTsVector>` and the Npgsql full-text extension methods require referencing `NpgsqlTypes`/the Npgsql EF provider. `Anything.Application` never references `Npgsql.EntityFrameworkCore.PostgreSQL` (only `PgTrigramFunctions`' plain `float(string,string)` stub, which has zero Npgsql types in its signature) — adding a direct reference there would be a real infrastructure leak even though no `Anything.ArchitectureTests` check currently catches package-level (as opposed to project-level) dependencies. Instead, `ISearchIndexService` is defined in `Anything.Core.Services` and implemented in `Anything.Database` — same split as `IRepository<T>`/`IUnitOfWork`, not the `IPasswordService`-style split (interface in Core, impl in `Application.Services`) used by the other Core service interfaces.
- **Index maintenance is centralized in `SearchIndexInterceptor`** (`SaveChangesInterceptor`), not scattered across command handlers. Entities opt in via `ISearchable` (`src/Anything.Core/agent.md`). The tricky part: an `Added` entity's id isn't known until after insert, so those are staged during `SavingChangesAsync` (keyed by `DbContext` instance via a `ConditionalWeakTable`, not by interceptor instance, in case the interceptor instance is ever shared across scopes) and flushed with a second, independent `SaveChangesAsync` call in `SavedChangesAsync` once the id is populated — safe because it runs after the original save already committed, so it isn't reentrant into the same save operation.
- **Backfill is an explicit command, not automatic on startup** — either the global-admin variant (`RebuildSearchIndexCommand`, `POST /api/search/rebuild-index`, all households) or the household-manager self-serve variant (`RebuildHouseholdSearchIndexCommand`, `POST /api/search/rebuild-index/household`, caller's household only). Needed after this feature deploys (existing rows predate the interceptor and are never indexed retroactively) or after changing what gets indexed.
- **Real-Postgres integration tests are the only real verification for this feature.** `EF.Property<NpgsqlTsVector>(...).Matches(...)` and the pg_trgm fallback can't be checked by a unit test (which mocks `IRepository<T>`, never touching a real query translation) or by `dotnet build` — a translation mistake only throws when the query executes against Postgres. `tests/Anything.API.IntegrationTests/SearchEndpointTests.cs` exercises substring matching, typo tolerance, soft-delete exclusion, and household scoping against the real Testcontainers Postgres instance.

## ShoppingListRecommendation uniqueness (index mechanics)

Suggestions are list-scoped via a nullable `ShoppingListId` (`null` = shared; see `src/Anything.Application/agent.md` for query/seeding semantics). Enforce uniqueness on `(HouseholdId, ShoppingListId, Name)` with **two partial unique indexes** — one `WHERE "ShoppingListId" IS NOT NULL`, one on `(HouseholdId, Name) WHERE "ShoppingListId" IS NULL` — **not** a single index with `.AreNullsDistinct(false)`. Postgres `NULLS NOT DISTINCT` requires PG15+ and broke the deploy: the API crashes on `MigrateAsync()` before `app.RunAsync()`, which passes CapRover's build-only check but makes every request (including login) fail. The two-partial-index form gives identical semantics on any Postgres version.
