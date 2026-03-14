# Food Plan Model Refactoring — Implementation Plan

## Summary

Refactor from weekly-based food plans to a continuous date-based model. Replace the `FoodPlan` entity (weekly plans) with a `FoodPlanSettings` entity (global configuration), change `FoodPlanEntry.DayOfWeek` to `FoodPlanEntry.Date`, add per-entry shopping list tracking, and remove auto-renewal. Requires **two deployments** to safely handle DB constraint changes with zero data loss.

---

## Deployment 1: Schema Expansion + Data Migration

**Goal:** Add new columns, migrate data, keep old columns for rollback safety.

### Step 1: Create `FoodPlanSettings` entity

New entity in `Anything.Core/Entities/FoodPlanSettings.cs`:
```csharp
public class FoodPlanSettings
{
    public int Id { get; set; }
    public int ActiveDays { get; set; } = 31; // bitmask, Mon-Fri default
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
```
- Single row, no soft delete (configuration entity)
- Add EF config in `Anything.Database/Configurations/FoodPlanSettingsConfiguration.cs`

### Step 2: Add new columns to `FoodPlanEntry`

- Add `Date` (DateTime, **nullable initially** for migration)
- Add `AddedToShoppingListOn` (DateTime?, nullable — null means not yet added)
- Make `FoodPlanId` **nullable** (currently required FK)

### Step 3: EF Migration with data migration SQL

Create migration that:
1. Creates `FoodPlanSettings` table
2. Adds `Date` column (nullable) to `FoodPlanEntries`
3. Adds `AddedToShoppingListOn` column (nullable) to `FoodPlanEntries`
4. Makes `FoodPlanId` nullable on `FoodPlanEntries`
5. **Data migration SQL:**
   ```sql
   -- Populate Date from FoodPlan.WeekStart + DayOfWeek
   UPDATE "FoodPlanEntries" e
   SET "Date" = (
       SELECT fp."WeekStart" + make_interval(days => e."DayOfWeek")
       FROM "FoodPlans" fp
       WHERE fp."Id" = e."FoodPlanId"
   );

   -- Seed FoodPlanSettings from the most recent non-deleted FoodPlan's ActiveDays
   INSERT INTO "FoodPlanSettings" ("ActiveDays", "CreatedOn")
   SELECT COALESCE(
       (SELECT "ActiveDays" FROM "FoodPlans" WHERE "DeletedOn" IS NULL ORDER BY "WeekStart" DESC LIMIT 1),
       31
   ), NOW();
   ```
6. Make `Date` **non-nullable** (after data is populated)
7. Set `FoodPlanId` to null on all entries (data is now in `Date`)

### Step 4: Update entities

**`FoodPlanEntry.cs`** changes:
- Add `Date` (DateTime, required)
- Add `AddedToShoppingListOn` (DateTime?, nullable)
- Make `FoodPlanId` nullable (int?)
- Keep `DayOfWeek` for now (removed in Deployment 2)

**`FoodPlan.cs`**: Keep as-is for rollback safety

### Step 5: Update Application Layer (partial — backward compatible)

Update handlers to work with the new `Date` field while still supporting old queries:

- **`AddFoodPlanEntry`**: Accept `Date` instead of `DayOfWeek`. Compute `DayOfWeek` from `Date` for backward compat.
- **`UpdateFoodPlanEntry`**: Accept `Date`, compute `DayOfWeek`.
- **`GetFoodPlanEntries`**: Query by date range instead of FoodPlanId. New query: `GetFoodPlanEntriesByDateRange`.
- **`AddFoodPlanToShoppingList`**: Update to set `AddedToShoppingListOn` on entries. Change to accept date range instead of FoodPlanId.
- **Remove `FoodPlanAutoRenewService`**: No longer needed.

New handlers:
- **`GetFoodPlanSettings`** / **`UpdateFoodPlanSettings`**: CRUD for the settings entity.

### Step 6: Update Contracts

- **`AddFoodPlanEntryRequest`**: Replace `DayOfWeek` with `Date` (DateTime)
- **`UpdateFoodPlanEntryRequest`**: Replace `DayOfWeek` with `Date`
- **`AddFoodPlanToShoppingListRequest`**: Replace FoodPlan ID route with date range params (`StartDate`, `EndDate`)
- New: **`UpdateFoodPlanSettingsRequest`**: `ActiveDays` (int, 1-127)
- New: **`FoodPlanSettingsResponse`**: `ActiveDays`

