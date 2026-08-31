# Anything.API

Thin HTTP layer. Endpoints extract request data and dispatch to `IMediator.Send()` — no business logic here.

## Structure

- `Endpoints/` — one static class per feature (`BillEndpoints.cs`, `RecipeEndpoints.cs`, etc.) with a `Map*Endpoints()` extension method registered in `Program.cs`
- `Authorization/HouseholdAuthorizationExtensions.cs` — `RequireHouseholdManager()` endpoint filter; gates household config writes to managers
- `Middleware/HouseholdMiddleware.cs` — resolves the active household from the request and populates `IHouseholdContext` (including the user's `Role` in that household)
- `Realtime/` — `SseConnectionManager` + `SseRealtimeNotifier` for Server-Sent Events push notifications
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
- **`HouseholdMiddleware`'s exempt prefixes** (`/api/auth`, `/api/households`, `/api/events`, `/api/shared`, `/swagger`) skip the membership check entirely, so endpoints under them enforce their own access rules in the handler. Adding a prefix to that list needs the same justification. The middleware also costs one DB query per request — don't add further per-request middleware queries.
- **SSE (`/api/events`) broadcasts every event to every connected client, across households.** `SyncEvent` must stay type + optional id — never put entity data (names, amounts) in it. Its auth token rides the query string (EventSource can't set headers): don't log query strings anywhere, and don't reuse the query-token pattern on other endpoints.
- **The checked-in `appsettings.json` secrets are dev-only.** `Jwt:SecretKey`, `Admin:Password`, and the MinIO credentials must be overridden by environment variables in every deployment, and `ImageSettings:ImageProxyKey`/`ImageProxySalt` must be set — unset, `GetImageUrl` emits unsigned `/insecure` imgproxy URLs (an open resizer). Never commit a real secret to any appsettings file.
- **Auth endpoints have no rate limiting or lockout today** — if you touch `/api/auth`, don't add new unauthenticated endpoints that do per-request crypto or DB work without a limiter (see SECURITY-PERFORMANCE-PLAN.md).
