# CLAUDE.md

## Project Overview

**Anything** is a monorepo for creating flexible list-based items ("Somethings") — checklists, grocery lists, inventories, expense trackers, etc. It has a .NET 10 backend API and a Next.js 15 frontend.

**If `dotnet`, `ef`, `aspire` is not available**:
- Do NOT attempt workarounds (manual IL, csc, msbuild invocations, etc.)
- STOP and inform the user that the tool is missing and another approach is required

## Directory Documentation

Each major directory has an `agent.md` with structure notes and key patterns:

- [`src/Anything.API/agent.md`](src/Anything.API/agent.md)
- [`src/Anything.Application/agent.md`](src/Anything.Application/agent.md)
- [`src/Anything.Core/agent.md`](src/Anything.Core/agent.md)
- [`src/Anything.Database/agent.md`](src/Anything.Database/agent.md)
- [`src/Anything.Contracts/agent.md`](src/Anything.Contracts/agent.md)
- [`tests/Anything.API.IntegrationTests/agent.md`](tests/Anything.API.IntegrationTests/agent.md)
- [`tests/Anything.Application.UnitTests/agent.md`](tests/Anything.Application.UnitTests/agent.md)
- [`tests/Anything.ArchitectureTests/agent.md`](tests/Anything.ArchitectureTests/agent.md)
- [`anything-frontend/src/app/agent.md`](anything-frontend/src/app/agent.md)
- [`anything-frontend/src/components/agent.md`](anything-frontend/src/components/agent.md)
- [`anything-frontend/src/hooks/agent.md`](anything-frontend/src/hooks/agent.md)
- [`anything-frontend/src/lib/agent.md`](anything-frontend/src/lib/agent.md)

## Repository Structure

```
Anything/
├── src/                              # Backend (.NET)
│   ├── Anything.API/                 # Minimal API — thin endpoint dispatchers
│   ├── Anything.Application/         # Application layer — commands, queries, handlers, services
│   ├── Anything.Core/                # Domain layer — entities, interfaces (no dependencies)
│   ├── Anything.Contracts/           # API contracts — request/response DTOs with validation
│   ├── Anything.Database/            # Infrastructure — EF Core DbContext, repositories, migrations
│   ├── Anything.Mediator/            # Simple mediator pattern (IRequest, IRequestHandler, IMediator)
│   ├── Anything.AppHost/            # Aspire orchestrator (manages PostgreSQL)
│   └── Anything.ServiceDefaults/    # Shared service config (telemetry, health checks)
├── tests/
│   └── Anything.API.IntegrationTests/ # Integration tests (xUnit, Testcontainers, Kiota client)
├── anything-frontend/               # Frontend (Next.js)
│   └── src/
│       ├── app/                     # Next.js App Router pages and layouts
│       ├── components/ui/           # Shadcn UI components
│       ├── hooks/                   # React Query custom hooks (API calls)
│       ├── context/                 # React context providers (QueryProvider)
│       └── lib/                     # Utilities and generated API client
└── Anything.slnx                    # .NET solution file
```

## Tech Stack

**Backend:** .NET 10, Minimal API, Entity Framework Core, PostgreSQL, Aspire, Swashbuckle (Swagger), Scrutor (DI scanning)
**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn UI, React Query (TanStack), Kiota (API client generation)

## Common Commands

```bash
aspire run              # Run with Aspire (starts PostgreSQL, Anything.API and anything-frontend)
```
### Backend

```bash
dotnet build                                                                                # Build solution
dotnet test tests/Anything.API.IntegrationTests/Anything.API.IntegrationTests.csproj       # Run integration tests (requires Docker)
dotnet ef migrations add <Name> --project src/Anything.Database --startup-project src/Anything.API  # Create migration
dotnet ef database update --project src/Anything.Database --startup-project src/Anything.API        # Apply migrations
```

### Frontend

```bash
cd anything-frontend
npm install          # Install dependencies
npm run build        # Production build - always run after finishing work
npm run lint         # Run ESLint - always run after finishing work
npm run test         # Run tests - always run after finishing work
npm run test:coverage # Run tests with coverage report
npm run generate:api # Generate API client from Swagger (API must be running)
npm run test:e2e:visual          # Run visual regression tests
npm run test:e2e:visual:update   # Regenerate baseline screenshots — REQUIRED after any new/changed UI, not just "intentional" restyling; see .claude/rules/e2e.md
```

