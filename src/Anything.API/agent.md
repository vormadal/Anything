# Anything.API

Thin HTTP layer. Endpoints extract request data and dispatch to `IMediator.Send()` — no business logic here.

## Structure

- `Endpoints/` — one static class per feature (`BillEndpoints.cs`, `RecipeEndpoints.cs`, etc.) with a `Map*Endpoints()` extension method registered in `Program.cs`
- `Middleware/HouseholdMiddleware.cs` — resolves the active household from the request and populates `IHouseholdContext`
- `Realtime/` — `SseConnectionManager` + `SseRealtimeNotifier` for Server-Sent Events push notifications
- `Program.cs` — app bootstrap: DI registration, middleware pipeline, endpoint mapping
- `DependencyInjection.cs` — extension methods for wiring up API-layer services

## Key Patterns

- Every endpoint group uses `MapGroup("/api/<entity>")` for consistent route prefixing.
- Validation is applied via `.WithParameterValidation()` from MinimalApis.Extensions — no manual model-state checks.
- Auth endpoints use JWT bearer; household-scoped endpoints go through `HouseholdMiddleware`.
- SSE realtime updates are pushed via `ISseRealtimeNotifier` injected into handlers — no polling.
- `appsettings.Production.json` overrides connection strings and JWT settings; Aspire injects those in dev via `AppHost`.
