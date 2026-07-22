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

// A list created from a template — carries sourceTemplateId so the detail page
// renders the "From template: …" indicator (resolved against mockListTemplates).
const mockListFromTemplate = { id: 4, name: "Beach Trip", uncheckedItemCount: 6, deletedOn: null, type: 0, sourceTemplateId: 101 };

const mockListTemplates = [
  { id: 101, name: "Vacation Packing", type: 0, itemCount: 8, createdOn: "2024-06-01T00:00:00Z", modifiedOn: null },
  { id: 102, name: "Weekly Groceries", type: 1, itemCount: 12, createdOn: "2024-06-01T00:00:00Z", modifiedOn: null },
];

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

const mockHomeCardPreferences = [
  { cardKey: "foodplan", sortOrder: 0, isVisible: true },
  { cardKey: "lists", sortOrder: 1, isVisible: true },
  { cardKey: "bills", sortOrder: 2, isVisible: true },
];

// Cross-entity search results (GET /api/search) — one navigable (Recipe) and
// one non-navigable (InventoryItem, no frontend detail page yet) result.
const mockSearchResults = [
  { entityType: "Recipe", entityId: 1, title: "Pasta Carbonara", snippet: "Classic Italian." },
  { entityType: "InventoryItem", entityId: 3, title: "Flour", snippet: "5kg bag, pantry shelf" },
];

