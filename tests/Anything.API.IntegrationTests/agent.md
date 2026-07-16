# Anything.API.IntegrationTests

End-to-end integration tests that spin up the real API against a containerised PostgreSQL instance.

## Structure

- `*EndpointTests.cs` — one test class per feature (13 files); covers CRUD happy paths and error cases
- `Infrastructure/`
  - `AnythingApiFactory.cs` — `WebApplicationFactory` override; configures the test database
  - `IntegrationTestBase.cs` — base class providing the typed API client and auth helpers
  - `IntegrationTestCollection.cs` — xUnit collection fixture tying tests to the shared container
  - `PostgresContainerFixture.cs` — starts/stops the Testcontainers PostgreSQL instance
- `ApiClient/` — Kiota-generated typed HTTP client (auto-generated; do not edit manually)
  - Regenerate with `npm run generate:api` after API changes (requires the API to be running)

## Key Patterns

- All tests inherit `IntegrationTestBase` — use its `Client` property for API calls.
- The Postgres container is shared across the collection (one container per test run, not per test).
- Tests register/login a user via `AuthEndpoints` to get a bearer token before calling protected routes.
- Use unique names per test (e.g., `$"Test {Guid.NewGuid()}"`) to avoid state bleed between tests.
- Requires Docker to run: `dotnet test tests/Anything.API.IntegrationTests/...`
- Shopping-list recommendations are list-scoped via a nullable `ShoppingListId` (`null` = shared across all lists). `ShoppingListRecommendationEndpointTests` covers the list/shared/uncategorized/visibility filters on `GET /all`, per-list vs shared seeding, and `DELETE /by-list/{id}` (manager gating + foreign-list rejection).
