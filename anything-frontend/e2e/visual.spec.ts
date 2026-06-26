/**
 * Visual Snapshot Tests
 *
 * These tests capture screenshots of each page in key UI states and compare
 * them against stored baseline images. This makes it easy to review UI changes
 * in pull requests without running the application locally.
 *
 * ## Workflow
 *
 * 1. **Generate / update baselines** (run once after an intentional UI change):
 *    ```
 *    npm run test:e2e:visual:update
 *    ```
 *    Commit the generated/updated PNG files inside `e2e/snapshots/`.
 *
 * 2. **Verify no regressions** (run on CI or before a PR):
 *    ```
 *    npm run test:e2e:visual
 *    ```
 *    The test fails if any screenshot differs from its baseline by more than the
 *    configured threshold.
 *
 * ## Prerequisites
 *
 * A running frontend (and the Aspire app host) is required, exactly like the
 * other E2E tests. Set up `.env.e2e` (copy from `.env.e2e.example`) and ensure
 * the app is running before executing these tests.
 *
 * All backend API calls are intercepted and replaced with deterministic mock
 * data so that screenshots are stable across environments and over time.
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixed clock date – keeps date-sensitive UI strings consistent across runs.
// 2025-01-15 is a Wednesday, giving us a full Mon–Sun week to populate.
// ---------------------------------------------------------------------------
const FIXED_DATE = new Date("2025-01-15T10:00:00");

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockShoppingLists = [
  { id: 1, name: "Weekly Groceries", uncheckedItemCount: 5, deletedOn: null, type: 1 },
  { id: 2, name: "Party Supplies", uncheckedItemCount: 2, deletedOn: null, type: 1 },
  { id: 3, name: "Hardware Store", uncheckedItemCount: 0, deletedOn: null, type: 0 },
];

const mockGeneralList = { id: 3, name: "Hardware Store", uncheckedItemCount: 0, deletedOn: null, type: 0 };

const mockShoppingListItems = [
  { id: 1, listId: 1, name: "Milk", amount: null, unit: null, isChecked: false, completedOn: null, addedByRecipe: null, shoppingListId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 2, listId: 1, name: "Bread", amount: 2, unit: "loaves", isChecked: true, completedOn: null, addedByRecipe: null, shoppingListId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 3, listId: 1, name: "Eggs", amount: 12, unit: null, isChecked: false, completedOn: null, addedByRecipe: "Pasta Carbonara", shoppingListId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 4, listId: 1, name: "Spaghetti", amount: 500, unit: "g", isChecked: false, completedOn: null, addedByRecipe: "Pasta Carbonara", shoppingListId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 5, listId: 1, name: "Chicken breast", amount: 600, unit: "g", isChecked: false, completedOn: null, addedByRecipe: "Chicken Stir Fry", shoppingListId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 6, listId: 1, name: "Eggs", amount: 6, unit: null, isChecked: false, completedOn: null, addedByRecipe: "Chicken Stir Fry", shoppingListId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
];

const mockGeneralChecklistItems = [
  { id: 10, name: "Buy nails", amount: null, unit: null, isChecked: false, completedOn: null, shoppingListId: 3, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 11, name: "Get a hammer", amount: null, unit: null, isChecked: true, completedOn: null, shoppingListId: 3, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 12, name: "Measure twice", amount: null, unit: null, isChecked: false, completedOn: null, shoppingListId: 3, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
];

const mockGeneralChecklistItemsAllChecked = [
  { id: 10, name: "Buy nails", amount: null, unit: null, isChecked: true, completedOn: null, shoppingListId: 3, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 11, name: "Get a hammer", amount: null, unit: null, isChecked: true, completedOn: null, shoppingListId: 3, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 12, name: "Measure twice", amount: null, unit: null, isChecked: true, completedOn: null, shoppingListId: 3, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
];

const mockBills = [
  {
    id: 1,
    name: "Netflix",
    frequency: 1,
    isAutomated: true,
    currentAmount: 15.99,
    monthlyEquivalent: 15.99,
    priceIncreased: false,
    category: "Entertainment",
    vendorId: null,
    vendorName: null,
    locationId: null,
    locationName: null,
    managementUrl: null,
    notes: null,
    createdOn: "2024-01-01T00:00:00Z",
    modifiedOn: null,
  },
  {
    id: 2,
    name: "Electricity",
    frequency: 1,
    isAutomated: false,
    currentAmount: 89.5,
    monthlyEquivalent: 89.5,
    priceIncreased: true,
    category: "Utilities",
    vendorId: null,
    vendorName: null,
    locationId: null,
    locationName: null,
    managementUrl: null,
    notes: null,
    createdOn: "2024-01-01T00:00:00Z",
    modifiedOn: null,
  },
];

const mockBillSummary = {
  totalBills: 2,
  totalMonthlyEquivalent: 105.49,
  automatedCount: 1,
  manualCount: 1,
  totalCurrentMonthAmount: 105.49,
  totalCurrentYearAmount: 1265.88,
};

const emptyBillSummary = {
  totalBills: 0,
  totalMonthlyEquivalent: 0,
  automatedCount: 0,
  manualCount: 0,
  totalCurrentMonthAmount: 0,
  totalCurrentYearAmount: 0,
};

const mockRecipes = [
  { id: 1, name: "Pasta Carbonara", createdOn: "2024-01-01T00:00:00Z", modifiedOn: null },
  { id: 2, name: "Chicken Stir Fry", createdOn: "2024-01-01T00:00:00Z", modifiedOn: null },
  { id: 3, name: "Beef Tacos", createdOn: "2024-01-01T00:00:00Z", modifiedOn: null },
];

const mockFoodPlanSettings = {
  activeDays: 127, // all seven days
  userId: 1,
};

// Entries spread across the week of 2025-01-13 (Mon) – 2025-01-15 (Wed, = FIXED_DATE)
const mockFoodPlanEntries = [
  { id: 1, date: "2025-01-13", name: "Pasta Carbonara", recipeId: 1, addedToShoppingListOn: null },
  { id: 2, date: "2025-01-14", name: "Chicken Stir Fry", recipeId: 2, addedToShoppingListOn: null },
  { id: 3, date: "2025-01-15", name: "Beef Tacos", recipeId: 3, addedToShoppingListOn: null },
];

const mockFoodPlanNotes = [
  { id: 1, date: "2025-01-13", note: "Meal prep day" },
];

const mockRecommendations = [
  { id: 1, name: "Milk", isApproved: true, preferredUnit: null, categoryId: null },
  { id: 2, name: "Bread", isApproved: true, preferredUnit: "loaves", categoryId: null },
  { id: 3, name: "Eggs", isApproved: false, preferredUnit: null, categoryId: null },
];

const mockUnits = [
  { id: 1, name: "g", householdId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 2, name: "kg", householdId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 3, name: "ml", householdId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
  { id: 4, name: "tbsp", householdId: 1, createdOn: "2025-01-14T00:00:00Z", modifiedOn: null },
];

const mockHouseholds = [
  { id: 1, name: "Smith Family", createdOn: "2024-01-01T00:00:00Z", role: "Owner" },
  { id: 2, name: "Work Team", createdOn: "2024-02-01T00:00:00Z", role: "Member" },
];

const mockRecipeDetail = {
  id: 1, name: "Pasta Carbonara", notes: "Classic Italian.",
  cookTimeMinutes: 30, servings: 4, servingsType: "People",
  createdOn: "2024-01-01T00:00:00Z", modifiedOn: null,
};

const mockRecipeShares = [
  { id: 1, token: "tok1", shareUrl: "/shared/recipe/tok1",
    targetEmail: null, expiresAt: "2025-02-15T00:00:00Z",
    createdOn: "2025-01-15T00:00:00Z", isExpired: false, isClaimed: false },
  { id: 2, token: "tok2", shareUrl: "/shared/recipe/tok2",
    targetEmail: "friend@example.com", expiresAt: null,
    createdOn: "2025-01-15T00:00:00Z", isExpired: false, isClaimed: false },
];

const mockSharedRecipe = {
  recipeId: 1, recipeName: "Pasta Carbonara",
  notes: "Classic Italian.", cookTimeMinutes: 30, servings: 4,
  servingsType: "People",
  ingredients: [
    { name: "Spaghetti", amount: 200, unit: "g", group: null, sortOrder: 0 },
    { name: "Eggs", amount: 3, unit: null, group: null, sortOrder: 1 },
  ],
  steps: [
    { description: "Boil pasta until al dente.", sortOrder: 0 },
    { description: "Mix eggs with cheese and toss with hot pasta.", sortOrder: 1 },
  ],
  tags: ["italian", "pasta"],
  imageUrls: [],
  isExpired: false, isTargeted: false, targetEmail: null,
};

const mockHouseholdDetail = {
  id: 1,
  name: "Smith Family",
  createdOn: "2024-01-01T00:00:00Z",
  members: [
    { userId: 1, name: "Admin", email: "admin@anything.local", role: "Owner", joinedOn: "2024-01-01T00:00:00Z" },
    { userId: 2, name: "Jane Smith", email: "jane@example.com", role: "Member", joinedOn: "2024-01-15T00:00:00Z" },
  ],
};

const mockPendingInvites = [
  {
    id: 1,
    token: "test-invite-token",
    email: "admin@anything.local",
    householdId: 2,
    householdName: "Work Team",
    expiresAt: "2025-01-22T10:00:00Z",
    inviteUrl: "/register?token=test-invite-token",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Intercept all backend API calls and return deterministic mock responses.
 * Routes are registered from most-general to most-specific; because Playwright
 * uses LIFO ordering, the last-registered (most-specific) route wins.
 */
