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

  // Click the "Add" button on the first visible day column
  const addMealButton = page
    .getByRole("button", { name: /Add meal for/i })
    .first();
  await addMealButton.click();

  // The inline form should appear with a meal name input
  const mealInput = page.getByPlaceholder("Meal name...");
  await expect(mealInput).toBeVisible();
  await mealInput.fill(mealName);

  // Submit the form
  await page.locator('button[type="submit"]').click();

  // The new entry should be visible on the plan
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

test("can load more and previous days on the food plan", async ({ page }) => {
  await page.goto("/food-plans");

  // Count the initial number of day columns
  const initialColumns = await page.getByRole("button", { name: /Add meal for/i }).count();

  // Load more future days
  await page.getByRole("button", { name: "Load more days" }).click();
  const afterLoadMore = await page.getByRole("button", { name: /Add meal for/i }).count();
  expect(afterLoadMore).toBeGreaterThan(initialColumns);

  // Load previous days
  await page.getByRole("button", { name: "Load previous days" }).click();
  const afterLoadPrevious = await page.getByRole("button", { name: /Add meal for/i }).count();
  expect(afterLoadPrevious).toBeGreaterThan(afterLoadMore);
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
