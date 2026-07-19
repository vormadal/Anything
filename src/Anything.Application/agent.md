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
- Fuzzy search uses a shared threshold in `Anything.Application.Common.FuzzySearch`; the pg_trgm plumbing (`word_similarity`, GIN indexes) lives in `src/Anything.Database/agent.md`.

## ShoppingListRecommendation scoping (query & seeding)

Suggestions are list-scoped via a nullable `ShoppingListId`: `null` = *shared* (surfaces in every shopping list's autocomplete — the legacy/global scope); a non-null value scopes the suggestion to one list. Pre-existing rows stayed `null`, so this shipped with zero data migration. (Index/uniqueness mechanics: `src/Anything.Database/agent.md`.)

- **Query rule** for a list's typeahead/management view: `HouseholdId == h && (ShoppingListId == listId || ShoppingListId == null)`.
- **Seeding sites** (`AddShoppingListItem`, `ShoppingListHelpers`, `AddRecipeToShoppingList`, `AddFoodPlanToShoppingList`) set `ShoppingListId` to the destination list, and their "already exists" check is scoped to `(list-or-shared)`.
- `GetShoppingListItems` resolves the name→category sort order **in memory** (preferring the list-specific row over the shared one) because a SQL join on name would duplicate an item row when a shared and a list-specific recommendation share the name.
- Recipe ingredient autocomplete stays household-wide (a recipe isn't a shopping list), so it passes no `shoppingListId`.
- Admin endpoints: `DELETE /api/shopping-list-recommendations/by-list/{id}` clears only a list's own suggestions; `DELETE .../shared` clears only shared ones; `POST .../transfer` (`{ fromShoppingListId, toShoppingListId }`, null = shared) bulk-moves a scope and **drops** any source whose name already exists in the destination (case-insensitive, mirroring the seeding sites, so it never trips the partial unique index), returning `{ moved, dropped }`; `GET /all` accepts `shoppingListId`/`sharedOnly`/`uncategorized`/`includeInSuggestions` filters.