async function setupApiMocks(page: Page) {
  // NOTE: Playwright evaluates registered routes in LIFO order, so more-specific
  // patterns must be registered AFTER the general catch-all for the same prefix.
  //
  // The backend uses kebab-case URL paths (e.g. /api/shopping-lists) which is
  // what the Kiota-generated client sends; camelCase aliases do not exist.

  // ---- Lists (checklists) ----
  await page.route("**/api/checklists**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockShoppingLists });
    } else {
      route.continue();
    }
  });
  await page.route(/\/api\/checklists\/\d+\/items/, (route) =>
    route.fulfill({ json: mockShoppingListItems })
  );
  await page.route(/\/api\/checklists\/1$/, (route) =>
    route.fulfill({ json: { id: 1, name: "Weekly Groceries", type: 1, deletedOn: null } })
  );
  await page.route(/\/api\/checklists\/3$/, (route) =>
    route.fulfill({ json: mockGeneralList })
  );

  // ---- Bills ----
  await page.route("**/api/bills**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockBills });
    } else {
      route.continue();
    }
  });
  await page.route("**/api/bills/summary**", (route) =>
    route.fulfill({ json: mockBillSummary })
  );
  await page.route(/\/api\/bills\/\d+$/, (route) =>
    route.fulfill({ json: mockBills[0] })
  );
  await page.route(/\/api\/bills\/\d+\//, (route) =>
    route.fulfill({ json: [] })
  );

  // ---- Recipes ----
  await page.route("**/api/recipes**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockRecipes });
    } else {
      route.continue();
    }
  });
  await page.route("**/api/recipes/tags**", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route(/\/api\/recipes\/\d+\//, (route) =>
    route.fulfill({ json: [] })
  );
  // More-specific: single recipe detail (LIFO: higher priority than catch-all above)
  await page.route(/\/api\/recipes\/\d+$/, (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockRecipeDetail });
    } else {
      route.continue();
    }
  });
  // Recipe shares sub-route (LIFO: overrides the generic /\d+\/ → [] above)
  await page.route(/\/api\/recipes\/\d+\/shares/, (route) =>
    route.fulfill({ json: [] })
  );
  // ---- Shared recipe (public endpoint) ----
  await page.route("**/api/shared/recipes/**", (route) =>
    route.fulfill({ json: mockSharedRecipe })
  );

  // ---- Food plan (/api/food-plan/*) ----
  await page.route("**/api/food-plan/**", (route) =>
    route.fulfill({ json: null })
  );
  // More-specific overrides registered after → higher LIFO priority
  await page.route("**/api/food-plan/settings**", (route) =>
    route.fulfill({ json: mockFoodPlanSettings })
  );
  await page.route("**/api/food-plan/entries**", (route) =>
    route.fulfill({ json: mockFoodPlanEntries })
  );
  await page.route("**/api/food-plan/notes**", (route) =>
    route.fulfill({ json: mockFoodPlanNotes })
  );

  // ---- Misc ----
  await page.route("**/api/shopping-list-recommendations/export**", (route) =>
    route.fulfill({ json: { recommendations: [] } })
  );
  await page.route("**/api/shopping-list-recommendations**", (route) =>
    route.fulfill({ json: mockRecommendations })
  );
  await page.route("**/api/suggestion-categories/export**", (route) =>
    route.fulfill({ json: { categories: [] } })
  );
  await page.route("**/api/suggestion-categories**", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/units**", (route) =>
    route.fulfill({ json: mockUnits })
  );
  await page.route("**/api/units/export**", (route) =>
    route.fulfill({ json: { units: [] } })
  );
  await page.route("**/api/auth/invites**", (route) =>
    route.fulfill({ json: [] })
  );
  // More-specific override for /me (LIFO: registered after → higher priority)
  await page.route("**/api/auth/invites/me", (route) =>
    route.fulfill({ json: [] })
  );

  // ---- Households ----
  await page.route("**/api/households**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockHouseholds });
    } else {
      route.continue();
    }
  });
  // More-specific: individual household detail (LIFO: registered after → higher priority)
  await page.route(/\/api\/households\/\d+$/, (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockHouseholdDetail });
    } else {
      route.continue();
    }
  });
  await page.route(/\/api\/households\/\d+\/members/, (route) =>
    route.fulfill({ status: 204, body: "" })
  );

  // Block SSE / EventSource connections — no backend is running in visual tests,
  // and an open or retrying EventSource would prevent networkidle from resolving.
  await page.route("**/api/events**", (route) => route.abort());
}

