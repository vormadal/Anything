# anything-frontend/src/lib

Shared utilities and the generated API client.

## Structure

- `apiClient.ts` — configures and exports the Kiota `apiClient` instance; also re-exports `ApiError` (use for catching HTTP errors with `err.responseStatusCode`)
- `api-client/` — **auto-generated** Kiota client from the backend OpenAPI spec; do not edit manually
  - Regenerate with `npm run generate:api` (API must be running)
  - Import types from `@/lib/api-client/models/index`
- `foodPlanUtils.ts` — date/slot helpers for the food plan calendar
- `householdUtils.ts` — household membership/role helpers
- `roles.ts` — role name constants (`HouseholdRoles`, `UserRoles`)
- `utils.ts` — generic helpers (class merging via `cn()`, etc.)

## Key Patterns

- Always import `apiClient` from `@/lib/apiClient` (the configured instance), not from `api-client/` directly.
- Use the fluent builder API: `apiClient.api.somethings.get()`, `.post(body)`, `.byId(id).put(body)`, `.byId(id).delete()`.
- Catch `ApiError` (re-exported from `apiClient.ts`) to handle HTTP error responses — inspect `err.responseStatusCode`.
- The base URL defaults to `http://localhost:5238` and is overridden by `NEXT_PUBLIC_API_URL` in production.
- Never cast API response types to `any`; use the generated model types from `api-client/models/index`.
