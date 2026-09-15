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
- `Notifications/` — `INotificationDispatcher` + `NotificationDispatcher`, the single writer of `Notification` rows
- `DependencyInjection.cs` — `AddApplication()` extension; uses Scrutor for handler scanning

## Key Patterns

- Each handler is one file: `{Verb}{Noun}Handler.cs` implements `IRequestHandler<TRequest, TResponse>`.
- Handlers returning domain entities let the endpoint decide the HTTP status code (`Results.Created`); handlers that own HTTP semantics return `IResult` directly.
- All data access goes through `IRepository<T>` and `IUnitOfWork` — never `DbContext` directly.
- Soft deletes: queries always filter `WHERE DeletedOn == null`.
- Timestamps: set `CreatedOn`/`ModifiedOn`/`DeletedOn` to `DateTime.UtcNow` in the handler, not in the DB.
- Fuzzy search uses a shared threshold in `Anything.Application.Common.FuzzySearch`; the pg_trgm plumbing (`word_similarity`, GIN indexes) lives in `src/Anything.Database/agent.md`.
- Cross-entity search (`Features/Search/`) is the one place Application queries through a Core service interface (`ISearchIndexService`) instead of `IRepository<T>` directly — its implementation needs Postgres full-text search types that Application must not reference. See `src/Anything.Database/agent.md` → "Cross-entity search index" for why, and `src/Anything.Core/agent.md` for `ISearchable`. Its two rebuild commands (`RebuildSearchIndexCommand` — global admin, all households; `RebuildHouseholdSearchIndexCommand` — household manager, caller's household only) share one `internal static` helper (`SearchIndexRebuilder.Rebuild`, same file) taking an optional `householdId` filter, rather than duplicating the upsert/orphan-removal logic per command — the two-distinct-commands-plus-shared-helper shape is the pattern to follow for any future "global admin variant + household-self-serve variant" pair, rather than one command with a nullable parameter and mixed authorization.

## Notification dispatch

`INotificationDispatcher.Dispatch` is the only thing that creates notifications.
A caller describes *what happened* (`NotificationDispatch`); the dispatcher
resolves recipients, drops opt-outs, skips duplicates, saves and pushes the SSE
event. Three rules that are easy to get wrong:

- **It commits.** It calls `IUnitOfWork.SaveChanges` itself, so call it *after*
  the calling handler has saved its own work (see `AddHouseholdMemberHandler`) —
  otherwise a notification failure can roll back the thing being notified about.
- **`LinkUrl` is a server-side literal**, built by the calling handler
  (`$"/households/{id}"`). Never forward one from a request body: it's rendered
  as a link, so a caller-supplied value is an open-redirect/`javascript:` surface.
  No contract in `Anything.Contracts.Notifications` accepts one.
- **`SourceKey` buys idempotency, and costs redelivery.** Set it for anything a
  sweep or retry could produce twice (`bill:12:2026-09`); leave it null for
  one-off user actions. The dedupe check deliberately ignores `DeletedOn`,
  because the unique index spans soft-deleted rows — treating a dismissed
  notification as absent would turn a redelivery into a constraint violation.
  That also means a keyed notification is never re-sent after dismissal, which
  is why `AddHouseholdMember` uses no key: a member removed and added back
  should be announced again.

Recipients are always intersected with the household's members, including when
`RecipientUserIds` is given — a caller can't address someone outside the
household.

## Web Push

`NotificationDispatcher` enqueues a `PushDispatch` after it has saved and
notified — queued, never awaited against a push service, so adding a household
member doesn't pay third-party HTTP latency. The chain is
`IPushDispatchQueue` (in-memory bounded channel) → `PushSenderHostedService`
(in the API, since that's the host) → `IPushSender`, resolved in a fresh scope
per item so no repository is held for the process lifetime.

- **Push narrows in-app, it never bypasses it.** `EnqueuePush` runs on the
  recipients that already survived the `InAppEnabled` filter, so a user with
  in-app off gets no push even with push on — there is no notification to push.
- **`VapidCredentials` is the single "is push on?" answer.** It is a singleton
  (`VapidAuthentication` caches its signed token and is disposable) and reports
  itself unconfigured when any of the three settings is missing. The DI graph is
  identical either way: services are registered unconditionally and short-circuit
  on that flag, rather than the container shape depending on configuration.
- **Never widen `WebPushSender.IsGone`.** See CLAUDE.md — only 404/410 are
  permanent, and anything else deleting a device silently unsubscribes real
  browsers.

## Security & Performance Rules

- **Scope inside the query, never fetch-then-check.** Every handler touching household data filters `HouseholdId == householdContext.HouseholdId && DeletedOn == null` in the EF query itself (any Inventory handler is the model). An id from the route is untrusted until that filter has run — this is the app's *only* tenant-isolation mechanism.
- **Uploads validate size AND content type before storage.** `UploadValidation.ValidateFileSize` plus `ValidateImageContentType` (recipe/note images) or `ValidateAttachmentContentType` (bill/inventory attachments) — never store a client-supplied `ContentType` unchecked. Widening an allowlist also means updating `anything-frontend/src/lib/uploadAccept.ts`, which mirrors it.
- **Bearer-style secrets are credentials.** Refresh/share/invite tokens: generate with `RandomNumberGenerator` (`TokenService.GenerateRefreshToken`, or `SecureTokenGenerator.GenerateHexToken` in `Common/` for invite/share links — never `Guid.NewGuid()`), never log them, and store only a hash where the value is ever looked back up (`RefreshToken.Token` is `ITokenService.HashRefreshToken`'s output, not the raw token — see `Login`/`RefreshToken` handlers).
- **Any server-side fetch of a user-supplied URL is an SSRF surface.** A new one must allow only http/https, reject private/loopback/link-local hosts, cap response size, and validate each redirect hop — `RecipeParserService.FetchHtml` + `OutboundUrlGuard`/`IOutboundAddressResolver` (in `Common/`) are the model; its `HttpClient` registration disables auto-redirect on purpose. Inject the resolver so unit tests don't do live DNS.
- **Read handlers add `.AsNoTracking()` to every `.Query()` call.** `repository.Query()` returns a *tracking* queryable by default; every handler under a `Queries/` folder is read-only by convention in this codebase (none save), so `.Query().AsNoTracking()` is the standard opening of any query chain there — see any handler in `Features/*/Queries/` for the pattern. It's a no-op against the unit tests' in-memory `IQueryable` mock (EF Core's `AsNoTracking` short-circuits to a no-op for any non-EF `IQueryProvider`), so it never needs test changes. Reserve tracked entity materialization for `Commands/` handlers that mutate and save.
- **Stream large payloads; don't buffer.** `MinioStorageService.GetFileStream` bridges MinIO's callback-based `GetObjectAsync` through a bounded `System.IO.Pipelines.Pipe` (64 KB backpressure threshold) rather than copying the whole object into a `MemoryStream` first — that's the pattern to follow for any new file-serving path, not the `MemoryStream` shortcut.

## ShoppingListRecommendation scoping (query & seeding)

Suggestions are list-scoped via a nullable `ShoppingListId`: `null` = *shared* (surfaces in every shopping list's autocomplete — the legacy/global scope); a non-null value scopes the suggestion to one list. Pre-existing rows stayed `null`, so this shipped with zero data migration. (Index/uniqueness mechanics: `src/Anything.Database/agent.md`.)

- **Query rule** for a list's typeahead/management view: `HouseholdId == h && (ShoppingListId == listId || ShoppingListId == null)`.
- **Seeding sites** (`AddShoppingListItem`, `ShoppingListHelpers`, `AddRecipeToShoppingList`, `AddFoodPlanToShoppingList`) set `ShoppingListId` to the destination list, and their "already exists" check is scoped to `(list-or-shared)`.
- `GetShoppingListItems` resolves the name→category sort order **in memory** (preferring the list-specific row over the shared one) because a SQL join on name would duplicate an item row when a shared and a list-specific recommendation share the name.
- Recipe ingredient autocomplete stays household-wide (a recipe isn't a shopping list), so it passes no `shoppingListId`.
- Recipe-authored seeding (`AddRecipeIngredient`, `ImportRecipe`, `ReimportRecipe`) also seeds shared (`ShoppingListId: null`) recommendations via `ShoppingListHelpers`, but the `includeInSuggestions` flag differs by provenance: manually typed ingredients (`AddRecipeIngredient`) are user-authored, so they're promoted (`true`); URL-imported/reimported ingredients (`ImportRecipe`, `ReimportRecipe`) come from a third-party page, so they're seeded hidden (`false`) like the recipe-to-shopping-list path, per the design-tension discussion on issue #625 (suggestions should reflect user vocabulary, not bulk-import arbitrary recipe text).
- Admin endpoints: `DELETE /api/shopping-list-recommendations/by-list/{id}` clears only a list's own suggestions; `DELETE .../shared` clears only shared ones; `POST .../transfer` (`{ fromShoppingListId, toShoppingListId }`, null = shared) bulk-moves a scope and **drops** any source whose name already exists in the destination (case-insensitive, mirroring the seeding sites, so it never trips the partial unique index), returning `{ moved, dropped }`; `GET /all` accepts `shoppingListId`/`sharedOnly`/`uncategorized`/`includeInSuggestions` filters.
