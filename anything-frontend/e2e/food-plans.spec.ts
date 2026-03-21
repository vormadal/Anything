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

test("can navigate between weeks on the food plan", async ({ page }) => {
  await page.goto("/food-plans");

  // The week label is visible (e.g. "Mar 17 – Mar 23, 2025")
  const weekLabel = page.locator(".text-center button");
  const initialLabel = await weekLabel.textContent();

  // Navigate to next week
  await page.getByRole("button", { name: "Next week" }).click();
  await expect(weekLabel).not.toHaveText(initialLabel ?? "");

  // Navigate back to current week by clicking the week label
  await weekLabel.click();
  await expect(weekLabel).toHaveText(initialLabel ?? "");
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
