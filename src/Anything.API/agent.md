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
