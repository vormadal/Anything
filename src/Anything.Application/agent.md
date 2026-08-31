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
- Cross-entity search (`Features/Search/`) is the one place Application queries through a Core service interface (`ISearchIndexService`) instead of `IRepository<T>` directly — its implementation needs Postgres full-text search types that Application must not reference. See `src/Anything.Database/agent.md` → "Cross-entity search index" for why, and `src/Anything.Core/agent.md` for `ISearchable`. Its two rebuild commands (`RebuildSearchIndexCommand` — global admin, all households; `RebuildHouseholdSearchIndexCommand` — household manager, caller's household only) share one `internal static` helper (`SearchIndexRebuilder.Rebuild`, same file) taking an optional `householdId` filter, rather than duplicating the upsert/orphan-removal logic per command — the two-distinct-commands-plus-shared-helper shape is the pattern to follow for any future "global admin variant + household-self-serve variant" pair, rather than one command with a nullable parameter and mixed authorization.

## Security & Performance Rules

- **Scope inside the query, never fetch-then-check.** Every handler touching household data filters `HouseholdId == householdContext.HouseholdId && DeletedOn == null` in the EF query itself (any Inventory handler is the model). An id from the route is untrusted until that filter has run — this is the app's *only* tenant-isolation mechanism.
- **Uploads validate size AND content type before storage.** `UploadValidation.ValidateFileSize` plus a per-endpoint content-type allowlist, following `UploadNoteImageHandler` (compare the media type only; browsers append parameters). The bucket is public-read, so whatever is stored is world-readable to anyone with the URL — never store a client-supplied `ContentType` unchecked.
- **Bearer-style secrets are credentials.** Refresh/share/invite tokens: generate with `RandomNumberGenerator` (as `TokenService.GenerateRefreshToken` does — not `Guid.NewGuid()`), never log them, and prefer storing only a hash (plaintext rows are the current gap — see SECURITY-PERFORMANCE-PLAN.md).
- **Any server-side fetch of a user-supplied URL is an SSRF surface.** A new one must allow only http/https, reject private/loopback/link-local hosts, cap response size, and bound redirects — do not copy `RecipeParserService.ParseFromUrl`'s unguarded `GetStringAsync`.
- **Read handlers project; they don't track.** `repository.Query()` returns a *tracking* queryable — list/get handlers `.Select()` into response records (which skips tracking for free) rather than materializing entities they never modify. Reserve entity materialization for handlers that mutate and save.
- **Stream large payloads; don't buffer.** `MinioStorageService.GetFileStream` currently copies the whole object into a `MemoryStream` — that is the pattern to migrate away from, not to copy. New file-serving paths pass streams through end to end.

## ShoppingListRecommendation scoping (query & seeding)

Suggestions are list-scoped via a nullable `ShoppingListId`: `null` = *shared* (surfaces in every shopping list's autocomplete — the legacy/global scope); a non-null value scopes the suggestion to one list. Pre-existing rows stayed `null`, so this shipped with zero data migration. (Index/uniqueness mechanics: `src/Anything.Database/agent.md`.)

- **Query rule** for a list's typeahead/management view: `HouseholdId == h && (ShoppingListId == listId || ShoppingListId == null)`.
- **Seeding sites** (`AddShoppingListItem`, `ShoppingListHelpers`, `AddRecipeToShoppingList`, `AddFoodPlanToShoppingList`) set `ShoppingListId` to the destination list, and their "already exists" check is scoped to `(list-or-shared)`.
- `GetShoppingListItems` resolves the name→category sort order **in memory** (preferring the list-specific row over the shared one) because a SQL join on name would duplicate an item row when a shared and a list-specific recommendation share the name.
- Recipe ingredient autocomplete stays household-wide (a recipe isn't a shopping list), so it passes no `shoppingListId`.
- Recipe-authored seeding (`AddRecipeIngredient`, `ImportRecipe`, `ReimportRecipe`) also seeds shared (`ShoppingListId: null`) recommendations via `ShoppingListHelpers`, but the `includeInSuggestions` flag differs by provenance: manually typed ingredients (`AddRecipeIngredient`) are user-authored, so they're promoted (`true`); URL-imported/reimported ingredients (`ImportRecipe`, `ReimportRecipe`) come from a third-party page, so they're seeded hidden (`false`) like the recipe-to-shopping-list path, per the design-tension discussion on issue #625 (suggestions should reflect user vocabulary, not bulk-import arbitrary recipe text).
- Admin endpoints: `DELETE /api/shopping-list-recommendations/by-list/{id}` clears only a list's own suggestions; `DELETE .../shared` clears only shared ones; `POST .../transfer` (`{ fromShoppingListId, toShoppingListId }`, null = shared) bulk-moves a scope and **drops** any source whose name already exists in the destination (case-insensitive, mirroring the seeding sites, so it never trips the partial unique index), returning `{ moved, dropped }`; `GET /all` accepts `shoppingListId`/`sharedOnly`/`uncategorized`/`includeInSuggestions` filters.
