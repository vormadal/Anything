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
  { id: 1, name: "Weekly Groceries", uncheckedItemCount: 5, deletedOn: null },
  { id: 2, name: "Party Supplies", uncheckedItemCount: 2, deletedOn: null },
  { id: 3, name: "Hardware Store", uncheckedItemCount: 0, deletedOn: null },
];

const mockShoppingListItems = [
  { id: 1, listId: 1, name: "Milk", amount: null, unit: null, checked: false, sortOrder: 0 },
  { id: 2, listId: 1, name: "Bread", amount: 2, unit: "loaves", checked: true, sortOrder: 1 },
  { id: 3, listId: 1, name: "Eggs", amount: 12, unit: null, checked: false, sortOrder: 2 },
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

  // ---- Shopping lists ----
  await page.route("**/api/shopping-lists**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockShoppingLists });
    } else {
      route.continue();
    }
  });
  await page.route(/\/api\/shopping-lists\/\d+\/items/, (route) =>
    route.fulfill({ json: mockShoppingListItems })
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
  await page.route("**/api/shopping-list-recommendations**", (route) =>
    route.fulfill({ json: mockRecommendations })
  );
  await page.route("**/api/suggestion-categories**", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/auth/invites**", (route) =>
    route.fulfill({ json: [] })
  );
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
    await page.route("**/api/shopping-lists**", (route) => {
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

  // ---- Shopping Lists ----

  test("shopping lists - with items", async ({ page }) => {
    await page.goto("/shopping-lists");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "shopping-lists-with-items.png",
      screenshotOptions
    );
  });

  test("shopping lists - empty state", async ({ page }) => {
    await page.route("**/api/shopping-lists**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: [] });
      } else {
        route.continue();
      }
    });
    await page.goto("/shopping-lists");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "shopping-lists-empty.png",
      screenshotOptions
    );
  });

  test("shopping list detail", async ({ page }) => {
    await page.goto("/shopping-lists/1");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "shopping-list-detail.png",
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

  // ---- Profile ----

  test("profile page", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("profile.png", screenshotOptions);
  });

  // ---- Admin ----

  test("admin suggestions page - with recommendations", async ({ page }) => {
    await page.goto("/admin/suggestions");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "admin-suggestions-with-data.png",
      screenshotOptions
    );
  });

  test("admin suggestions page - empty state", async ({ page }) => {
    await page.route("**/api/shopping-list-recommendations**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.goto("/admin/suggestions");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "admin-suggestions-empty.png",
      screenshotOptions
    );
  });
});
