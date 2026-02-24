# Integration Test Agent Rules

## Database Cleanup Method

When a new entity (i.e., a new `DbSet<T>` property) is added to `ApplicationDbContext` in `src/Anything.API/Data/ApplicationDbContext.cs`, the `ResetDatabaseAsync` method in `tests/Anything.API.IntegrationTests/Infrastructure/AnythingApiFactory.cs` **must** be updated to remove all rows for that entity.

### Rules

1. **Every `DbSet<T>` in `ApplicationDbContext` must have a corresponding `RemoveRange` call in `ResetDatabaseAsync`.**  
   Delete child (dependent) entities before their parent entities to respect foreign key constraints.

2. **All integration test classes must extend `IntegrationTestBase`.**  
   `IntegrationTestBase.InitializeAsync()` calls `ResetDatabaseAsync()` before every test, ensuring a clean database state. Never skip this base class or bypass the cleanup.

3. **Some entities require conditional cleanup to preserve shared test fixtures.**  
   For example, `Users` must only remove non-admin rows (`admin@anything.local` must be preserved) because auth tests depend on this seeded user. If a new entity has similar fixture requirements, apply the same conditional `RemoveRange` pattern.

### Example

When adding a new entity `Foo` with a child entity `FooItem`:

```csharp
// ApplicationDbContext.cs
public DbSet<Foo> Foos => Set<Foo>();
public DbSet<FooItem> FooItems => Set<FooItem>();
```

Add cleanup in `ResetDatabaseAsync` **before** any parent entities it depends on:

```csharp
// AnythingApiFactory.cs — ResetDatabaseAsync
db.FooItems.RemoveRange(db.FooItems);   // child first
db.Foos.RemoveRange(db.Foos);           // then parent
```

And create the test class extending `IntegrationTestBase`:

```csharp
public class FooEndpointTests(PostgresContainerFixture postgres)
    : IntegrationTestBase(postgres)
{
    // tests here
}
```

### Current Cleanup Order (maintain this pattern)

Remove child (dependent) entities before their parents. Entities with no foreign-key dependencies can be removed in any order.

| Entity | Depends on |
|---|---|
| `ShoppingListItems` | `ShoppingLists` — remove first |
| `ShoppingLists` | _(none)_ |
| `ShoppingListRecommendations` | _(none — standalone entity)_ |
| `InventoryItems` | `InventoryBoxes` and `InventoryStorageUnits` (direct FK to both) — remove `InventoryItems` first |
| `InventoryBoxes` | `InventoryStorageUnits` — remove first |
| `InventoryStorageUnits` | _(none)_ |
| `Somethings` | _(none)_ |
| `RefreshTokens` | `Users` — remove first |
| `UserInvites` | `Users` — remove first |
| `Users` | _(non-admin only — `admin@anything.local` is preserved for auth tests)_ |
