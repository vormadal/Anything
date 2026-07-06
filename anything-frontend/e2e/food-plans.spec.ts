import { test, expect, type Page } from "@playwright/test";
import { FoodPlanPage } from "./pages/FoodPlanPage";
import { apiRequest } from "./apiRequest";

/**
 * Food plan full flow:
 * add meal entry → verify it appears → delete it
 * navigate between weeks → visit settings
 * meal suggestions → one-tap add → variety exclusion
 */

interface SuggestionDto {
  recipeId: number;
  name: string;
  reasons: string[];
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateString(tomorrow);
}

/**
 * Creates a throwaway household and switches the page's client to it, then
 * returns its id so the caller can delete it in a `finally` block.
 *
 * Suggestion ranking scores every recipe in the household, so tests that
 * assert on ranking need a household with no pre-existing recipes to reliably
 * surface a brand-new "Not planned yet" candidate. The shared deploy
 * household accumulates real recipes over time and will eventually outrank a
 * fresh candidate no matter how high the API's result count is set (see
 * GetFoodPlanSuggestions.MaxCount) — that crowding is what made these tests
 * flaky against the persistent deploy environment. Deleting the household
 * afterwards leaves its recipes/entries orphaned but invisible to every
 * other household's suggestions, so no per-recipe/per-entry cleanup is
 * needed either.
 */
async function useEphemeralHousehold(page: Page): Promise<{ id: number }> {
  const household = await apiRequest<{ id: number }>(page, "POST", "/api/households", {
    name: `E2E Ephemeral ${Date.now()}`,
  });
  await page.evaluate(
    (id) => localStorage.setItem("householdId", String(id)),
    household.id
  );
  return household;
}

test("add and remove a meal entry from the food plan", async ({ page }) => {
  const mealName = `E2E Meal ${Date.now()}`;
  const foodPlan = new FoodPlanPage(page);

  await foodPlan.goto();
  await expect(
    page.getByRole("heading", { name: "Food Plan", level: 1 })
  ).toBeVisible();

  // Click the first visible day row card to open the day management dialog.
  await foodPlan.openFirstDayDialog();

  // The day management dialog should appear with a meal name input
  const mealInput = page.getByPlaceholder("Meal name...");
  await expect(mealInput).toBeVisible();
  await mealInput.fill(mealName);

  // Submit the form
  await page.locator('button[type="submit"]').click();

  // The new entry should be visible in the dialog's meal list.
  // Scope to the <li> that has the "Remove entry" button to avoid a strict-mode
  // violation caused by the entry also appearing as an EntryChip in the day row.
  const entryInList = page
    .locator("li")
    .filter({ hasText: mealName, has: page.getByRole("button", { name: "Remove entry" }) });
  await expect(entryInList).toBeVisible();

  // Delete the specific entry we just added
  await entryInList.getByRole("button", { name: "Remove entry" }).click();

  // Entry should be gone from the dialog list
  await expect(entryInList).not.toBeVisible();
});

test("can navigate between weeks on the food plan", async ({ page }) => {
  const foodPlan = new FoodPlanPage(page);
  await foodPlan.goto();

  // Ensure all 7 days are active so today's row is always visible regardless of
  // the day of the week.  The default setting (Mon–Fri only) hides weekend rows,
  // which makes this assertion flaky when the test runs on a Saturday or Sunday.
  await apiRequest(page, "PUT", "/api/food-plan/settings", { activeDays: 127 });

  // Reload to pick up the updated settings
  await foodPlan.goto();

  // Today's day row should be visible (marked with data-today="true" by the page component)
  const todayRow = foodPlan.todayRow();
  await expect(todayRow).toBeVisible();

  // Load more days into the future
  await page.getByRole("button", { name: "Load more" }).click();

  // Load earlier days into the past
  await page.getByRole("button", { name: "Load earlier" }).click();

  // Today's row should still be visible
  await expect(todayRow).toBeVisible();
});


test("food plan settings page loads and shows day toggles", async ({
  page,
}) => {
  await page.goto("/food-plans");

  // Open settings
  await page.getByRole("button", { name: "Food plan settings" }).click();
  await expect(page).toHaveURL("/food-plans/settings");
  await expect(
    page.getByRole("heading", { name: "Food Plan", level: 1 })
  ).toBeVisible();
});

test("food plan shows add-to-shopping-list dialog", async ({ page }) => {
  await page.goto("/food-plans");

  // Open the "add to shopping list" dialog
  await page.getByRole("button", { name: "Add to shopping list" }).click();

  // The dialog should appear
  await expect(
    page.getByRole("heading", { name: "Add to Shopping List" })
  ).toBeVisible();

  // Close by clicking Cancel
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("heading", { name: "Add to Shopping List" })
  ).not.toBeVisible();
});

test("saved note persists on the day row after dialog closes", async ({ page }) => {
  const noteText = `E2E Note ${Date.now()}`;
  const foodPlan = new FoodPlanPage(page);

  await foodPlan.goto();
  await expect(
    page.getByRole("heading", { name: "Food Plan", level: 1 })
  ).toBeVisible();

  // Open today's day row dialog
  const todayRow = foodPlan.todayRow();
  await todayRow.locator("h3").first().click();

  // Wait for dialog to open
  await expect(page.getByPlaceholder("Add a note...")).toBeVisible();

  // Type the note
  await page.getByPlaceholder("Add a note...").fill(noteText);

  // Save
  await page.getByRole("button", { name: "Save" }).click();

  // Dialog should close
  await expect(page.getByPlaceholder("Add a note...")).not.toBeVisible();

  // The note preview should now appear on today's day row card
  await expect(todayRow.getByText(noteText)).toBeVisible();

  // Clean up: re-open dialog and delete the note
  await todayRow.locator("h3").first().click();
  await page.getByRole("button", { name: "Clear note" }).click();
  await page.getByRole("button", { name: "Save" }).click();
});

