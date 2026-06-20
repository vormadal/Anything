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