/** Common options for toHaveScreenshot. */
const screenshotOptions = {
  fullPage: true,
  animations: "disabled" as const,
};

// ---------------------------------------------------------------------------
// Login page (unauthenticated)
// ---------------------------------------------------------------------------

test.describe("Visual Snapshots - Login Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page", async ({ page }) => {
    await page.clock.setFixedTime(FIXED_DATE);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login.png", screenshotOptions);
  });
});

// ---------------------------------------------------------------------------
// Authenticated pages
// ---------------------------------------------------------------------------

test.describe("Visual Snapshots - Authenticated Pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FIXED_DATE);
    await setupApiMocks(page);
  });

  // ---- Home ----

  test("home page - with data", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-with-data.png", screenshotOptions);
  });

  test("home page - empty state", async ({ page }) => {
    // Override to return empty collections
    await page.route("**/api/food-plan/entries**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.route("**/api/checklists**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: [] });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/recipes**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: [] });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/bills/summary**", (route) =>
      route.fulfill({ json: emptyBillSummary })
    );

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-empty.png", screenshotOptions);
  });

  // ---- Lists ----

  test("lists - with items", async ({ page }) => {
    await page.goto("/lists");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "lists-with-items.png",
      screenshotOptions
    );
  });

  test("lists - empty state", async ({ page }) => {
    await page.route("**/api/checklists**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: [] });
      } else {
        route.continue();
      }
    });
    await page.goto("/lists");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "lists-empty.png",
      screenshotOptions
    );
  });

  test("shopping list detail", async ({ page }) => {
    await page.goto("/lists/1");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "list-detail.png",
      screenshotOptions
    );
  });

  test("shopping list detail - grouped by recipe view", async ({ page }) => {
    await page.goto("/lists/1");
    await page.waitForSelector('[aria-label="Group by recipe"]');
    await page.getByRole("button", { name: "Group by recipe" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "list-detail-grouped.png",
      screenshotOptions
    );
  });

  test("general checklist detail", async ({ page }) => {
    await page.route(/\/api\/checklists\/3\/items/, (route) =>
      route.fulfill({ json: mockGeneralChecklistItems })
    );
    await page.goto("/lists/3");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "list-detail-general.png",
      screenshotOptions
    );
  });

  test("general checklist detail - close list action", async ({ page }) => {
    await page.route(/\/api\/checklists\/3\/items/, (route) =>
      route.fulfill({ json: mockGeneralChecklistItemsAllChecked })
    );
    await page.goto("/lists/3");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "list-detail-general-closeable.png",
      screenshotOptions
    );
  });

  test("general checklist detail - ordering ui in edit mode", async ({ page }) => {
    await page.route(/\/api\/checklists\/3\/items/, (route) =>
      route.fulfill({ json: mockGeneralChecklistItems })
    );
    await page.goto("/lists/3");
    await page.waitForSelector('[aria-label="Edit list"]');
    await page.getByRole("button", { name: "Edit list" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "list-detail-general-edit-ordering.png",
      screenshotOptions
    );
  });

  // ---- Recipes ----

  test("recipes - with items", async ({ page }) => {
    await page.goto("/recipes");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "recipes-with-items.png",
      screenshotOptions
    );
  });

  test("recipes - empty state", async ({ page }) => {
    await page.route("**/api/recipes**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: [] });
      } else {
        route.continue();
      }
    });
    await page.goto("/recipes");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("recipes-empty.png", screenshotOptions);
  });

  // ---- Bills ----

  test("bills - with data", async ({ page }) => {
    await page.goto("/bills");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("bills-with-data.png", screenshotOptions);
  });

  test("bills - empty state", async ({ page }) => {
    await page.route("**/api/bills**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: [] });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/bills/summary**", (route) =>
      route.fulfill({ json: emptyBillSummary })
    );
    await page.goto("/bills");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("bills-empty.png", screenshotOptions);
  });

  // ---- Food Plans ----

  test("food plans - with entries", async ({ page }) => {
    await page.goto("/food-plans");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "food-plans-with-entries.png",
      screenshotOptions
    );
  });

  test("food plans - empty state", async ({ page }) => {
    await page.route("**/api/food-plan/entries**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.goto("/food-plans");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "food-plans-empty.png",
      screenshotOptions
    );
  });

  // "mandag" = Monday 2025-01-13, which has Pasta Carbonara + a note in the mock data.
  // The page clock is set to 2025-01-15 (Wednesday), so Monday is 2 days back (no relative
  // label), giving aria-label "mandag".
  test("food plans - day dialog with entries and note", async ({ page }) => {
    await page.goto("/food-plans");
    await page.waitForSelector('[aria-label="mandag"]');
    await page.getByRole("button", { name: "mandag" }).first().click();
    await page.waitForSelector('[aria-label="Close dialog"]');
    await expect(page).toHaveScreenshot(
      "food-plans-day-dialog-with-entries.png",
      screenshotOptions
    );
  });

  // "torsdag" = Thursday 2025-01-16, one day after the fixed-date Wednesday.
  // aria-label becomes "torsdag, i morgen" (tomorrow). Has no entries in mock data.
  test("food plans - day dialog empty day", async ({ page }) => {
    await page.goto("/food-plans");
    await page.waitForSelector('button[aria-label*="torsdag"]');
    await page.getByRole("button", { name: /torsdag/i }).first().click();
    await page.waitForSelector('[aria-label="Close dialog"]');
    await expect(page).toHaveScreenshot(
      "food-plans-day-dialog-empty.png",
      screenshotOptions
    );
  });

  // ---- Profile ----

  test("profile page", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("profile.png", screenshotOptions);
  });

  // ---- Household Config: Lists ----

  test("household suggestions page - with recommendations", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-suggestions-with-data.png",
      screenshotOptions
    );
  });

  test("household suggestions page - empty state", async ({ page }) => {
    await page.route("**/api/shopping-list-recommendations**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.goto("/households/1/lists/suggestions");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-suggestions-empty.png",
      screenshotOptions
    );
  });

  test("household categories page - with categories", async ({ page }) => {
    await page.route("**/api/suggestion-categories**", (route) =>
      route.fulfill({ json: [
        { id: 1, name: "Dairy", sortOrder: 0 },
        { id: 2, name: "Produce", sortOrder: 1 },
        { id: 3, name: "Bakery", sortOrder: 2 },
      ] })
    );
    await page.goto("/households/1/lists/suggestions/categories");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-categories-with-data.png",
      screenshotOptions
    );
  });

  test("household categories page - empty state", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions/categories");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-categories-empty.png",
      screenshotOptions
    );
  });

  // ---- Household Config: Units ----

  test("household units page - with units", async ({ page }) => {
    await page.goto("/households/1/units");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-units-with-data.png",
      screenshotOptions
    );
  });

  test("household units page - empty state", async ({ page }) => {
    await page.route("**/api/units**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.goto("/households/1/units");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-units-empty.png",
      screenshotOptions
    );
  });

  // ---- Household Config: Recipes ----

  test("household recipe tags page", async ({ page }) => {
    await page.goto("/households/1/recipes/tags");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-recipe-tags.png",
      screenshotOptions
    );
  });

  // ---- Households ----

  test("households page - with multiple households", async ({ page }) => {
    await page.goto("/households");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "households-with-data.png",
      screenshotOptions
    );
  });

  test("households page - single active household", async ({ page }) => {
    await page.route("**/api/households**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: [mockHouseholds[0]] });
      } else {
        route.continue();
      }
    });
    await page.goto("/households");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "households-single.png",
      screenshotOptions
    );
  });

  test("households page - empty state", async ({ page }) => {
    await page.route("**/api/households**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: [] });
      } else {
        route.continue();
      }
    });
    await page.goto("/households");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "households-empty.png",
      screenshotOptions
    );
  });

  test("household detail page - with members", async ({ page }) => {
    await page.goto("/households/1");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-detail-with-members.png",
      screenshotOptions
    );
  });

  test("households page - with pending invitations", async ({ page }) => {
    await page.route("**/api/auth/invites/me", (route) =>
      route.fulfill({ json: mockPendingInvites })
    );
    await page.goto("/households");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "households-with-pending-invitations.png",
      screenshotOptions
    );
  });

  test("household detail page - invite dialog open", async ({ page }) => {
    await page.goto("/households/1");
    await page.waitForSelector('button:has-text("Invite member")');
    await page.getByRole("button", { name: /invite member/i }).click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page).toHaveScreenshot(
      "household-detail-invite-dialog.png",
      screenshotOptions
    );
  });

  test("register page - accept invitation (logged in user)", async ({ page }) => {
    await page.goto("/register?token=test-invite-token");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "register-accept-invitation.png",
      screenshotOptions
    );
  });

  // ---- Navigation / Back Button ----

  test("navigation - hamburger menu open", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.history.length > 1);
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page).toHaveScreenshot(
      "navigation-drawer-open.png",
      screenshotOptions
    );
  });

  test("navigation - exit prompt visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.history.length > 1);
    await page.evaluate(() => window.history.back());
    await page.waitForSelector("text=Press back again to exit");
    await expect(page).toHaveScreenshot(
      "navigation-exit-prompt.png",
      screenshotOptions
    );
  });

  test("household detail page - loading state", async ({ page }) => {
    // Override household detail to never resolve so we get loading state
    await page.route(/\/api\/households\/\d+$/, () => {
      // intentionally hang to show loading state
    });
    await page.goto("/households/1");
    // Don't wait for networkidle — capture the loading state
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveScreenshot(
      "household-detail-loading.png",
      screenshotOptions
    );
  });

  // ---- Share Recipe Dialog ----

  test("recipe share dialog - initial (empty shares)", async ({ page }) => {
    await page.goto("/recipes/1");
    await page.waitForSelector('[aria-label="Share recipe"]');
    await page.getByRole("button", { name: /share recipe/i }).click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page).toHaveScreenshot("share-dialog-initial.png", screenshotOptions);
  });

  test("recipe share dialog - existing shares listed", async ({ page }) => {
    await page.route(/\/api\/recipes\/\d+\/shares/, (route) =>
      route.fulfill({ json: mockRecipeShares })
    );
    await page.goto("/recipes/1");
    await page.waitForSelector('[aria-label="Share recipe"]');
    await page.getByRole("button", { name: /share recipe/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("share-dialog-with-shares.png", screenshotOptions);
  });

  test("recipe share dialog - share with user tab", async ({ page }) => {
    await page.goto("/recipes/1");
    await page.waitForSelector('[aria-label="Share recipe"]');
    await page.getByRole("button", { name: /share recipe/i }).click();
    await page.waitForSelector('[role="dialog"]');
    await page.getByRole("button", { name: /share with user/i }).click();
    await expect(page).toHaveScreenshot("share-dialog-user-tab.png", screenshotOptions);
  });
});