### Step 7: Update Endpoints

**`FoodPlanEndpoints.cs`** restructure:
- Remove: `POST /api/food-plans` (create plan), `PUT /api/food-plans/{id}` (update plan), `DELETE /api/food-plans/{id}` (delete plan), `GET /api/food-plans` (list plans), `GET /api/food-plans/{id}` (get plan)
- Keep/modify: Entry endpoints move to `/api/food-plan/entries` (singular "food-plan")
- Add: `GET /api/food-plan/settings`, `PUT /api/food-plan/settings`
- Modify: `GET /api/food-plan/entries?startDate=...&endDate=...`
- Modify: `POST /api/food-plan/entries` (no longer nested under plan ID)
- Modify: `POST /api/food-plan/add-to-shopping-list` (accepts date range in body)

### Step 8: Update Frontend

**Hooks (`useFoodPlans.ts`):**
- Remove plan-level hooks (`useFoodPlans`, `useFoodPlan`, `useCreateFoodPlan`, `useUpdateFoodPlan`, `useDeleteFoodPlan`)
- Update entry hooks to use date-range queries
- Add `useFoodPlanSettings`, `useUpdateFoodPlanSettings`
- Update `useAddFoodPlanToShoppingList` for date-range

**Components:**
- Remove/refactor `FoodPlanForm.tsx` (no more plan creation with WeekStart)
- Update `AddToFoodPlanDialog.tsx` — no plan selection needed, just pick a date
- Update food plan pages to show continuous calendar view

**Utils (`foodPlanUtils.ts`):**
- Keep bitmask utilities (still used for ActiveDays)
- Remove `toDateInputValue` if no longer needed

### Step 9: Integration Tests

Add migration-specific integration tests:
- **Data integrity test**: Seed FoodPlans + FoodPlanEntries with known data, run migration, verify `Date = WeekStart + DayOfWeek` for every entry
- **Settings seeded test**: Verify FoodPlanSettings row exists with correct ActiveDays
- **Soft-deleted entries**: Verify soft-deleted entries also get their Date populated correctly
- **No data loss**: Count entries before and after migration — must match

Update existing `FoodPlanEndpointTests`:
- Update to use new endpoints (date-based)
- Test AddedToShoppingListOn tracking
- Test FoodPlanSettings CRUD

### Step 10: Frontend Tests

- Update `useFoodPlans.test.tsx` for new hook signatures
- Add tests for settings hooks
- Update component tests

---

## Deployment 2: Schema Cleanup

**Goal:** Remove deprecated columns and the `FoodPlans` table.

### Step 1: EF Migration

1. Drop `DayOfWeek` column from `FoodPlanEntries`
2. Drop `FoodPlanId` column from `FoodPlanEntries` (FK already nullable/unused)
3. Drop `FoodPlans` table entirely

### Step 2: Entity Cleanup

- Remove `DayOfWeek` and `FoodPlanId` from `FoodPlanEntry.cs`
- Delete `FoodPlan.cs` entity
- Delete `FoodPlanConfiguration.cs`
- Update `FoodPlanEntryConfiguration.cs` (remove FoodPlan relationship)

### Step 3: Remove Dead Code

- Delete `CreateFoodPlan`, `UpdateFoodPlan`, `DeleteFoodPlan`, `GetFoodPlans`, `GetFoodPlanById` handlers
- Delete `CreateFoodPlanRequest`, `UpdateFoodPlanRequest` contracts
- Clean up any remaining references

---

## File Change Summary

### New Files
| File | Purpose |
|------|---------|
| `src/Anything.Core/Entities/FoodPlanSettings.cs` | Settings entity |
| `src/Anything.Database/Configurations/FoodPlanSettingsConfiguration.cs` | EF config |
| `src/Anything.Application/Features/FoodPlans/Queries/GetFoodPlanSettings.cs` | Get settings |
| `src/Anything.Application/Features/FoodPlans/Commands/UpdateFoodPlanSettings.cs` | Update settings |
| `src/Anything.Application/Features/FoodPlans/Queries/GetFoodPlanEntriesByDateRange.cs` | Date-range query |
| `src/Anything.Contracts/FoodPlans/UpdateFoodPlanSettingsRequest.cs` | Settings DTO |
| 2 EF migrations | Schema changes |

