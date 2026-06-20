# Anything.Application

Business logic layer. Contains all CQRS handlers, domain services, and configuration.

## Structure

- `Features/<Domain>/Commands/` — write-side handlers (`Create*`, `Update*`, `Delete*`)
- `Features/<Domain>/Queries/` — read-side handlers (`Get*`, `List*`)
- `Services/` — cross-cutting services:
  - `TokenService` / `ITokenService` — JWT generation and refresh
  - `PasswordService` / `IPasswordService` — BCrypt hashing
  - `RecipeImageService` / `IRecipeImageService` — image upload orchestration
  - `MinioStorageService` — S3-compatible object storage
  - `RecipeParserService` / `IRecipeParserService` — scrape/parse recipes from URLs
  - `HouseholdContext` — scoped carrier for the current household ID
  - `ShoppingListHelpers`, `BillHelpers` — shared domain logic helpers
- `Configuration/` — `AdminSettings`, `JwtSettings`, `ImageSettings` (bound from appsettings)
- `Realtime/` — interfaces for SSE notification contracts
- `DependencyInjection.cs` — `AddApplication()` extension; uses Scrutor for handler scanning

## Key Patterns

- Each handler is one file: `{Verb}{Noun}Handler.cs` implements `IRequestHandler<TRequest, TResponse>`.
- Handlers returning domain entities let the endpoint decide the HTTP status code (`Results.Created`); handlers that own HTTP semantics return `IResult` directly.
- All data access goes through `IRepository<T>` and `IUnitOfWork` — never `DbContext` directly.
- Soft deletes: queries always filter `WHERE DeletedOn == null`.
- Timestamps: set `CreatedOn`/`ModifiedOn`/`DeletedOn` to `DateTime.UtcNow` in the handler, not in the DB.