## Key Patterns & Conventions

### Backend

- **Clean architecture:** Domain (Core), Application, Infrastructure (Database), API layers with strict dependency rules.
- **Mediator pattern:** Endpoints dispatch to command/query handlers via `IMediator.Send()`. Each handler is a single class in `Features/<Area>/Commands/` or `Features/<Area>/Queries/`.
- **Thin endpoints:** Each entity gets its own static class in `Endpoints/` with a `Map*Endpoints()` extension method. Endpoints only extract request data and dispatch to the mediator.
- **Repository + Unit of Work:** All data access goes through `IRepository<T>` and `IUnitOfWork`. Complex queries use `repository.Query()` which returns `IQueryable<T>`.
- **Soft deletes:** Entities use a `DeletedOn` nullable DateTime field. All queries filter `WHERE DeletedOn == null`.
- **Timestamps:** Entities use `CreatedOn` (set on creation), `ModifiedOn` (set on update), `DeletedOn` (set on soft delete). All use `DateTime.UtcNow`.
- **Request/response records:** Use C# `record` types for request DTOs in `Anything.Contracts`, organized by feature area.
- **Route grouping:** Endpoints use `MapGroup("/api/<entity>")` for consistent prefixing.
- **Validation:** Data annotations on DTOs in Contracts. `WithParameterValidation()` from MinimalApis.Extensions.
- **DI registration:** `builder.AddDatabase()` + `builder.Services.AddRepositories()` + `builder.Services.AddApplication(configuration)` in Program.cs.
- **Entity configurations:** Each entity has a separate `IEntityTypeConfiguration<T>` class in `Anything.Database/Configurations/`.
- **Handler return types:** Handlers that return entities use the entity type directly (endpoint wraps in `Results.Created()`). Handlers that need HTTP semantics (update, delete, validation) return `IResult`.

### Frontend

- **Path alias:** `@/*` maps to `./src/*` in imports.
- **API client:** Use `apiClient` from `@/lib/apiClient` for all API calls — **never** raw `fetch` or `apiFetch`. It's a Kiota-generated typed client, auto-regenerated by the `update-api-client` workflow. Full usage (fluent builder, `ApiError` handling, base URL) and the "endpoint not in the client yet" workflow live in [`anything-frontend/src/lib/agent.md`](anything-frontend/src/lib/agent.md).
- **React Query hooks:** Each entity gets a dedicated hook file in `src/hooks/` (e.g. `useSomethings`, `useCreateSomething`); mutations invalidate related query keys on success. See [`anything-frontend/src/hooks/agent.md`](anything-frontend/src/hooks/agent.md).
- **Components:** Use Shadcn UI components in `src/components/ui/`, added manually from the Shadcn docs. Components using hooks/browser APIs are marked `"use client"`.
- **Toasts (sonner) — only for outcomes not otherwise on screen.** Before any `toast.success`, ask: *does the screen already show the outcome (inline row/value update, dialog close, or navigation to a page reflecting it)?* If yes, **no toast** — React Query invalidation already re-renders the change. Toast only for **errors**, **out-of-band success** (clipboard, a different surface, share links, import/export, whole-form saves with no visible delta), and **destructive/terminal actions that navigate away**. **Form validation is never a toast** — use an inline field error and keep native `required`. Full rules in [`anything-frontend/src/components/agent.md`](anything-frontend/src/components/agent.md).
- **Testing:** Jest + React Testing Library for behavioural/unit tests, colocated `.test.tsx`/`.test.ts`; render via `renderWithClient` from `@/__tests__/utils/test-utils`. Do NOT use `.toMatchSnapshot()` — visual assertions go through Playwright.
- **Every UI change needs a Playwright visual snapshot — a hard requirement, not follow-up polish.** Adding or changing a component, page, dialog, or a distinct visual state (empty/error/loaded, a new mode, a new indicator) without a corresponding snapshot in `e2e/visual.spec.ts` means the change is incomplete, even if `npm run build`/`lint`/`test` all pass — those don't cover this. Full authoring rules (mocking, gotchas, why you can't run `test:e2e:visual:update` in a web session) live in [`.claude/rules/e2e.md`](.claude/rules/e2e.md) — read it before finishing any frontend UI change.

## API Endpoints

