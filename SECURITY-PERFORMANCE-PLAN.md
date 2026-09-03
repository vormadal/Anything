# Security & Performance Remediation Plan

Issues found in the 2026-08 security/performance review, ordered by priority.
Each item is scoped to be one PR. The rules that prevent regressions live in the
per-directory `agent.md` files; this file tracks the one-time fixes. Delete items
as they land (and delete this file when it's empty).

## P1 — implemented (PR #719, merged)

All five P1 items are implemented and merged. **Before that PR's changes reach a live
deployment, CapRover env vars must be updated** — two of the changes make the API
refuse to start or break thumbnails if the deployment still runs on defaults:

1. **Set real secrets on the API app** (`ValidateProductionSecrets` in `Program.cs`
   fails startup otherwise): `Jwt__SecretKey`, `Admin__Password`,
   `ImageSettings__SecretKey` (MinIO), and `ImageSettings__ImageProxyKey`/
   `ImageSettings__ImageProxySalt` (hex; imgproxy must get the same values as
   `IMGPROXY_KEY`/`IMGPROXY_SALT`).
2. **Give imgproxy S3 credentials and flip the bucket private**: on the imgproxy app
   set `IMGPROXY_USE_S3=true`, `IMGPROXY_S3_ENDPOINT` (the MinIO URL), `AWS_ACCESS_KEY_ID`/
   `AWS_SECRET_ACCESS_KEY`/`AWS_REGION`; on the API app set
   `ImageSettings__UseS3Source=true`. Until both are set, leave `UseS3Source` unset —
   the legacy public-read path keeps working. On its first start with the flag on, the
   API revokes the bucket's anonymous-read policy itself.

What landed: startup fail-fast on dev-default secrets; content-type allowlists on all
six upload endpoints; the SSRF guard on recipe URL fetches; the `UseS3Source`
private-bucket mode; a per-client-IP rate limit on login/refresh/register.

## P2 — Security hardening — implemented

### 6. Hash refresh tokens at rest — done
`RefreshToken.Token` now stores `ITokenService.HashRefreshToken(rawToken)` (SHA-256),
never the raw token — `Login`/`RefreshToken` handlers look up by hash. Rotation
(`RefreshTokenHandler`) also sweeps the calling user's other revoked/expired rows
(`PruneDeadTokens`), so the table doesn't grow forever. Existing plaintext rows stop
matching (users on them re-log-in) — expected, one-time.

### 7. Security headers at nginx — done
`nginx.conf`'s `server` block now sends `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`,
`Content-Security-Policy: frame-ancestors 'self'`, and `Strict-Transport-Security`
(`max-age=31536000; includeSubDomains`) on every response, `always` (error responses
too). HSTS is correct to set here even though this internal nginx only speaks plain
HTTP to CapRover's edge proxy — the browser only cares about the client-facing
(HTTPS) connection.

### 8. Keep the SSE token out of access logs — done
`/api/events` no longer accepts a JWT (or anything else) via query string.
`POST /api/events/ticket` (normal header-authenticated request, carrying the usual
`X-Household-Id`) mints a short-lived (30s), single-use ticket (`SseTicketService`);
the `EventSource` connects with `?ticket=...` instead. See
`src/Anything.API/agent.md`. **Frontend piece still open**: `useRealtimeSync.ts`
needs to call the new ticket endpoint before opening the `EventSource` — blocked on
`update-api-client` regenerating the Kiota client for the new endpoint (can't hand-add
a client call per this repo's rules). Once the client has
`apiClient.api.events.ticket.post()`, swap `useRealtimeSync.ts`'s direct
`localStorage` token read for a ticket fetch through it.

### 9. CSPRNG for invite/share tokens — done
`CreateInvite`/`CreateRecipeShareToken` use the new `SecureTokenGenerator.GenerateHexToken()`
(`RandomNumberGenerator`, 256-bit) instead of `Guid.NewGuid()`.

## P3 — Performance — implemented

### 10. Projection / no-tracking sweep — done
Every handler under a `Queries/` folder now opens its query chain with
`.Query().AsNoTracking()` (58 handler files + `SearchIndexService`), confirmed
behavior-preserving: no `Queries/` handler saves, and none use `.Include()` (this
codebase joins in C#, not via EF navigation), so there's no risk of the
tracked-vs-no-tracking identity-map duplication that `Include`+no-tracking can cause
elsewhere. `AsNoTracking()` is also a documented no-op against the unit tests'
in-memory `IQueryable` mock, so no test changes were needed for the sweep itself.
Residual, smaller gap: `IRepository<T>.GetById` (`DbSet.FindAsync`) still always
tracks — untouched, since making it no-tracking needs a repository interface change
across many call sites, a larger and riskier change than this pass.

### 11. Stream file downloads instead of buffering — done
`MinioStorageService.GetFileStream` now bridges Minio's callback-based
`GetObjectAsync` through a `System.IO.Pipelines.Pipe` (64 KB pause/resume threshold)
instead of copying the whole object into a `MemoryStream` first — real backpressure,
first byte reaches the client before the rest of the object has downloaded.

### 12. Household-scoped SSE broadcast — done
`SseConnectionManager` registers each connection under the household id resolved at
ticket-issuance time (item 8) and only broadcasts to that household's connections.
`IRealtimeNotifier.Notify` takes an explicit `householdId` parameter now (all 14 call
sites in `Features/ShoppingLists/Commands/` pass `householdContext.HouseholdId`).

### 13. Cheap wins — investigated, no action needed
- **Composite `(HouseholdId, DeletedOn)` indexes**: checked. Every `HouseholdId` FK
  already has an index — EF Core creates one by convention for every FK property, and
  the `20260417220816_AddHouseholdIdToEntities` migration confirms `IX_<Table>_HouseholdId`
  exists on all of them. Adding a compound index on top would need real `EXPLAIN
  ANALYZE` evidence of a seq scan to justify the extra write-path cost on every one of
  ~15 tables — no such evidence available in this environment, so deliberately not
  done speculatively.
- **`HouseholdMiddleware`'s per-request query**: already optimal — `HouseholdMember`
  has a unique compound index on exactly `(HouseholdId, UserId)`, the middleware's own
  filter. No caching needed.
