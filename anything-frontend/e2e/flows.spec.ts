import { test, expect } from "@playwright/test";
import { FoodPlanPage } from "./pages/FoodPlanPage";
import { apiRequest } from "./apiRequest";

/**
 * Cross-feature integration flows.
 *
 * These tests cover the main user journeys that span multiple features:
 *   - Creating a recipe and scheduling it on the food plan
 *   - Sending food plan ingredients to a shopping list
 */

test("recipe can be added to the food plan from the recipes page", async ({
  page,
}) => {
  const suffix = Date.now();
  const recipeName = `Flow Recipe ${suffix}`;
  let recipeId: number | null = null;
  let dateStr: string | null = null;

  try {
    // 1. Create a recipe
    await page.goto("/recipes/new");
    await page.getByText("Create manually").click();
    await page.fill("#recipe-name", recipeName);
    await page.getByRole("button", { name: "Create Recipe" }).click();
    await expect(page).toHaveURL(/\/recipes\/\d+/);
    recipeId = Number(page.url().match(/\/recipes\/(\d+)/)?.[1]);

    // 2. Navigate to the recipes list and add the recipe to the food plan
    //    using the CalendarPlus button on the recipe card
    await page.goto("/recipes");
    await expect(page.getByText(recipeName)).toBeVisible();

    // Scope to the recipe card that contains our recipe name.
    // The RecipeCard uses a distinctive outer div with rounded-xl + overflow-hidden.
    await page
      .locator("div.rounded-xl.overflow-hidden")
      .filter({ hasText: recipeName })
      .getByRole("button", { name: "Add to food plan" })
      .click();

    // 3. The AddToFoodPlanDialog should open with a date picker
    await expect(
      page.getByRole("heading", { name: "Add to Food Plan" })
    ).toBeVisible();

    // 4. Set the date to the next Monday (or today if it is already Monday).
    //    Monday is always an active day in the default food plan settings (Mon–Fri).
    //    Using "this week's past Monday" would fail when today is Tue–Sun because
    //    the food plan view starts from today (not the week start) and shows the
    //    next 7 days, so a past Monday would not appear. Using (8 - getDay()) % 7
    //    gives 0 when today is Monday and a positive offset otherwise, ensuring the
    //    chosen date always falls within the visible range.
    const now = new Date();
    const daysToNextMonday = (8 - now.getDay()) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToNextMonday);
    dateStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    await page.fill('input[type="date"]', dateStr);

    // Capture the API response promise before clicking so we can wait for it
    // after the dialog closes.  The dialog closes immediately on click (before
    // the mutation completes), so without this guard the subsequent page.goto()
    // would trigger a full-page navigation that cancels the in-flight POST and
    // the entry would never be saved to the database.
    const entryCreatedResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/food-plan/entries") &&
        resp.request().method() === "POST",
      { timeout: 30000 }
    );
    await page.getByRole("button", { name: "Add to plan" }).click();

    // 5. Dialog should close after success
    await expect(
      page.getByRole("heading", { name: "Add to Food Plan" })
    ).not.toBeVisible();

    // Wait for the POST to complete before navigating; a full-page navigation
    // (page.goto) would otherwise cancel the in-flight fetch request.
    await entryCreatedResponse;

    // 6. Navigate to food plan and verify the entry is there
    await page.goto("/food-plans");
    await expect(page.getByText(recipeName)).toBeVisible();
  } finally {
    // Clean up the food plan entry and recipe so they don't linger in the
    // deploy environment's persistent household — leftover recipes here
    // accumulate planning history over time and skew food-plan suggestion
    // rankings in other tests (see food-plans.spec.ts suggestion tests).
    if (recipeId != null) {
      if (dateStr != null) {
        // The only entry created above is on `dateStr` (the resolved next-Monday) — scope
        // the lookup to that single day rather than scanning the whole household's history.
        const entries = await apiRequest<{ id: number; recipeId: number | null }[]>(
          page,
          "GET",
          `/api/food-plan/entries?startDate=${dateStr}T00:00:00Z&endDate=${dateStr}T23:59:59Z`
        );
        for (const entry of entries.filter((e) => e.recipeId === recipeId)) {
          await apiRequest(page, "DELETE", `/api/food-plan/entries/${entry.id}`);
        }
      }
      await apiRequest(page, "DELETE", `/api/recipes/${recipeId}`);
    }
  }
});

