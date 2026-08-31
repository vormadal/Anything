# Security & Performance Remediation Plan

Issues found in the 2026-08 security/performance review, ordered by priority.
Each item is scoped to be one PR. The rules that prevent regressions live in the
per-directory `agent.md` files; this file tracks the one-time fixes. Delete items
as they land (and delete this file when it's empty).

## P1 — Security, fix first

### 1. Fail fast on dev-default secrets in Production
`appsettings.json` ships a dev JWT secret (`your-secret-key-...`), a dev admin
password (`Admin123!`), and dev MinIO credentials; when `ImageProxyKey`/`ImageProxySalt`
are unset, `MinioStorageService.GetImageUrl` silently emits unsigned `/insecure`
imgproxy URLs (an open image resizer anyone can point at any internal source URL).

- In `Program.cs` (or an options validator), when `IsProduction()`: refuse to start if
  `Jwt:SecretKey` equals the checked-in default, `Admin:Password` equals the default,
  or `ImageProxyKey`/`ImageProxySalt` are empty.
- Files: `src/Anything.API/Program.cs`, `src/Anything.Application/Configuration/JwtSettings.cs`, `ImageSettings.cs`.

### 2. Content-type allowlists on the remaining upload endpoints
Only `UploadNoteImageHandler` validates content type. The five other upload handlers
(inventory item/box/storage-unit attachments, bill attachments, recipe images) store the
client-declared `ContentType` unchecked into a **public-read** bucket — e.g. `text/html`
served from the storage origin.

- Extract the media-type allowlist check from `UploadNoteImageHandler` into
  `Anything.Application.Common.UploadValidation` (next to `ValidateFileSize`).
- Recipe/note images: `image/png|jpeg|webp|gif`. Attachments: images + `application/pdf`
  (extend deliberately if users need more).
- Files: `src/Anything.Application/Features/{Inventory,Bills,Recipes}/Commands/Upload*.cs`, `Common/UploadValidation.cs`.

### 3. SSRF guard on `RecipeParserService.ParseFromUrl`
`httpClient.GetStringAsync(url)` fetches any user-supplied URL from inside the
container network (where `minio:9000`, Postgres, etc. live), with no scheme check,
size cap, or redirect bound.

- Allow only `http`/`https`; resolve the host and reject loopback/private/link-local
  ranges (re-check after redirects, or disable auto-redirect and validate each hop);
  cap the response body (e.g. 5 MB) via `MaxResponseContentBufferSize`; keep a short timeout.
- Files: `src/Anything.Application/Services/RecipeParserService.cs`, its `HttpClient`
  registration in `DependencyInjection.cs`.

### 4. Make the storage bucket private
`MinioStorageService.Initialize` sets anonymous `s3:GetObject` on the whole bucket, so
every receipt, warranty document, and photo is world-readable to anyone with the URL
(GUID keys are unguessable, but URLs leak — imgproxy URLs are shown in the UI, browser
history, etc.).

- Drop the public-read policy. Authenticated downloads already stream through the API.
- imgproxy needs source access for thumbnails: configure it with S3 credentials
  (`IMGPROXY_USE_S3`) instead of relying on anonymous bucket reads.
- Files: `src/Anything.Application/Services/MinioStorageService.cs`, imgproxy deployment config.

### 5. Rate-limit the auth endpoints
`/api/auth/login`, `/refresh`, and `/register` are anonymous, unthrottled, and do BCrypt
work per request — open to credential stuffing and cheap CPU DoS.

- Add ASP.NET `AddRateLimiter` with a per-IP fixed window on the auth group
  (behind nginx, key on `X-Real-IP`/`X-Forwarded-For`).
- Files: `src/Anything.API/Program.cs`, `Endpoints/AuthEndpoints.cs`, `nginx.conf` (real IP).

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
