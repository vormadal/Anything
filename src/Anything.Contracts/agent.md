# Anything.Contracts

API contract layer — request/response DTOs shared between the API and (optionally) clients.

## Structure

One subfolder per feature domain, each containing:
- `Create*Request.cs`, `Update*Request.cs` — write-side inputs with data annotation validation
- `*Response.cs` — read-side outputs returned by query handlers

Feature folders: `Auth`, `Bills`, `FoodPlans`, `HomePreferences`, `Households`, `Inventory`, `Locations`, `Notes`, `Recipes`, `Recommendations`, `Search`, `ShoppingLists`, `Somethings`, `SuggestionCategories`, `Units`, `Vendors`

## Key Patterns

- Use C# `record` types for all request and response DTOs.
- Data annotations (`[Required]`, `[MaxLength]`, etc.) live on request records here — validation is triggered by `.WithParameterValidation()` in the API layer.
- **Every string/numeric input gets an explicit bound** (`[StringLength]`/`[Range]`). These annotations are the only input-size gate before the DB and search index — an unbounded string is a stored-data DoS.
- Response records are flat projections — avoid exposing navigation properties or EF entities directly.
- When adding a new endpoint, add the matching request/response records here first, then wire up the handler and endpoint.
- Prefer a separate summary record when a list endpoint doesn't need the full entity — `Notes` pairs `NoteResponse` (includes the full rich-text `ContentJson`) with `NoteSummaryResponse` (title + short plain-text snippet), so listing many notes never ships every editor document.
