# Anything.Core

Domain layer — zero external dependencies. Everything else depends on this; this depends on nothing.

## Structure

- `Entities/` — 29 domain models (e.g., `Bill`, `Recipe`, `ShoppingList`, `User`, `Household`)
  - Enums live here too: `ListType`, `PaymentFrequency`, `ServingsType`
- `Repositories/` — `IRepository<T>`, `IUnitOfWork` (abstractions only)
- `Services/` — `IHouseholdContext`, `IImageStorageService`, `IPasswordService`, `ITokenService`
- `Constants/` — `HouseholdRoles`, `UserRoles`

## Key Patterns

- All entities use `CreatedOn`, `ModifiedOn`, `DeletedOn` (nullable) for soft deletes.
- `IRepository<T>` exposes `Query()` returning `IQueryable<T>` for complex filtering in handlers.
- `IUnitOfWork` wraps the transaction; call `SaveChangesAsync()` once per handler at the end.
- No business logic in entities — pure data bags with navigation properties.
- Interfaces for infrastructure services (`IImageStorageService`, `ITokenService`) are defined here so Application can depend on them without referencing infrastructure assemblies.