Storage / inventory — three household-scoped entities under
`/api/inventory-storage-units` (a place: basement room, summerhouse, under the
bed), `/api/inventory-boxes` (a numbered box, optionally in a place, plus an
optional `Label`/`Description`) and `/api/inventory-items` (optionally in a box
and/or a place, plus optional metadata: `Quantity`, `Brand`, `Model`,
`SerialNumber`, `PurchasedOn`, `PurchasePrice`, `WarrantyExpiresOn`, `Notes`).
All five verbs each, all `RequireAuthorization()`. Two behaviours the frontend
must encode: deleting a place returns **409** while it still holds boxes or
items, and deleting a box keeps its items but clears their `BoxId`.
`CreateInventoryItem`/`UpdateInventoryItem` derive `StorageUnitId` from the
chosen box server-side whenever `BoxId` is set — the box's own place always
wins over whatever place the caller sent, so an item can never persist a
contradiction between the two. All three entities now return
`Anything.Contracts.Inventory` response records (`InventoryItemResponse` /
`InventoryItemSummaryResponse` for the list endpoint / `InventoryBoxResponse` /
`InventoryStorageUnitResponse`) rather than raw EF entities, so responses no
longer include `householdId`/`deletedOn`. Those three list-facing records also
carry a nullable `ThumbnailUrl` — the first photo attachment's thumbnail,
resolved in one extra query by `InventoryThumbnailLookup` so list rows can show
an image without an attachments call per row. It is populated by the list
handlers and (because the box/place records are shared) their by-id handlers,
but never by the create handlers, where a brand-new entity has no attachments.

Per-item **custom fields** (free-form label/value pairs, e.g. for metadata with
no dedicated column) live in `InventoryItemField`, embedded in
`InventoryItemResponse.Fields` on `GET /api/inventory-items/{id}` and replaced
wholesale via `PUT /api/inventory-items/{id}/fields` (simpler than per-field
CRUD — the whole ordered list is sent each time, `SortOrder` following array
order). **Not search-indexed** — see `src/Anything.Database/agent.md`.

**Attachments** (photos/manuals/receipts/warranty docs) live in one shared
`InventoryAttachment` table with three nullable owner FKs (`ItemId`/`BoxId`/
`StorageUnitId`, exactly one set by the handler — never a DB constraint, since
the owner always comes from the route, not the caller), mirroring
`BillAttachment` but reused across all three inventory entities via
`InventoryAttachmentMapping.ToResponse` (shared image/thumbnail-URL
projection). Each of the three entity endpoint groups gets its own
`GET/POST .../attachments`, `GET .../attachments/{id}/download`,
`DELETE .../attachments/{id}`, using `folder: "inventory"` in
`IImageStorageService.Upload`. `Kind` is one of `InventoryAttachmentKinds`
(`Photo`/`Manual`/`Receipt`/`Warranty`/`Other`), validated server-side; photos
get imgproxy thumbnail + full URLs, everything else gets a download URL.

Notes (`/api/notes`) — household-scoped rich-text notes. `GET /` returns
`NoteSummaryResponse` (title + plain-text snippet) and accepts an optional
`?limit=`; `GET /{id}` returns the full `ContentJson` editor document. The body
is a ProseMirror/Tiptap document stored as JSON, with its flattened plain text
derived server-side by `NoteContent.ExtractPlainText` on every write — that
extractor also surfaces a node's `attrs.label`, which is what will keep a future
"reference a recipe/list" node searchable without backend changes. The editor
schema also has an `image` node (`storageKey` + `src`, uploaded via
`POST /api/notes/images` — not scoped to a note id, since a note isn't created
until its first line is finished); the note toolbar's image button and
paste/drop both go through it. `contentJson`'s `StringLength` was raised to
500,000 to make room for longer notes coming from elsewhere. **Import** lives
entirely client-side at `/notes/import`
(`anything-frontend/src/lib/notes/import/`): a `.txt`/`.docx` file is unzipped
and converted to HTML by hand (Word's `document.xml`, `numbering.xml` and
relationships resolved without registering OOXML namespaces — matched by their
literal `w:`-prefixed tag/attribute names, since that's how the browser's
`DOMParser` preserves them), then run through `generateJSON(html,
noteExtensions)` — the same schema the editor itself uses — so an imported
document can never contain something the editor can't open. A `.md`/`.markdown`
file takes the same route via `marked` (`breaks: true`, so a note's line breaks
survive as `<br>` and every remaining newline sits strictly between block tags),
followed by a `DOMParser` pass that degrades what the schema has no node for:
GFM task items become `☐`/`☑` text, and image references — markdown embeds no
bytes — are kept only when absolute, with relative paths dropped and warned
about. Tables are **not** degraded any more (see the table note below). YAML front matter is
stripped, its `title` preferred over the filename. The three-stage pipeline, and
what adding a fourth format takes, are documented in
[`anything-frontend/src/lib/agent.md`](anything-frontend/src/lib/agent.md).

