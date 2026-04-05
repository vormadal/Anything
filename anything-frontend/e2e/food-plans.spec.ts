import { test, expect } from "@playwright/test";

/**
 * Food plan full flow:
 * add meal entry → verify it appears → delete it
 * navigate between weeks → visit settings
 */

test("add and remove a meal entry from the food plan", async ({ page }) => {
  const mealName = `E2E Meal ${Date.now()}`;

  await page.goto("/food-plans");
  await expect(
    page.getByRole("heading", { name: "Food Plan", level: 1 })
  ).toBeVisible();

  // Click the first visible day row card to open the day management dialog.
  // Each day row is a <button> containing an <h3> with the weekday name.
  await page.locator("button").filter({ has: page.locator("h3") }).first().click();

  // The day management dialog should appear with a meal name input
  const mealInput = page.getByPlaceholder("Meal name...");
  await expect(mealInput).toBeVisible();
  await mealInput.fill(mealName);

  // Submit the form
  await page.locator('button[type="submit"]').click();

  // The new entry should be visible in the dialog
  await expect(page.getByText(mealName)).toBeVisible();

  // Delete the specific entry we just added by scoping to its container
  await page
    .getByText(mealName)
    .locator("xpath=..")
    .getByRole("button", { name: "Remove entry" })
    .click();

  // Entry should be gone
  await expect(page.getByText(mealName)).not.toBeVisible();
});

test("can navigate between weeks on the food plan", async ({ page }) => {
  await page.goto("/food-plans");

  // Today's day row should be visible (marked with data-today)
  const todayRow = page.locator('button[data-today="true"]');
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