// ---------------------------------------------------------------------------
// Shared Recipe Page (unauthenticated)
// ---------------------------------------------------------------------------

test.describe("Visual Snapshots - Shared Recipe Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FIXED_DATE);
    await page.route("**/api/households**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.route("**/api/shared/recipes/**", (route) =>
      route.fulfill({ json: mockSharedRecipe })
    );
  });

  test("shared recipe - anonymous view", async ({ page }) => {
    await page.goto("/shared/recipe/abc123");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("shared-recipe-anonymous.png", screenshotOptions);
  });

  test("shared recipe - expired link", async ({ page }) => {
    await page.route("**/api/shared/recipes/**", (route) =>
      route.fulfill({ json: { ...mockSharedRecipe, isExpired: true } })
    );
    await page.goto("/shared/recipe/abc123");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("shared-recipe-expired.png", screenshotOptions);
  });

  test("shared recipe - not found", async ({ page }) => {
    await page.route("**/api/shared/recipes/**", (route) =>
      route.fulfill({ status: 404, json: {} })
    );
    await page.goto("/shared/recipe/notfound");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("shared-recipe-not-found.png", screenshotOptions);
  });

  test("shared recipe - targeted, not logged in (login prompt)", async ({ page }) => {
    await page.route("**/api/shared/recipes/**", (route) =>
      route.fulfill({
        json: { ...mockSharedRecipe, isTargeted: true, targetEmail: "friend@example.com" },
      })
    );
    await page.goto("/shared/recipe/abc123");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("shared-recipe-targeted-login-prompt.png", screenshotOptions);
  });
});

// ---------------------------------------------------------------------------
// Shared Recipe Page (authenticated — targeted share matching auth user)
// ---------------------------------------------------------------------------

test.describe("Visual Snapshots - Shared Recipe Page (Authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FIXED_DATE);
    await setupApiMocks(page);
    await page.route("**/api/shared/recipes/**", (route) =>
      route.fulfill({
        json: {
          ...mockSharedRecipe,
          isTargeted: true,
          targetEmail: "admin@anything.local",
        },
      })
    );
  });

  test("shared recipe - targeted, logged in as target (clone section)", async ({ page }) => {
    await page.goto("/shared/recipe/abc123");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("shared-recipe-targeted-clone.png", screenshotOptions);
  });
});

