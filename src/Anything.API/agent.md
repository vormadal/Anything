# Anything.API

Thin HTTP layer. Endpoints extract request data and dispatch to `IMediator.Send()` — no business logic here.

## Structure

- `Endpoints/` — one static class per feature (`BillEndpoints.cs`, `RecipeEndpoints.cs`, etc.) with a `Map*Endpoints()` extension method registered in `Program.cs`
- `Authorization/HouseholdAuthorizationExtensions.cs` — `RequireHouseholdManager()` endpoint filter; gates household config writes to managers
- `Authorization/HouseholdMembershipLookup.cs` — the "is this user a member of this household" query, shared by `HouseholdMiddleware` and anywhere else that needs the same check outside the middleware's normal per-request activation (currently: `EventsEndpoints`' ticket issuance)
- `Middleware/HouseholdMiddleware.cs` — resolves the active household from the request and populates `IHouseholdContext` (including the user's `Role` in that household)
- `Realtime/` — `SseConnectionManager` (household-scoped broadcast) + `SseRealtimeNotifier` + `SseTicketService` (short-lived connect tickets) for Server-Sent Events push notifications
- `Program.cs` — app bootstrap: DI registration, middleware pipeline, endpoint mapping
- `DependencyInjection.cs` — extension methods for wiring up API-layer services

## Key Patterns

- Every endpoint group uses `MapGroup("/api/<entity>")` for consistent route prefixing.
- Validation is applied via `.WithParameterValidation()` from MinimalApis.Extensions — no manual model-state checks.
- Auth endpoints use JWT bearer; household-scoped endpoints go through `HouseholdMiddleware`.
- **Two distinct authorization tiers.** Global roles (`UserRoles.Admin`/`User`, in the JWT) are system-level — use `.RequireAuthorization(UserRoles.Admin)` only for system concerns (e.g. inviting users with no household). Household roles (`HouseholdRoles.Owner`/`Admin`/`Member`, from `IHouseholdContext.Role`) gate per-household data: reads → `.RequireAuthorization()` (any member); config writes (tags, suggestions, units, recommendations) → `.RequireHouseholdManager()` (Owner or Admin). Do NOT gate household-scoped config on the global Admin policy.
- SSE realtime updates are pushed via `ISseRealtimeNotifier` injected into handlers — no polling.
- `appsettings.Production.json` overrides connection strings and JWT settings; Aspire injects those in dev via `AppHost`.

## Security & Performance Rules

- **Auth on the endpoint is not scoping.** `.RequireAuthorization()` + `HouseholdMiddleware` only prove the caller is *a member* of the header's household — the handler's own query must still filter by `IHouseholdContext.HouseholdId`, or every member of any household can read/write the row. Both halves are required for every new household-scoped endpoint.
- **`HouseholdMiddleware`'s exempt prefixes** (`/api/auth`, `/api/households`, `/api/events`, `/api/shared`, `/swagger`) skip the membership check entirely, so endpoints under them enforce their own access rules in the handler (`/api/events/ticket` does — see below). Adding a prefix to that list needs the same justification. The middleware also costs one DB query per request — don't add further per-request middleware queries; reuse `HouseholdMembershipLookup` if a handler under an exempt prefix needs the same check.
- **SSE (`/api/events`) is household-scoped, not a global broadcast.** `SseConnectionManager` registers each connection under one household id and `Broadcast(householdId, message)` only reaches that household's clients — `IRealtimeNotifier.Notify(syncEvent, householdId, ct)` takes the id explicitly (pass `householdContext.HouseholdId`) rather than it living on `SyncEvent` itself, so the wire payload stays type + optional id only (still never put entity data — names, amounts — on `SyncEvent`). An `EventSource` connection can't set headers, so neither the JWT nor the household id ever rides its query string: a client first calls header-authenticated `POST /api/events/ticket` (carrying the normal `X-Household-Id`) to mint a short-lived, single-use ticket (`SseTicketService`), then opens the stream with `?ticket=...`. Never go back to a token/household-id query param on `GET /api/events` itself, and never log query strings anywhere.
- **The checked-in `appsettings.json` secrets are dev-only, and Production enforces that**: `ValidateProductionSecrets` in `Program.cs` refuses to start when `Jwt:SecretKey`, `Admin:Password`, or the MinIO secret still equal what a fresh runtime read of the base `appsettings.json` holds, or when `ImageSettings:ImageProxyKey`/`ImageProxySalt` are unset (unset means unsigned `/insecure` imgproxy URLs — an open resizer). It deliberately compares against a **runtime file read**, not an embedded literal or hash (`ProductionSecretsGuard`/`ProductionSecretsSnapshot`) — a hard-coded copy of the dev secret, plaintext or hashed, is itself what SonarCloud's secret-detection rule flags. Override real deployments via environment variables; never commit a real secret to any appsettings file, and never add a new secret's literal/hash to the guard — extend the snapshot and the baseline file read instead.
- **Anonymous endpoints doing per-request crypto or DB work need a rate limiter.** Login/refresh/register carry `.RequireRateLimiting(RateLimitPolicies.Auth)` (per-client-IP fixed window, configured via `RateLimiting:Auth`; the integration-test factory raises the limit). Client IPs are real only because `UseForwardedHeaders` trusts the nginx chain in `Program.cs` — keep that ordering (first in the pipeline) intact.