test("suggests recipes and adds a meal with one tap from the dropdown", async ({ page }) => {
  const recipeName = `E2E Suggest ${Date.now()}`;
  const foodPlan = new FoodPlanPage(page);

  await foodPlan.goto();
  await expect(
    page.getByRole("heading", { name: "Food Plan", level: 1 })
  ).toBeVisible();

  const household = await useEphemeralHousehold(page);

  try {
    // All 7 days active so today's row is visible on weekends too.
    await apiRequest(page, "PUT", "/api/food-plan/settings", { activeDays: 127 });
    const recipe = await apiRequest<{ id: number }>(page, "POST", "/api/recipes", {
      name: recipeName,
    });

    // The ephemeral household has no other recipes, so ours is guaranteed to
    // rank first regardless of result count.
    const suggestions = await apiRequest<SuggestionDto[]>(
      page,
      "GET",
      `/api/food-plan/suggestions?date=${tomorrowDateString()}&count=10`
    );
    const mine = suggestions.find((s) => s.recipeId === recipe.id);
    expect(mine, "newly created recipe should be suggested").toBeTruthy();
    expect(mine?.reasons?.length).toBeGreaterThan(0);

    // UI-level: focusing the empty meal input shows the ranked dropdown; the
    // plus button adds the (top) suggestion as an entry in one tap.
    await foodPlan.goto();
    await foodPlan.openTodayDialog();
    const mealInput = page.getByPlaceholder("Meal name...");
    await expect(mealInput).toBeVisible();
    await mealInput.click();
    await expect(page.getByText("Suggestions", { exact: true })).toBeVisible();

    // Suggestion plus buttons live inside the dropdown <ul> and are labelled
    // "Add {recipe name}" — take the top one, whatever recipe it is.
    const addButton = page.locator('ul button[aria-label^="Add "]').first();
    await expect(addButton).toBeVisible();
    const label = await addButton.getAttribute("aria-label");
    const suggestedName = label?.replace(/^Add /, "") ?? null;
    await addButton.click();

    // The entry appears in the dialog's meal list.
    const entryInList = page
      .locator("li")
      .filter({
        hasText: suggestedName ?? "",
        has: page.getByRole("button", { name: "Remove entry" }),
      })
      .first();
    await expect(entryInList).toBeVisible();

    // Clean up the added entry through the UI.
    await entryInList.getByRole("button", { name: "Remove entry" }).click();
    await expect(entryInList).not.toBeVisible();
  } finally {
    // Deleting the household takes the recipe/entry/settings created above
    // with it — no per-record cleanup needed.
    await apiRequest(page, "DELETE", `/api/households/${household.id}`);
  }
});

test("recently planned recipes are excluded from suggestions", async ({ page }) => {
  const recipeName = `E2E Exclude ${Date.now()}`;
  const foodPlan = new FoodPlanPage(page);

  await foodPlan.goto();
  await expect(
    page.getByRole("heading", { name: "Food Plan", level: 1 })
  ).toBeVisible();

  const household = await useEphemeralHousehold(page);

  try {
    // All 7 days active so tomorrow's row is visible on weekends too.
    await apiRequest(page, "PUT", "/api/food-plan/settings", { activeDays: 127 });
    const recipe = await apiRequest<{ id: number }>(page, "POST", "/api/recipes", {
      name: recipeName,
    });

    // The ephemeral household has no other recipes, so this membership check
    // is a real assertion of the exclusion logic rather than a coin flip
    // against whatever else the household happens to contain.
    const suggestionsPath = `/api/food-plan/suggestions?date=${tomorrowDateString()}&count=10`;

    // Before planning, the recipe is suggested for tomorrow.
    const before = await apiRequest<SuggestionDto[]>(page, "GET", suggestionsPath);
    expect(before.some((s) => s.recipeId === recipe.id)).toBe(true);

    // Plan it for today — inside the variety exclusion window around tomorrow.
    await apiRequest(page, "POST", "/api/food-plan/entries", {
      name: recipeName,
      recipeId: recipe.id,
      date: `${toDateString(new Date())}T00:00:00Z`,
    });

    // The recipe is no longer suggested for tomorrow.
    const after = await apiRequest<SuggestionDto[]>(page, "GET", suggestionsPath);
    expect(after.some((s) => s.recipeId === recipe.id)).toBe(false);

    // UI-level: tomorrow's dialog fetches suggestions on open; once that request
    // has completed, our recipe must not be offered in the dropdown.
    await foodPlan.goto();
    const suggestionsLoaded = page.waitForResponse((response) =>
      response.url().includes("/api/food-plan/suggestions")
    );
    await foodPlan.dayRowByRelative("i morgen").locator("h3").first().click();
    await expect(page.getByPlaceholder("Meal name...")).toBeVisible();
    await suggestionsLoaded;
    await expect(page.locator(`ul button[aria-label="Add ${recipeName}"]`)).toHaveCount(0);
  } finally {
    // Deleting the household takes the recipe/entry/settings created above
    // with it — no per-record cleanup needed.
    await apiRequest(page, "DELETE", `/api/households/${household.id}`);
  }
});
