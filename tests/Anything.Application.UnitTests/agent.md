# Anything.Application.UnitTests

Unit tests for CQRS handlers in `Anything.Application`. No database or HTTP — all dependencies are mocked.

## Structure

- `Features/<Domain>/` — one `*HandlerTests.cs` per handler (mirrors Application/Features layout)
  - Domains covered: Auth, Bills, FoodPlans, Inventory, Locations, Recipes, ShoppingLists, Vendors, Recommendations, Somethings, SuggestionCategories
- `Services/` — `RecipeParserServiceTests.cs`, `TokenServiceTests.cs`
- `Helpers/AsyncQueryableExtensions.cs` — test utility that makes `IQueryable<T>` async-compatible for mocking EF Core queries

## Key Patterns

- Mock `IRepository<T>` and `IUnitOfWork` with Moq; return test data from `repository.Query()` via `AsyncQueryableExtensions`.
- Test one handler per class; name tests `{Method}_{Scenario}_{ExpectedResult}`.
- For soft-delete tests, verify `DeletedOn` is set rather than checking a database row count.
- Use `AsyncQueryableExtensions.AsAsyncQueryable()` when setting up `repository.Query()` returns — plain `List<T>.AsQueryable()` breaks async EF operators like `ToListAsync()`.