The editor schema also has **tables** (`@tiptap/extension-table`'s `TableKit`,
pinned to the exact version the rest of the `@tiptap/*` stack sits on — its
peers are exact, so a caret range pulls in a second `@tiptap/pm` and two
ProseMirror copies). Column resizing is deliberately off, which does *not* cost
the `div.tableWrapper` element — Tiptap installs its own `TableView` node view
for precisely the non-resizable case, in the read-only renderer too, and
`NOTE_PROSE_CLASSES` scrolls a too-wide table on that wrapper. Both importers
now produce real tables: `docx.ts` walks `w:tr`/`w:tc` (direct children only, so
a nested table isn't double-counted), turning `w:gridSpan` into `colspan` and
`w:vMerge` continuations into the starter cell's `rowspan`, and treating a row
as a header when it declares `w:tblHeader` or — since most Word tables never set
that — when the whole first row is bold; `markdown.ts` simply lets `marked`'s
GFM table markup through. Neither emits `<thead>`: the schema has no node for it
and ProseMirror descends through it anyway.

A note can also **embed one of the household's lists** (`listEmbed`, the schema's
first React node view — `EmbeddedList.tsx`). The document stores only
`attrs: { listId, label }`; the items come from the same
`useShoppingListItems`/`useUpdateShoppingListItem` hooks the `/lists/{id}` page
uses, on the same query keys, so an embed shares that page's cache and inherits
SSE live-sync, optimistic updates and the offline outbox for nothing. Ticking an
item off is the only mutation offered in a note, and because item state never
touches `ContentJson`, it doesn't dirty the note or wake autosave. Two
consequences worth knowing: `label` is the list's name **as of insertion** and is
deliberately never written back (that would be a document edit), so a renamed
list stays searchable under its old name until the note is next edited; and
queries — unlike this app's mutations — keep React Query's default `"online"`
network mode, so offline an embed shows persisted items if the list was opened
before and a fallback message if it wasn't. No backend change was needed for any
of this: `NoteContent.ExtractPlainText` already flattens any node's `attrs.label`.

Bills (`/api/bills`) — household-scoped subscriptions/expenses (`Bill`), each optionally
tracking `BillPriceHistory` (price over time, `EffectiveDate`/optional `EndDate` ranges,
overlap-validated with a 409 on conflict) and `BillAttachment`s (receipts/contracts, the
same shared-table pattern as inventory attachments). `Bill.IsRecurring` drives a single
invariant enforced identically in `CreateBillCommand`/`UpdateBillCommand` and the
frontend's `BillRecurrenceFields`: non-recurring forces `Frequency: None`. A bill's
`CurrentAmount`/`MonthlyEquivalent` (`BillHelpers.ToBillResponse`) and every spend total
(`GetBillSummaryQuery`, the bills-list and home-card totals) are always derived from the
*latest* `BillPriceHistory` entry — there is deliberately no second "amount actually
paid" log alongside it (a `BillAmountEntry` attempt at that was removed: it never fed
these numbers, so it read as a second, disconnected log rather than a genuinely
different concept — see `src/Anything.Core/Entities/BillPriceHistory.cs` and
`anything-frontend/src/components/agent.md`'s "Bills detail page" section before
reintroducing anything like it). `bills/[id]/page.tsx`'s summary card shows a category as
a plain chip (no "Category:" label — the value already reads as one, the way "Auto"/
"Manual" do) rather than in the label/value metadata grid.

All endpoints are under `/api/somethings`:
- `GET /` — List all (non-deleted)
- `GET /{id}` — Get by ID
- `POST /` — Create (body: `{ name }`)
- `PUT /{id}` — Update (body: `{ name }`)
- `DELETE /{id}` — Soft delete

Swagger UI available at `https://localhost:7000/swagger` in development.