// Household search index overview (GET /api/search/overview).
const mockSearchIndexOverview = {
  totalDocuments: 6,
  byType: [
    { entityType: "InventoryItem", count: 1 },
    { entityType: "Recipe", count: 3 },
    { entityType: "ShoppingList", count: 2 },
  ],
  lastIndexedOn: "2025-01-15T09:00:00Z",
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

// Ranked meal suggestions; reasons match a FIXED_DATE (mid-January) target.
const mockFoodPlanSuggestions = [
  { recipeId: 1, name: "Pasta Carbonara", score: 62.5, reasons: ["Last planned 5 weeks ago", "Planned 12 times"], lastPlannedOn: "2024-12-11", timesPlanned: 12 },
  { recipeId: 2, name: "Chicken Stir Fry", score: 48.1, reasons: ["Often planned in January"], lastPlannedOn: "2024-11-20", timesPlanned: 6 },
  { recipeId: 3, name: "Beef Tacos", score: 38.0, reasons: ["Matches 'vinter'"], lastPlannedOn: "2024-10-02", timesPlanned: 2 },
  { recipeId: 4, name: "Tomato Soup", score: 28.0, reasons: ["Not planned yet"], lastPlannedOn: null, timesPlanned: 0 },
];

const mockSeasonalTagRules = [
  { id: 1, keyword: "vinter", matchPrefix: false, months: 0b100000000011, boost: 10 },
  { id: 2, keyword: "jul", matchPrefix: false, months: 0b100000000000, boost: 15 },
  { id: 3, keyword: "jule", matchPrefix: true, months: 0b100000000000, boost: 15 },
];

const mockRecommendations = [
  // shoppingListId null = shared across every list; a number scopes it to one list.
  { id: 1, name: "Milk", isApproved: true, preferredUnit: null, categoryId: null, includeInSuggestions: true, shoppingListId: null },
  { id: 2, name: "Bread", isApproved: true, preferredUnit: "loaves", categoryId: null, includeInSuggestions: true, shoppingListId: null },
  { id: 3, name: "Eggs", isApproved: false, preferredUnit: null, categoryId: null, includeInSuggestions: true, shoppingListId: null },
  // Not present on list 1's mock items, so its suggestion is never filtered out.
  { id: 4, name: "Butter", isApproved: true, preferredUnit: null, categoryId: null, includeInSuggestions: true, shoppingListId: null },
  // Recipe-seeded: categorizable for sorting but hidden from autocomplete suggestions.
  { id: 5, name: "Boneless chicken breasts", isApproved: true, preferredUnit: null, categoryId: null, includeInSuggestions: false, shoppingListId: null },
  // List-specific suggestions: each shows its list's badge in the management UI.
  { id: 6, name: "Sausages", isApproved: true, preferredUnit: null, categoryId: null, includeInSuggestions: true, shoppingListId: 1 },
  { id: 7, name: "Balloons", isApproved: true, preferredUnit: null, categoryId: null, includeInSuggestions: true, shoppingListId: 2 },
];

// Optimal string alignment (Damerau) edit distance — used by the /search mock to
// mimic the backend's typo tolerance (a single edit, incl. transposition).
function editDistanceForMock(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

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
  // List templates (registered after the general checklists route → higher LIFO priority)
  await page.route("**/api/checklists/templates**", (route) =>
    route.fulfill({ json: mockListTemplates })
  );
  await page.route(/\/api\/checklists\/4$/, (route) =>
    route.fulfill({ json: mockListFromTemplate })
  );
  await page.route(/\/api\/checklists\/4\/items/, (route) =>
    route.fulfill({ json: mockGeneralChecklistItems })
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
  await page.route("**/api/food-plan/suggestions**", (route) =>
    route.fulfill({ json: mockFoodPlanSuggestions })
  );
  await page.route("**/api/food-plan/seasonal-tags**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockSeasonalTagRules });
    } else {
      route.fulfill({ status: 204, body: "" });
    }
  });

  // ---- Home page card preferences ----
  await page.route("**/api/home/card-preferences**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockHomeCardPreferences });
    } else {
      route.fulfill({ status: 204, body: "" });
    }
  });

  // ---- Misc ----
  await page.route("**/api/shopping-list-recommendations/export**", (route) =>
    route.fulfill({ json: { recommendations: [] } })
  );
  await page.route("**/api/shopping-list-recommendations**", (route) =>
    route.fulfill({ json: mockRecommendations })
  );
  // Registered after the list route so it takes precedence for /search. Simulates
  // the backend's ranked, typo-tolerant search: a substring match or an anagram
  // (adjacent-transposition typo, e.g. "mlik" -> "Milk") surfaces the item. Hidden
  // (recipe-seeded) recommendations are excluded, mirroring the real endpoint.
  await page.route("**/api/shopping-list-recommendations/search**", (route) => {
    const query = (new URL(route.request().url()).searchParams.get("query") ?? "").toLowerCase();
    const matches = mockRecommendations.filter((r) => {
      if (r.includeInSuggestions === false) return false;
      const name = (r.name ?? "").toLowerCase();
      return name.includes(query) || editDistanceForMock(query, name) <= 1;
    });
    route.fulfill({ json: matches });
  });
  // Management list: mirrors the backend's list-scope + visibility filters so the
  // filter bar shows realistic results (a list sees its own + shared suggestions).
  await page.route("**/api/shopping-list-recommendations/all**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const listId = params.get("shoppingListId");
    const sharedOnly = params.get("sharedOnly") === "true";
    const uncategorized = params.get("uncategorized") === "true";
    const includeInSuggestions = params.get("includeInSuggestions");
    let items = mockRecommendations;
    if (sharedOnly) {
      items = items.filter((r) => r.shoppingListId == null);
    } else if (listId != null) {
      items = items.filter((r) => r.shoppingListId === Number(listId) || r.shoppingListId == null);
    }
    if (uncategorized) items = items.filter((r) => r.categoryId == null);
    if (includeInSuggestions === "true") items = items.filter((r) => r.includeInSuggestions);
    else if (includeInSuggestions === "false") items = items.filter((r) => !r.includeInSuggestions);
    route.fulfill({ json: items });
  });
  // Duplicate-review groups for the "Find duplicates" merge dialog. Registered
  // after the catch-all so it wins for /duplicates. Two typo groups over names
  // NOT already in mockRecommendations, so the dialog stands on its own.
  await page.route("**/api/shopping-list-recommendations/duplicates**", (route) =>
    route.fulfill({ json: [
      { members: [
        { id: 201, name: "Tomato", categoryId: null, includeInSuggestions: true, shoppingListId: null },
        { id: 202, name: "Tomatoe", categoryId: null, includeInSuggestions: true, shoppingListId: null },
      ] },
      { members: [
        { id: 203, name: "Yoghurt", categoryId: null, includeInSuggestions: true, shoppingListId: null },
        { id: 204, name: "Yogurt", categoryId: null, includeInSuggestions: true, shoppingListId: null },
      ] },
    ] })
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

  // ---- Global search ----
  // Registered general-to-specific (LIFO): the base /api/search route handles
  // the search box's GET, then the more specific /overview and /rebuild-index
  // routes (registered after) take precedence for those exact operations.
  await page.route("**/api/search**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ json: mockSearchResults });
    } else {
      route.continue();
    }
  });
  await page.route("**/api/search/overview**", (route) =>
    route.fulfill({ json: mockSearchIndexOverview })
  );
  await page.route("**/api/search/rebuild-index**", (route) =>
    route.fulfill({ json: { indexed: 42 } })
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

  // Validation and auth errors render inline under the form (role="alert"),
  // not as a toast — this captures that new inline-error visual state.
  test("login page - inline error", async ({ page }) => {
    await page.clock.setFixedTime(FIXED_DATE);
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 401, json: { message: "Unauthorized" } })
    );
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("Enter your email").fill("wrong@example.com");
    await page.getByPlaceholder("Enter your password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    // Scope to the form's error text: getByRole("alert") also matches Next.js's
    // built-in __next-route-announcer__ div, tripping strict-mode.
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveScreenshot("login-inline-error.png", screenshotOptions);
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

  test("home page - quick create card", async ({ page }) => {
    // Show the Quick Create card (List / Recipe / Bill / Meal shortcuts) on top.
    await page.route("**/api/home/card-preferences**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          json: [
            { cardKey: "quickcreate", sortOrder: 0, isVisible: true },
            { cardKey: "foodplan", sortOrder: 1, isVisible: true },
            { cardKey: "lists", sortOrder: 2, isVisible: true },
            { cardKey: "bills", sortOrder: 3, isVisible: true },
          ],
        });
      } else {
        route.fulfill({ status: 204, body: "" });
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-quick-create-card.png", screenshotOptions);
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

  test("home page - note without meals", async ({ page }) => {
    // No meals planned for today, but a note exists for the day
    await page.route("**/api/food-plan/entries**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.route("**/api/food-plan/notes**", (route) =>
      route.fulfill({ json: [{ id: 2, date: "2025-01-15", note: "Eating out tonight" }] })
    );

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-note-without-meals.png", screenshotOptions);
  });

  test("home page - loading skeleton", async ({ page }) => {
    // Hold card preferences pending so we capture the skeleton shown before
    // the customisation is known, instead of the default card set.
    await page.route("**/api/home/card-preferences**", () => {
      // intentionally hang to show loading state
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveScreenshot("home-loading-skeleton.png", screenshotOptions);
  });

  test("home page - search card", async ({ page }) => {
    // Show the Search card on top, idle (no query typed yet).
    await page.route("**/api/home/card-preferences**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          json: [
            { cardKey: "search", sortOrder: 0, isVisible: true },
            { cardKey: "foodplan", sortOrder: 1, isVisible: true },
            { cardKey: "lists", sortOrder: 2, isVisible: true },
            { cardKey: "bills", sortOrder: 3, isVisible: true },
          ],
        });
      } else {
        route.fulfill({ status: 204, body: "" });
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-search-card.png", screenshotOptions);
  });

  test("home page - search card with results", async ({ page }) => {
    await page.route("**/api/home/card-preferences**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          json: [
            { cardKey: "search", sortOrder: 0, isVisible: true },
            { cardKey: "foodplan", sortOrder: 1, isVisible: true },
            { cardKey: "lists", sortOrder: 2, isVisible: true },
            { cardKey: "bills", sortOrder: 3, isVisible: true },
          ],
        });
      } else {
        route.fulfill({ status: 204, body: "" });
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // One navigable (Recipe) and one non-navigable (InventoryItem) result, so
    // the snapshot shows both the linked and disabled row styles.
    await page.getByLabel("Search everything").fill("pasta");
    await expect(page.getByText("Pasta Carbonara")).toBeVisible();
    await expect(page).toHaveScreenshot("home-search-card-with-results.png", screenshotOptions);
  });

  test("home preferences - reorder and toggle cards", async ({ page }) => {
    // Reordered (Lists first) with Bills hidden, to showcase the drag handles and toggles.
    await page.route("**/api/home/card-preferences**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          json: [
            { cardKey: "lists", sortOrder: 0, isVisible: true },
            { cardKey: "foodplan", sortOrder: 1, isVisible: true },
            { cardKey: "bills", sortOrder: 2, isVisible: false },
          ],
        });
      } else {
        route.fulfill({ status: 204, body: "" });
      }
    });

    await page.goto("/home-preferences");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-preferences.png", screenshotOptions);
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

  test("create list dialog - default (checklist)", async ({ page }) => {
    await page.goto("/lists");
    await page.waitForSelector('[aria-label="New list"]');
    await page.getByRole("button", { name: "New list" }).click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page).toHaveScreenshot(
      "create-list-dialog-default.png",
      screenshotOptions
    );
  });

  test("create list dialog - from template", async ({ page }) => {
    await page.goto("/lists");
    await page.waitForSelector('[aria-label="New list"]');
    await page.getByRole("button", { name: "New list" }).click();
    await page.waitForSelector('[role="dialog"]');
    await page.getByRole("button", { name: "From template" }).click();
    // Wait for the template list to load
    await page.getByText("Vacation Packing").waitFor();
    await expect(page).toHaveScreenshot(
      "create-list-dialog-from-template.png",
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

  test("list detail - created from template", async ({ page }) => {
    await page.goto("/lists/4");
    // The "From template: …" indicator resolves the template name asynchronously
    await page.getByText("From template: Vacation Packing").waitFor();
    await expect(page).toHaveScreenshot(
      "list-detail-from-template.png",
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

  test("shopping list - typo-tolerant item suggestions", async ({ page }) => {
    // Baseline regenerated from scratch after correcting the scenario below.
    await page.goto("/lists/1");
    await page.waitForSelector('[aria-label="Edit list"]');
    await page.getByRole("button", { name: "Edit list" }).click();

    // "buttr" is a typo for the "Butter" recommendation (which is not already on
    // this list), so the ranked, typo-tolerant search still surfaces it in the
    // suggestion dropdown.
    await page.getByPlaceholder("Add an item...").fill("buttr");
    await page.getByRole("button", { name: "Butter" }).waitFor();

    await expect(page).toHaveScreenshot(
      "list-detail-typo-suggestions.png",
      screenshotOptions
    );
  });

  // ---- Offline mode ----

  test("offline banner - visible when offline", async ({ page }) => {
    // Force navigator.onLine to false before any app JS runs, so useOnlineStatus
    // reports offline on first render without needing real network disruption
    // (which would also break the mocked API routes below).
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true });
    });
    await page.goto("/lists");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("offline-banner.png", screenshotOptions);
  });

  test("shopping list - item pending sync while offline", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true });
    });
    await page.goto("/lists/1");
    await page.waitForSelector('[aria-label="Edit list"]');
    await page.getByRole("button", { name: "Edit list" }).click();
    await page.waitForLoadState("networkidle");

    // Adding an item while offline queues it in the outbox and renders it
    // immediately (optimistic update) with a pending-sync indicator.
    await page.getByPlaceholder("Add an item...").fill("Offline Item");
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByText("Offline Item").waitFor();
    await page.waitForSelector('[aria-label="Pending sync"]');

    await expect(page).toHaveScreenshot(
      "list-detail-pending-sync.png",
      screenshotOptions
    );
  });

  test("home page - edit options disabled while offline", async ({ page }) => {
    // Force navigator.onLine to false before any app JS runs (see the offline banner
    // test above for why this — rather than a real network cut — is enough here:
    // useOnlineStatus reads navigator.onLine directly, so the disabled/title state on
    // the Create and Customize buttons reflects it immediately on first render).
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-offline-disabled.png", screenshotOptions);
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

  test("new recipe - mode selection", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "recipes-new-mode-selection.png",
      screenshotOptions
    );
  });

  test("new recipe - scan from photo (pick phase)", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: /scan from photo/i }).click();
    await expect(page.getByText("Take or choose a photo")).toBeVisible();
    await expect(page).toHaveScreenshot(
      "recipes-new-photo-pick.png",
      screenshotOptions
    );
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
  // aria-label becomes "torsdag, i morgen" (tomorrow). Has no entries in mock data,
  // so the dialog opens with the ranked suggestions dropdown visible.
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

  // Empty upcoming day → dialog opens with ranked suggestions (names + reasons) and
  // the calendar behind shows the dashed "Suggest meal" chips on empty days.
  // NB: two torsdag rows are rendered (Jan 9 + Jan 16); target the upcoming one via
  // its full "torsdag, i morgen" label — the past one does not auto-open suggestions.
  test("food plans - day dialog ranked suggestions", async ({ page }) => {
    await page.route("**/api/food-plan/entries**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.goto("/food-plans");
    await page.waitForSelector('button[aria-label="torsdag, i morgen"]');
    await page.getByRole("button", { name: "torsdag, i morgen" }).click();
    await page.getByText("Suggestions", { exact: true }).waitFor();
    await expect(page).toHaveScreenshot(
      "food-plans-day-dialog-suggestions.png",
      screenshotOptions
    );
  });

  // Settings page with the suggestion tuning fields and seasonal tag rules.
  test("food plans - settings suggestions and seasonal tags", async ({ page }) => {
    await page.goto("/food-plans/settings");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "food-plans-settings-suggestions.png",
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

  test("admin search index page", async ({ page }) => {
    await page.goto("/admin/search-index");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("admin-search-index.png", screenshotOptions);
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

  test("household suggestions page - editing a hidden recipe item", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions");
    await page.waitForLoadState("networkidle");
    // Open edit on the recipe-seeded (hidden) recommendation to reveal the
    // "Show in autocomplete suggestions" toggle, unchecked for a hidden item.
    const row = page.locator("li", { hasText: "Boneless chicken breasts" });
    await row.getByRole("button", { name: "Edit suggestion" }).click();
    await expect(
      page.getByText("Show in autocomplete suggestions")
    ).toBeVisible();
    await expect(page).toHaveScreenshot(
      "household-suggestions-edit-hidden.png",
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

  test("household suggestions page - filtered by a single list", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions");
    await page.waitForLoadState("networkidle");
    // Scope to one list: shows that list's own + shared suggestions, the list
    // badges, and the enabled bulk scope actions (Move all / Clear list).
    await page.getByLabel("Filter by list").selectOption("1");
    await expect(
      page.getByRole("button", { name: "Delete all suggestions in this scope" })
    ).toBeEnabled();
    await expect(page).toHaveScreenshot(
      "household-suggestions-filtered-by-list.png",
      screenshotOptions
    );
  });

  test("household suggestions page - move suggestions dialog", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions");
    await page.waitForLoadState("networkidle");
    // Scope to a list, then open the bulk "Move all to…" dialog with its
    // destination picker.
    await page.getByLabel("Filter by list").selectOption("1");
    await page.getByRole("button", { name: /Move all suggestions in this scope/ }).click();
    await expect(page.getByLabel("Move destination")).toBeVisible();
    await expect(page).toHaveScreenshot(
      "household-suggestions-move-dialog.png",
      screenshotOptions
    );
  });

  test("household suggestions page - find duplicates overview", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions");
    await page.waitForLoadState("networkidle");
    // Open the duplicate-review dialog: it opens on an overview listing every
    // near-duplicate group so a manager can start from any one.
    await page.getByRole("button", { name: "Review duplicate suggestions" }).click();
    await expect(page.getByText("2 groups to review — pick one to merge.")).toBeVisible();
    await expect(page).toHaveScreenshot(
      "household-suggestions-merge-duplicates-overview.png",
      screenshotOptions
    );
  });

  test("household suggestions page - find duplicates dialog", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Review duplicate suggestions" }).click();
    // Pick a group from the overview to open its merge editor, where a manager
    // picks the one to keep and merges the rest into it.
    await page.getByRole("button", { name: /Tomato, Tomatoe/ }).click();
    await expect(page.getByText("Group 1 of 2")).toBeVisible();
    await expect(page).toHaveScreenshot(
      "household-suggestions-merge-duplicates.png",
      screenshotOptions
    );
  });

  test("household suggestions page - merge duplicates with a member deselected", async ({ page }) => {
    // Override with a real-world over-grouped cluster: peas variants plus "Frosne rejer"
    // (frozen shrimp), which only shares the modifier word "Frosne". Registered in the
    // test body so it wins over setupApiMocks' /duplicates route.
    await page.route("**/api/shopping-list-recommendations/duplicates**", (route) =>
      route.fulfill({ json: [
        { members: [
          { id: 301, name: "Frosne ærter", categoryId: null, includeInSuggestions: true, shoppingListId: null },
          { id: 302, name: "Friske ærter", categoryId: null, includeInSuggestions: true, shoppingListId: null },
          { id: 303, name: "frosne ekstra fine ærter", categoryId: null, includeInSuggestions: true, shoppingListId: null },
          { id: 304, name: "Frosne rejer", categoryId: null, includeInSuggestions: true, shoppingListId: null },
        ] },
      ] })
    );
    await page.goto("/households/1/lists/suggestions");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Review duplicate suggestions" }).click();
    // Open the single over-grouped cluster from the overview.
    await page.getByRole("button", { name: /Frosne ærter/ }).click();
    await expect(page.getByText("Group 1 of 1")).toBeVisible();
    // Exclude the frozen shrimp so only the peas get merged.
    await page.getByRole("checkbox", { name: "Include Frosne rejer" }).click();
    await expect(page).toHaveScreenshot(
      "household-suggestions-merge-duplicates-deselected.png",
      screenshotOptions
    );
  });

  test("household suggestions page - import & export tab", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions?tab=import-export");
    await page.waitForLoadState("networkidle");
    // The dedicated Import & Export tab: roomy export/import sections plus the
    // collapsed AI-categorization prompt.
    await expect(page.getByRole("button", { name: "Import from file" })).toBeVisible();
    await expect(page).toHaveScreenshot(
      "household-suggestions-import-export.png",
      screenshotOptions
    );
  });

  test("household suggestions page - import & export AI prompt", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions?tab=import-export");
    await page.waitForLoadState("networkidle");
    // Expand the AI-categorization prompt, which a manager can copy to have an AI
    // fill in each item's category. It sits in a height-capped scroll box.
    await page.getByRole("button", { name: /Show prompt/ }).click();
    await expect(page.getByRole("button", { name: "Copy AI instructions" })).toBeVisible();
    await expect(page).toHaveScreenshot(
      "household-suggestions-import-export-ai-prompt.png",
      screenshotOptions
    );
  });

  test("household suggestions page - categories tab with data", async ({ page }) => {
    await page.route("**/api/suggestion-categories**", (route) =>
      route.fulfill({ json: [
        { id: 1, name: "Dairy", sortOrder: 0 },
        { id: 2, name: "Produce", sortOrder: 1 },
        { id: 3, name: "Bakery", sortOrder: 2 },
      ] })
    );
    await page.goto("/households/1/lists/suggestions?tab=categories");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-suggestions-categories-tab.png",
      screenshotOptions
    );
  });

  test("household suggestions page - categories tab empty state", async ({ page }) => {
    await page.goto("/households/1/lists/suggestions?tab=categories");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-suggestions-categories-tab-empty.png",
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

  // ---- Household Config: Search ----

  test("household search index page - with data", async ({ page }) => {
    await page.goto("/households/1/search");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-search-index-with-data.png",
      screenshotOptions
    );
  });

  test("household search index page - empty state", async ({ page }) => {
    await page.route("**/api/search/overview**", (route) =>
      route.fulfill({ json: { totalDocuments: 0, byType: [], lastIndexedOn: null } })
    );
    await page.goto("/households/1/search");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(
      "household-search-index-empty.png",
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

  // ---- Recipe Edit Mode (issue #621: merged into the detail page, no Done button) ----

  test("recipe detail page - edit mode", async ({ page }) => {
    // /api/recipes/1 (exact) is the per-resource GET used by edit mode; more
    // specific than the general /api/recipes/\d+/ catch-all, so it's
    // registered after setupApiMocks for higher LIFO priority.
    await page.route(/\/api\/recipes\/\d+\/ingredients$/, (route) =>
      route.fulfill({
        json: [
          { id: 1, name: "Spaghetti", amount: 200, unit: "g", recipeId: 1 },
          { id: 2, name: "Eggs", amount: 3, unit: null, recipeId: 1 },
        ],
      })
    );
    await page.route(/\/api\/recipes\/\d+\/steps$/, (route) =>
      route.fulfill({
        json: [
          { id: 1, text: "Boil pasta until al dente.", order: 1, recipeId: 1 },
          { id: 2, text: "Mix eggs with cheese and toss with hot pasta.", order: 2, recipeId: 1 },
        ],
      })
    );
    await page.goto("/recipes/1?edit=true");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("recipe-detail-edit-mode.png", screenshotOptions);
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

// ---------------------------------------------------------------------------
// Onboarding tour + nav drawer
// ---------------------------------------------------------------------------

// Step titles in full-tour order for the mocked Owner + app-Admin user.
// Keep in sync with TOUR_STEPS in src/lib/tourSteps.ts.
const tourStepSnapshots: Array<{ id: string; title: string }> = [
  { id: "home", title: "Welcome to Anything" },
  { id: "lists", title: "Lists" },
  { id: "recipes", title: "Recipes" },
  { id: "food-plan", title: "Food Plan" },
  { id: "bills", title: "Bills" },
  { id: "households", title: "Households" },
  { id: "manage-household", title: "Manage your household" },
  { id: "owner", title: "Owner tools" },
  { id: "admin", title: "App administration" },
];

test.describe("Visual Snapshots - Onboarding Tour", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FIXED_DATE);
    await setupApiMocks(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The auth fixture marks the tour as seen, so it does not auto-open.
    await page.getByRole("button", { name: "Open menu" }).click();
  });

  test("nav drawer", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Take the tour" })).toBeVisible();
    await expect(page).toHaveScreenshot("nav-drawer.png", screenshotOptions);
  });

  test("onboarding tour - topic menu", async ({ page }) => {
    await page.getByRole("button", { name: "Take the tour" }).click();
    await expect(page.getByRole("dialog", { name: "Take a tour" })).toBeVisible();
    await expect(page).toHaveScreenshot("onboarding-tour-menu.png", screenshotOptions);
  });

  test("onboarding tour - every step", async ({ page }) => {
    await page.getByRole("button", { name: "Take the tour" }).click();
    await page.getByRole("button", { name: /Full tour/ }).click();

    for (const [index, step] of tourStepSnapshots.entries()) {
      await expect(page.getByRole("dialog", { name: step.title })).toBeVisible();
      await expect(page).toHaveScreenshot(
        `onboarding-tour-step-${step.id}.png`,
        screenshotOptions
      );
      if (index < tourStepSnapshots.length - 1) {
        await page.getByRole("button", { name: "Next" }).click();
      }
    }
  });
});

