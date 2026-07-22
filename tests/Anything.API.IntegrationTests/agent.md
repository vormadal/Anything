# Anything.API.IntegrationTests

End-to-end integration tests that spin up the real API against a containerised PostgreSQL instance.

## Structure

- `*EndpointTests.cs` — one test class per feature (14 files); covers CRUD happy paths and error cases
- `Infrastructure/`
  - `AnythingApiFactory.cs` — `WebApplicationFactory` override; configures the test database
  - `IntegrationTestBase.cs` — base class providing the typed API client and auth helpers
  - `IntegrationTestCollection.cs` — xUnit collection fixture tying tests to the shared container
  - `PostgresContainerFixture.cs` — starts/stops the Testcontainers PostgreSQL instance
- `ApiClient/` — Kiota-generated typed HTTP client (auto-generated; do not edit manually)
  - Regenerate with `npm run generate:api` after API changes (requires the API to be running)
  - **Unlike `anything-frontend/src/lib/api-client/`, there is no CI workflow that auto-regenerates this one.** A newly added endpoint has no typed `Client.Api.*` builder until someone runs the regeneration locally (`dotnet`/API required — not possible from a web session). Until then, call the new endpoint via the base class's plain `HttpClient` (`GetAuthenticatedHttpClient`/`HttpClient` + `PostAsJsonAsync`/`ReadFromJsonAsync` with a private local record matching the response shape) exactly like `HomePreferenceEndpointTests.cs` and `SearchEndpointTests.cs` do throughout, rather than blocking the tests on a regeneration step.

## Key Patterns

- All tests inherit `IntegrationTestBase` — use its `Client` property for API calls (or plain `HttpClient` for endpoints not yet in the generated `ApiClient/`, see above).
- The Postgres container is shared across the collection (one container per test run, not per test).
- Tests register/login a user via `AuthEndpoints` to get a bearer token before calling protected routes.
- Use unique names per test (e.g., `$"Test {Guid.NewGuid()}"`) to avoid state bleed between tests.
- Requires Docker to run: `dotnet test tests/Anything.API.IntegrationTests/...`
- Shopping-list recommendations are list-scoped via a nullable `ShoppingListId` (`null` = shared; scoping/seeding semantics in `src/Anything.Application/agent.md`). `ShoppingListRecommendationEndpointTests` covers the list/shared/uncategorized/visibility filters on `GET /all`, per-list vs shared seeding, and `DELETE /by-list/{id}` (manager gating + foreign-list rejection).
- **Creating a non-admin/non-manager test user**: invite (`POST /api/auth/invites`, optionally with `householdId` to auto-add them as a `Member`) → register with the invite token → log in to get their own access token. See `ShoppingListRecommendationEndpointTests.GetUserHttpClientAsync` (no household — for global-role checks) and `SearchEndpointTests.CreateHouseholdMemberClientAsync` (with `householdId` — for `RequireHouseholdManager()` checks, so the 403 is confirmed to come from the manager gate and not from `HouseholdMiddleware` rejecting a non-member). Registration does not return a token — a separate login call is required.
- **Real-database verification for Postgres-specific query features** (full-text search, trigram similarity, any `EF.Property`/computed-column/raw-SQL translation): a translation mistake only surfaces when the query actually executes, so it can't be caught by a unit test mocking `IRepository<T>`, nor by `dotnet build`. `SearchEndpointTests.cs` is the precedent — it verifies substring matching, typo-tolerant (pg_trgm) matching, soft-delete exclusion, and household scoping against the real Testcontainers Postgres, specifically because the tsvector generated-column + `EF.Property<NpgsqlTsVector>` query in `Anything.Database/Services/SearchIndexService.cs` couldn't be exercised any other way in a web session with no local `dotnet`.