## Code Quality (SonarCloud)

SonarCloud runs static analysis on every push to main/develop for both backend (`vormadal_Anything`) and frontend (`vormadal_Anything-frontend`). The language rules to follow live in the path-scoped rule files, which auto-attach when you edit a matching file:

- C# → [`.claude/rules/backend-style.md`](.claude/rules/backend-style.md)
- TypeScript/React → [`.claude/rules/frontend-style.md`](.claude/rules/frontend-style.md)

## Development / Local Config

- CORS is configured for `localhost:3001` (frontend dev server).
- PostgreSQL connection is managed by Aspire when using AppHost, or via `appsettings.Development.json` when running standalone.
- The solution file is `.slnx` format (new XML-based solution format).
- Admin user seeding stays in `Program.cs` to avoid circular dependencies between Database and Application.
- Always run linter, build, and tests before committing changes. For any frontend UI change, that also means adding/updating the Playwright visual snapshot (see Frontend → Key Patterns and [`.claude/rules/e2e.md`](.claude/rules/e2e.md)) — it is not covered by lint/build/Jest.
- **Record expensive learnings.** When a task surfaces a non-obvious gotcha, a tool unavailable in an environment, an automated workflow that handles something for you, or a subtle ordering/dependency constraint, write it down so future sessions don't pay to rediscover it — in this CLAUDE.md for repo-wide or CI/deploy concerns, or the relevant directory [`agent.md`](#directory-documentation) / [`.claude/rules/*.md`](.claude/rules) for layer- or file-type-specific rules.

## CI Automation & Deployment

