# Security & Performance Remediation Plan

Issues found in the 2026-08 security/performance review, ordered by priority.
Each item is scoped to be one PR. The rules that prevent regressions live in the
per-directory `agent.md` files; this file tracks the one-time fixes. Delete items
as they land (and delete this file when it's empty).

## P1 — implemented in code; deployment prerequisites remain

All five P1 items are implemented (PR #719). **Before that PR's changes are deployed,
CapRover env vars must be updated — two of the changes make the API refuse to start
or break thumbnails if the deployment still runs on defaults:**

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

What landed in code: startup fail-fast on dev-default secrets; content-type allowlists
on all six upload endpoints (`UploadValidation`, mirrored by the frontend's
`uploadAccept.ts`); the SSRF guard on recipe URL fetches (`OutboundUrlGuard` +
per-hop redirect validation + 5 MB response cap); the `UseS3Source` private-bucket
mode (Aspire dev runs it already); and a per-client-IP rate limit on
login/refresh/register (`RateLimiting:Auth` config, forwarded-headers trust for the
nginx chain). Not covered by an automated test: the rate limiter itself (the
integration suite raises its limit to stay unaffected) — verify with a burst of bad
logins after deploying.

## P2 — Security hardening

### 6. Hash refresh tokens at rest
`RefreshToken.Token` is stored and looked up in plaintext — a DB leak yields live
sessions. Store SHA-256(token), look up by hash (`Login.cs`, `RefreshToken.cs`);
existing rows can be invalidated (users re-log-in). Also delete expired/revoked rows
on rotation so the table doesn't grow forever.

### 7. Security headers at nginx
Add to `nginx.conf`: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, a `Content-Security-Policy` with `frame-ancestors 'self'`,
and (TLS terminates at CapRover) `Strict-Transport-Security` on the HTTPS host.

### 8. Keep the SSE token out of access logs
`/api/events?token=<JWT>` puts a live access token in nginx/proxy access logs
(the default `combined` format logs the full request line).

- Short term: a nginx `log_format` that drops `$args` for `/api/events`.
- Better: a one-time short-lived connect ticket (POST issues it, EventSource passes it)
  instead of the real access token in the query string.

### 9. CSPRNG for invite/share tokens
`CreateInvite`/`CreateRecipeShareToken` use `Guid.NewGuid()`. It's random in practice
but not contractually a CSPRNG — switch to the `RandomNumberGenerator` pattern
`TokenService.GenerateRefreshToken` already uses. Low risk, low effort.

## P3 — Performance

### 10. Projection / no-tracking sweep on read handlers
Nothing in the solution uses `AsNoTracking`, and several read handlers materialize
tracked entities they never modify. Sweep list/get handlers to `.Select()` into their
response records (skips tracking and trims the SELECT for free); where an entity type
is genuinely returned, add `.AsNoTracking()`. The agent.md rule keeps new handlers honest.

### 11. Stream file downloads instead of buffering
`MinioStorageService.GetFileStream` copies the whole object (up to 10 MB) into a
`MemoryStream` per download request. Stream through instead (pipe the Minio callback
stream to the response), or — once item 4 lands — redirect to a presigned URL and skip
the API hop entirely.

### 12. Household-scoped SSE broadcast
`SseConnectionManager.Broadcast` fans every event out to every client in every
household: a cross-household activity signal and a refetch stampede (each event makes
all clients invalidate and refetch). Register connections keyed by household (resolve
membership at connect time — `/api/events` is middleware-exempt, so check it in the
endpoint) and broadcast per household.

### 13. Cheap wins to verify, then close
- Composite indexes on `(HouseholdId, DeletedOn)` for the hottest tables — check the
  `Configurations/` classes; add only where the query plans show seq scans.
- `HouseholdMiddleware`'s per-request membership query: fine while it's one indexed
  lookup; consider a short-TTL cache only if profiling shows it matters.