### Modified Files
| File | Changes |
|------|---------|
| `src/Anything.Core/Entities/FoodPlanEntry.cs` | Add Date, AddedToShoppingListOn, make FoodPlanId nullable |
| `src/Anything.Database/Configurations/FoodPlanEntryConfiguration.cs` | Update for new columns |
| `src/Anything.Application/Features/FoodPlans/Commands/AddFoodPlanEntry.cs` | Use Date instead of DayOfWeek |
| `src/Anything.Application/Features/FoodPlans/Commands/UpdateFoodPlanEntry.cs` | Use Date |
| `src/Anything.Application/Features/FoodPlans/Commands/AddFoodPlanToShoppingList.cs` | Date range + track entries |
| `src/Anything.Application/Features/FoodPlans/Commands/DeleteFoodPlanEntry.cs` | Remove FoodPlan dependency |
| `src/Anything.API/Endpoints/FoodPlanEndpoints.cs` | New endpoint structure |
| `src/Anything.Contracts/FoodPlans/AddFoodPlanEntryRequest.cs` | Date instead of DayOfWeek |
| `src/Anything.Contracts/FoodPlans/UpdateFoodPlanEntryRequest.cs` | Date instead of DayOfWeek |
| `src/Anything.Contracts/FoodPlans/AddFoodPlanToShoppingListRequest.cs` | Date range params |
| `anything-frontend/src/hooks/useFoodPlans.ts` | New hook structure |
| `anything-frontend/src/hooks/useFoodPlans.test.tsx` | Updated tests |
| `anything-frontend/src/app/food-plans/*` | Updated pages/components |
| `anything-frontend/src/components/AddToFoodPlanDialog.tsx` | Simplified flow |
| `anything-frontend/src/lib/foodPlanUtils.ts` | Updated utils |
| Integration tests | Updated for new endpoints |

### Deleted Files (Deployment 2)
| File | Reason |
|------|--------|
| `src/Anything.Core/Entities/FoodPlan.cs` | Replaced by FoodPlanSettings |
| `src/Anything.Database/Configurations/FoodPlanConfiguration.cs` | Entity removed |
| `src/Anything.Application/Features/FoodPlans/Commands/CreateFoodPlan.cs` | No more plan creation |
| `src/Anything.Application/Features/FoodPlans/Commands/UpdateFoodPlan.cs` | No more plan updates |
| `src/Anything.Application/Features/FoodPlans/Commands/DeleteFoodPlan.cs` | No more plan deletion |
| `src/Anything.Application/Features/FoodPlans/Queries/GetFoodPlans.cs` | No more plan listing |
| `src/Anything.Application/Features/FoodPlans/Queries/GetFoodPlanById.cs` | No more single plan query |
| `src/Anything.Application/Features/FoodPlans/Services/FoodPlanAutoRenewService.cs` | No auto-renewal |
| `src/Anything.Contracts/FoodPlans/CreateFoodPlanRequest.cs` | No more plan creation |
| `src/Anything.Contracts/FoodPlans/UpdateFoodPlanRequest.cs` | No more plan updates |

---

## Test Strategy

### Migration Tests (Critical)
1. **Pre-migration seed data** → run migration → verify every entry has correct `Date`
2. **Soft-deleted entries** preserved with correct dates
3. **FoodPlanSettings** seeded from most recent plan's ActiveDays
4. **Entry count** identical before and after migration
5. **Entries with NULL RecipeId** handled correctly

### Integration Tests
1. **CRUD on entries** with date-based API
2. **Date range queries** return correct entries
3. **FoodPlanSettings** CRUD
4. **AddToShoppingList** with date range + verify `AddedToShoppingListOn` set
5. **AddToShoppingList** skips entries already added (or re-adds — TBD)

### Frontend Tests
1. Hook tests for new API structure
2. Component tests for date-based UI

---

## Implementation Order (within Deployment 1)

1. Create branch, commit pre-existing package-lock.json change
2. Backend entities + EF config + migration (with data migration SQL)
3. Backend handlers + commands/queries
4. Backend endpoints + contracts
5. Run backend build + integration tests
6. Frontend hooks + utils
7. Frontend components + pages
8. Run frontend build + lint + tests
9. Commit and push