Three GitHub Actions workflows auto-generate committed artifacts on **non-main** branches. They mirror each other: they run only on non-main branches, skip when the actor is `github-actions[bot]`, commit with `[skip ci]`, and rebase before pushing (so concurrent auto-committers don't race). **Do not hand-edit their outputs** — push the source change and let the workflow regenerate:

- `update-ef-migrations` — generates EF migrations from model changes under `src/Anything.Core/**` / `src/Anything.Database/**` (details: [`src/Anything.Database/agent.md`](src/Anything.Database/agent.md)).
- `update-api-client` — regenerates `anything-frontend/src/lib/api-client/**` from the API surface (`src/Anything.{API,Contracts,Application,Core}/**`; the `kiota` binary is a .NET tool, `Microsoft.OpenApi.Kiota`, not an npm package. Details: [`anything-frontend/src/lib/agent.md`](anything-frontend/src/lib/agent.md)).
- `update-visual-snapshots` — regenerates Playwright baseline PNGs from `src/**`, `public/**`, or `e2e/visual.spec.ts`; the runner needs a production build (`npm run build`) served via `npx next start` (authoring rules: [`.claude/rules/e2e.md`](.claude/rules/e2e.md)).

**Web sessions lack the .NET toolchain** (`dotnet`, `dotnet ef`, `aspire`) — rely on these workflows for migrations/client generation and flag anything needing local verification (see the top-of-file note).

Non-obvious gotchas:

- **`update-visual-snapshots` was silently missing the rebase-before-push step its sibling workflows have, and could lose an entire regeneration run to it.** `update-ef-migrations` and `update-api-client` both `git pull --rebase --autostash origin <branch>` before their final `git push`; `update-visual-snapshots` pushed straight after committing. When it raced another bot's commit (e.g. `update-ef-migrations` landing a migration seconds earlier), the push was rejected outright (`! [rejected] ... (fetch first)`) and the job exited non-zero — the check shows "failure" on GitHub even though all 129 visual tests actually passed and the regenerated PNGs were committed *locally* in that job's throwaway checkout. Those regenerated baselines are gone; nothing else re-attempts the push. Fixed by adding the same `git pull --rebase --autostash` line the other two already had. If this workflow's check ever fails with a rejected-push error in its logs (not a test failure), the fix is to re-trigger it (a small push touching one of its trigger paths) rather than debug the test run — the tests already passed.
- **Making an entity `ISearchable` takes more than implementing the interface, despite what its doc comment says.** The `SearchIndexInterceptor` does keep the entity's `SearchDocument` in sync automatically, but two things still have to be done by hand, and both fail silently or late:
  1. **Add the entity to both handlers in `Features/Search/Commands/RebuildSearchIndex.cs`.** The rebuild ends by deleting every `SearchDocument` whose `(EntityType, EntityId)` isn't in the live set it just gathered — so a searchable type the rebuild doesn't know about isn't merely skipped, it gets **wiped from the index** the first time any admin or household manager clicks "rebuild", and only comes back as each row is next edited.
  2. **Keep `SearchContent` within `SearchDocumentLimits.MaxContentLength` (5000).** The interceptor writes the index row in a *second* `SaveChangesAsync` that runs after the user's own write has already committed, so an overlong projection throws on an otherwise-successful save. Entities with unbounded bodies must truncate — see `Note.SearchContent`.
- **A shared helper under `Anything.Application.Features` must not be named `*Query`, `*Command` or `*Handler`.** `CqrsPatternTests` and `NamingConventionTests` assert that *every* type in that namespace with one of those suffixes implements `IRequest`/`IRequestHandler`, so a plain static helper called e.g. `InventoryThumbnailQuery` fails the architecture tests with nothing wrong in the code itself. Name it for what it does (`InventoryThumbnailLookup`, `*Mapping`).
- **Filter a nullable FK with a `List<int?>`, not `.Value`.** `ids.Contains(a.ItemId)` where `ids` is `List<int?>` translates to a plain `= ANY(@ids)`; `ids.Contains(a.ItemId.Value)` leans on EF's nullable unwrapping and can throw at translation time. Nothing local catches this — the unit tests' `AsAsyncQueryable` provider is LINQ-to-objects and executes untranslatable expressions happily, and `dotnet build` has no opinion. Same class of trap as the raw-SQL translations `SearchEndpointTests` exists to cover.
- **Adding a constructor parameter to a query handler breaks its unit tests at compile time**, since `InventoryHandlerTests` and friends construct handlers positionally. A repository substitute also needs `.Query()` stubbed (`Substitute.For<IRepository<T>>()` returns null otherwise, and `ToListAsync` NREs) — `InventoryTestDoubles` in `InventoryHandlerTests.cs` is the shared factory for that.
- **An ESM-only npm package breaks Jest, and `transformIgnorePatterns` can't fix it — add it to `transpilePackages` in `next.config.ts`.** Packages shipping only ESM (`marked`, `@microsoft/kiota-abstractions`) fail with `SyntaxError: Unexpected token 'export'` in Jest, because next/jest **hardcodes** `/node_modules/` as the first ignore pattern and only *appends* a custom `transformIgnorePatterns` (see `next/dist/build/jest/jest.js`) — a `/node_modules/(?!(pkg)/)` override in `jest.config.mjs` is silently outranked. Listing the package in `transpilePackages` is what makes next/jest emit `/node_modules/(?!.pnpm)(?!(pkg)/)` instead. `npm run build` passes either way, so only the Jest run catches it.
- **Adding a key to `HomeCardKeys.All` breaks `HomePreferenceEndpointTests`**, which asserts the exact default card list and sort orders. Update it in the same change; the frontend's `DEFAULT_HOME_CARD_ORDER` in `anything-frontend/src/app/HomeCards.tsx` mirrors the same list and needs the matching entry.
- **Model-changing pushes break `update-api-client` on the first push — this is expected.** When a push adds/changes an entity, `update-ef-migrations` and `update-api-client` run in parallel on the *same* pre-migration commit. `update-api-client` boots the API, whose startup `MigrateAsync` escalates `PendingModelChangesWarning` to a fatal error because the migration doesn't exist yet, so Swagger never comes up and Kiota generation times out (exit 124). `update-ef-migrations` meanwhile commits the migration. To regenerate the client you must re-trigger `update-api-client` on a commit that *already contains* the migration — and it only triggers on `src/Anything.{API,Contracts,Application,Core}/**` (NOT `src/Anything.Database/**`, where migrations live). Fix: after the migration lands, make a small backend-path change (e.g. XML-doc the new contracts) in your next push, then pull/rebase the regenerated client before validating the frontend.
- **Snapshot bot `[skip ci]` commits don't re-trigger PR checks — and the sync commit must itself touch a CI trigger path, or it re-triggers nothing.** The PR's `Visual Snapshot Tests` check does NOT rerun on the baseline-containing commit — the PR stays red with the pre-baseline failure as its latest check. `frontend-ci.yml`/`backend-ci.yml` are `paths:`-filtered the same way the bot workflows are (`anything-frontend/**` / `src/**`+`tests/**`, respectively) — they are **not** unconditional `pull_request` triggers. A sync commit that only touches something outside both filters (e.g. root `CLAUDE.md` alone) produces **zero** check runs on that SHA (`gh`/API: `get_check_runs` returns `total_count: 0`, combined status `state: "pending"` with `total_count: 0`) — it looks like "still waiting on Actions" but is actually "never asked to run": verify via `pull_request_read get_status`/`get_check_runs` before assuming a delay. Fix: make the sync commit touch a real, genuinely-useful file under `anything-frontend/**` (re-triggers Frontend CI, including Visual Snapshot Tests, against the new baselines) and, if Backend CI also needs to show green on the exact tip, one under `src/**` too — both in the *same* commit if both are needed.
- **Kiota's TypeScript generation doesn't delete files for endpoints that no longer exist — pass `--clean-output`.** Removing a backend endpoint (e.g. an entity's whole route group) and letting `update-api-client` regenerate the client leaves the old endpoint's generated folder behind under `anything-frontend/src/lib/api-client/api/**` (nothing imports it, so lint/build/tests all stay green — it's silent, orphaned dead code, easy to miss since `git status` on the regen commit only shows additions/modifications, not the deletion that should have happened). `kiota generate` has a `--clean-output` flag that wipes the output directory before writing, so a subsequent regeneration removes what's no longer in the spec; add it to `generate:api` in `anything-frontend/package.json` once and every future removal cleans up after itself. Turning it on for the first time surfaced a much older backlog than expected — 18 dead files (`shoppingLists/**`, `foodPlans/**`, `shoppingListRecommendations/**`) left over from a prior `/api/shoppingLists`→`/api/checklists` and `/api/foodPlans`→`/api/food-plan` route rename, none of it related to the change that finally triggered a clean regeneration. Before assuming a `--clean-output` diff is a regression, check whether the frontend actually calls the deleted path (`apiClient.api.<name>` in hooks) — if it doesn't, it was already dead.
- **Regenerating a single visual snapshot: the snapshot dir is not a workflow trigger path.** Playwright's `--update-snapshots` won't overwrite (or commit) a baseline it considers a match, so `git rm` the specific `anything-frontend/e2e/visual.spec.ts-snapshots/<name>.png` to force a clean regeneration. But that directory is **not** in the workflow's `paths:` filter — pair the deletion with a change to a trigger path (`e2e/visual.spec.ts`, `src/**`, `public/**`, …) in the same push so the workflow runs.
  - **"Match" here is threshold-based, not pixel-identical, and a genuine layout change can still fall under it.** `test:e2e:visual:update` runs `--update-snapshots` with no explicit mode, which Playwright defaults (`preset`) to `"changed"` — a baseline is only rewritten when the actual render differs from it by more than `expect.toHaveScreenshot.maxDiffPixelRatio` (0.02 here). A small DOM edit on an otherwise short, mostly-blank full-page screenshot (e.g. removing one section heading, or moving a button into an existing row) can shift only a thin band of pixels — under 2% of the total canvas — so the workflow reports all tests passing and commits nothing, leaving the **old** layout's PNG checked in even though the page genuinely changed. The CI run looks completely healthy (green, "N passed", no diff to commit), so don't take that as confirmation the baseline updated — after any push that only *edits* an already-covered page (as opposed to adding new coverage), pull the regenerated PNG and open it (or diff its checked-in size/hash against the prior commit) to confirm it actually changed. If it didn't, apply the `git rm` + trigger-path-touch fix above. Once applied, the PR's own "Visual Snapshot Tests" check on that exact commit will fail with "snapshot doesn't exist" — expected, since the deletion and the regeneration are two different workflows and the bot's commit hasn't landed yet — then push one more small commit once the bot's `[skip ci]` commit lands, both to re-verify the new PNGs (same size/hash check) and to get a PR check that actually ran against them.
- **A push that adds a new API endpoint AND references it from the frontend in the same commit breaks `update-visual-snapshots` on that first push — same root cause as the migration/client race above, one level up the chain.** `update-api-client` and `update-visual-snapshots` both trigger in parallel off the same pre-regeneration commit; `update-visual-snapshots`'s `npm run build` fails because the checked-in Kiota client doesn't have the new endpoint yet (e.g. `apiClient.api.search.rebuildIndex.household` didn't exist until `update-api-client` added it). The run fails outright (not "no diff"), so it neither updates nor deletes any baseline — any snapshot covering the new/changed UI silently keeps its **pre-feature** baseline, and later successful runs won't touch it either once Playwright decides it "matches" the (wrong, stale) comparison target... actually the real risk is you *won't notice*, because the workflow reports success on every run once the client catches up, while the stale baseline just sits there looking fine. Don't trust "the snapshot workflow went green" as proof a new UI element rendered — assert on the element directly in the same test (`await expect(page.getByRole(...)).toBeVisible()`) before the `toHaveScreenshot()` call, so a silently-stale baseline fails loudly instead of passing quietly. Fix the race the same way as the migration one: land the frontend code that calls the new endpoint in a *later* push than the one that adds the endpoint, once `update-api-client` has already regenerated the client.
- **Never bump one `@radix-ui/*` package on its own — bump them all together.** Radix pins its internal dependencies to *exact* versions, so raising a single component (e.g. `react-dialog` alone) makes npm nest a private second copy of the primitives it shares with the others, most importantly `react-dismissable-layer` (also `react-focus-guards`, `react-focus-scope`). Those hold **module-level singleton state** — `react-dismissable-layer` keeps `var originalBodyPointerEvents` plus a module-scoped context whose `Set`s track the open layers. With two copies, a menu → confirm-dialog → close sequence (the app's standard destructive-action flow) ends with the dialog's copy restoring `document.body.style.pointerEvents` to the `"none"` the menu's copy had set, and **the whole page stays unclickable until reload**. The `radix` group in `.github/dependabot.yml` keeps future updates arriving as one PR; after any Radix change, confirm the dedupe with `npm ls @radix-ui/react-dismissable-layer` (every occurrence past the first must say `deduped`) — `find node_modules -path '*@radix-ui/react-dismissable-layer' -type d` must print exactly one path. The `overrides` pin of `@radix-ui/react-focus-scope` in `anything-frontend/package.json` is applied globally by npm, so it still yields a single copy and does not cause this; its original rationale is unrecorded, so leave it alone unless you can retest what it fixed.
  - **A `pointer-events: none` failure in Jest is that bug, not a flake.** It surfaces as `Unable to perform pointer interaction as the element has 'pointer-events: none'` in tests that open a menu, confirm in a dialog, and then interact again. Do **not** silence it with `pointerEventsCheck: PointerEventsCheckLevel.Never` or by resetting `document.body.style.pointerEvents` in a `beforeEach` — the `afterEach` in `anything-frontend/jest.setup.ts` is deliberately the *only* reset, and these tests are the sole automated warning that the real page gets stuck. E2E and visual checks do not cover it: they never close a dialog that was opened from a menu.
- **CapRover's "deploy success" only means the image built — it never checks the app actually started, and its log API is undocumented.** `deployedVersion === latestVersion` on `/user/apps/appDefinitions` just means Docker finished handing off the image; the entrypoint can crash-loop forever (e.g. `MigrateAsync()` throwing on a `PendingModelChangesWarning`) and CapRover still reports success — the bug `.github/actions/verify-caprover-deploy` catches by additionally polling the app's `/health` endpoint. Two undocumented REST calls (found by reading `caprover-api`'s — not `caprover-cli`'s — TypeScript source on npm): build logs are `GET /user/apps/appData/<appName>` → `{ logs: { lines: [...] } }`; runtime container logs are `GET /user/apps/appData/<appName>/logs?encoding=hex` → `{ logs: "<hex>" }`, a raw hex-encoded Docker multiplexed stdout/stderr stream (8-byte frame header per chunk: 1 byte stream type, 3 reserved, 4-byte big-endian length) that must be decoded — see `decodeDockerHexLogs` in the action's script.
- **`caprover api` GET calls fail immediately (and misleadingly) if `--data` is omitted — always pass it.** The CLI's `data` option has no `when: false` guard, so a `--data`-less call falls back to an interactive `? API data JSON string:` prompt; in non-interactive CI that gets EOF and exits non-zero within ~1s before any polling happens. The catch then dumps runtime logs and exits 1, so the job looks like it failed on whatever the runtime logs show — which can be a stale, already-fixed error from the *previous* crashed container, not the current deploy. Fix: `callCaproverApi` must always append `--data <json>`, defaulting to `{}` when the caller passes none.
