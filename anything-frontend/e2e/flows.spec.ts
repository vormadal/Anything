import { test, expect } from "@playwright/test";
import { FoodPlanPage } from "./pages/FoodPlanPage";

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

  // 1. Create a recipe
  await page.goto("/recipes/new");
  await page.getByText("Create manually").click();
  await page.fill("#recipe-name", recipeName);
  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/\d+/);

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
  const dateStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  await page.fill('input[type="date"]', dateStr);
  await page.getByRole("button", { name: "Add to plan" }).click();

  // 5. Dialog should close after success
  await expect(
    page.getByRole("heading", { name: "Add to Food Plan" })
  ).not.toBeVisible();

  // 6. Navigate to food plan and verify the entry is there
  await page.goto("/food-plans");
  await expect(page.getByText(recipeName)).toBeVisible();
});

test("food plan ingredients can be sent to a shopping list", async ({
  page,
}) => {
  const suffix = Date.now();
  const listName = `Ingredients List ${suffix}`;

  // 1. Create a shopping list to receive the ingredients
  await page.goto("/shopping-lists");
  await page.getByRole("button", { name: "Create shopping list" }).click();
  await page.getByPlaceholder("List name...").fill(listName);
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page).toHaveURL(/\/shopping-lists\/\d+/);

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
});

test("full flow: create recipe, schedule it, shop from the list", async ({
  page,
}) => {
  const suffix = Date.now();
  const recipeName = `Full Flow Recipe ${suffix}`;
  const listName = `Full Flow List ${suffix}`;

  // Step 1 — Create a shopping list
  await page.goto("/shopping-lists");
  await page.getByRole("button", { name: "Create shopping list" }).click();
  await page.getByPlaceholder("List name...").fill(listName);
  await page.getByRole("button", { name: "Create list" }).click();
  const listUrl = page.url();
  await expect(page).toHaveURL(/\/shopping-lists\/\d+/);

  // Step 2 — Create a recipe
  await page.goto("/recipes/new");
  await page.getByText("Create manually").click();
  await page.fill("#recipe-name", recipeName);
  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/\d+/);

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
  // The AppLayout h1 header title is "Shopping List" for /shopping-lists/[id]
  await expect(
    page.getByRole("heading", { name: "Shopping List", level: 1 })
  ).toBeVisible();
});