test("food plan ingredients can be sent to a shopping list", async ({
  page,
}) => {
  const suffix = Date.now();
  const listName = `Ingredients List ${suffix}`;
  let listId: number | null = null;

  try {
    // 1. Create a shopping list to receive the ingredients
    await page.goto("/lists");
    await page.getByRole("button", { name: "New list" }).click();
    await page.getByRole("button", { name: "Shopping list" }).click();
    await page.getByPlaceholder("List name...").fill(listName);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/lists\/\d+/);
    listId = Number(page.url().match(/\/lists\/(\d+)/)?.[1]);

    // 2. Navigate to the food plan
    await page.goto("/food-plans");

    // 3. Open the "add to shopping list" dialog
    await page.getByRole("button", { name: "Add to shopping list" }).click();
    await expect(
      page.getByRole("heading", { name: "Add to Shopping List" })
    ).toBeVisible();

    // 4. The shopping list we just created should appear in the dialog
    await expect(page.getByText(listName)).toBeVisible();

    // 5. Select the shopping list — ingredients (if any) are added
    await page.getByText(listName).click();

    // 6. Dialog closes after success
    await expect(
      page.getByRole("heading", { name: "Add to Shopping List" })
    ).not.toBeVisible();
  } finally {
    if (listId != null) {
      await apiRequest(page, "DELETE", `/api/checklists/${listId}`);
    }
  }
});

test("full flow: create recipe, schedule it, shop from the list", async ({
  page,
}) => {
  const suffix = Date.now();
  const recipeName = `Full Flow Recipe ${suffix}`;
  const listName = `Full Flow List ${suffix}`;
  let listId: number | null = null;
  let recipeId: number | null = null;

  try {
    // Step 1 — Create a shopping list
    await page.goto("/lists");
    await page.getByRole("button", { name: "New list" }).click();
    await page.getByRole("button", { name: "Shopping list" }).click();
    await page.getByPlaceholder("List name...").fill(listName);
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL(/\/lists\/\d+/);
    const listUrl = page.url();
    listId = Number(listUrl.match(/\/lists\/(\d+)/)?.[1]);

    // Step 2 — Create a recipe
    await page.goto("/recipes/new");
    await page.getByText("Create manually").click();
    await page.fill("#recipe-name", recipeName);
    await page.getByRole("button", { name: "Create Recipe" }).click();
    await expect(page).toHaveURL(/\/recipes\/\d+/);
    recipeId = Number(page.url().match(/\/recipes\/(\d+)/)?.[1]);

    // Step 3 — Schedule the recipe on the food plan via the food plan page
    const foodPlan = new FoodPlanPage(page);
    await foodPlan.goto();
    // Click the first day row card to open the day management dialog.
    await foodPlan.openFirstDayDialog();

    const mealInput = page.getByPlaceholder("Meal name...");
    await mealInput.fill(recipeName);

    // If the typeahead shows the recipe, select it (links it to the recipe id)
    const suggestion = page.locator("li").filter({ hasText: recipeName }).first();
    if (await suggestion.isVisible({ timeout: 1000 }).catch(() => false)) {
      await suggestion.click();
    }

    await page.locator('button[type="submit"]').click();
    // Scope to the <li> with a "Remove entry" button to avoid a strict-mode
    // violation from the entry also appearing as an EntryChip in the day row.
    await expect(
      page
        .locator("li")
        .filter({ hasText: recipeName, has: page.getByRole("button", { name: "Remove entry" }) })
    ).toBeVisible();

    // Close the day management dialog before interacting with the page behind it.
    // Without this, the dialog backdrop intercepts pointer events on the header buttons.
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(page.getByPlaceholder("Meal name...")).not.toBeVisible();

    // Step 4 — Add food plan recipes to the shopping list
    await page.getByRole("button", { name: "Add to shopping list" }).click();
    await expect(
      page.getByRole("heading", { name: "Add to Shopping List" })
    ).toBeVisible();
    await expect(page.getByText(listName)).toBeVisible();
    await page.getByText(listName).click();
    await expect(
      page.getByRole("heading", { name: "Add to Shopping List" })
    ).not.toBeVisible();

    // Step 5 — Navigate to the shopping list and confirm we can interact with it
    await page.goto(listUrl);
    // The AppLayout h1 header title shows the list name for /lists/[id]
    await expect(
      page.getByRole("heading", { name: listName, level: 1 })
    ).toBeVisible();
  } finally {
    // Clean up so the recipe doesn't linger with planning history that would
    // skew food-plan suggestion rankings in other tests (see flows.spec.ts's
    // first test and food-plans.spec.ts's suggestion tests for the same concern).
    if (recipeId != null) {
      const start = new Date();
      start.setDate(start.getDate() - 14);
      const end = new Date();
      end.setDate(end.getDate() + 14);
      const toDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const entries = await apiRequest<{ id: number; recipeId: number | null }[]>(
        page,
        "GET",
        `/api/food-plan/entries?startDate=${toDateStr(start)}T00:00:00Z&endDate=${toDateStr(end)}T23:59:59Z`
      );
      for (const entry of entries.filter((e) => e.recipeId === recipeId)) {
        await apiRequest(page, "DELETE", `/api/food-plan/entries/${entry.id}`);
      }
      await apiRequest(page, "DELETE", `/api/recipes/${recipeId}`);
    }
    if (listId != null) {
      await apiRequest(page, "DELETE", `/api/checklists/${listId}`);
    }
  }
});
