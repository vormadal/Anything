# Anything.Contracts

API contract layer — request/response DTOs shared between the API and (optionally) clients.

## Structure

One subfolder per feature domain, each containing:
- `Create*Request.cs`, `Update*Request.cs` — write-side inputs with data annotation validation
- `*Response.cs` — read-side outputs returned by query handlers

Feature folders: `Auth`, `Bills`, `FoodPlans`, `Households`, `Inventory`, `Locations`, `Recipes`, `Recommendations`, `ShoppingLists`, `Somethings`, `SuggestionCategories`, `Vendors`

## Key Patterns

- Use C# `record` types for all request and response DTOs.
- Data annotations (`[Required]`, `[MaxLength]`, etc.) live on request records here — validation is triggered by `.WithParameterValidation()` in the API layer.
- Response records are flat projections — avoid exposing navigation properties or EF entities directly.
- When adding a new endpoint, add the matching request/response records here first, then wire up the handler and endpoint.
