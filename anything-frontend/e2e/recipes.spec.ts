import { test, expect } from "@playwright/test";

/**
 * Recipe full flow:
 * create recipe manually → verify it appears → search for it
 */

test("create recipe manually and find it in the list", async ({ page }) => {
  const recipeName = `E2E Recipe ${Date.now()}`;

  // Navigate to recipes
  await page.goto("/recipes");
  await expect(
    page.getByRole("heading", { name: "Recipes", level: 1 })
  ).toBeVisible();

  // Open new recipe page
  const createButton = page.getByRole("link", { name: "Create recipe" });
  await expect(createButton).toBeVisible();
  await createButton.click();
  await expect(page).toHaveURL("/recipes/new");

  // Choose manual creation mode
  await page.getByText("Create manually").click();

  // Fill in the recipe name
  await page.fill("#recipe-name", recipeName);

  // Submit
  await page.getByRole("button", { name: "Create Recipe" }).click();

  // Should navigate to the recipe detail page in edit mode
  await expect(page).toHaveURL(/\/recipes\/\d+/);
  await expect(page.getByRole("textbox", { name: "Recipe name" })).toHaveValue(recipeName);

  // Go back to the recipe list and verify the recipe appears
  await page.goto("/recipes");
  await expect(page.getByText(recipeName)).toBeVisible();
});

test("recipes can be searched by name", async ({ page }) => {
  const recipeName = `Searchable ${Date.now()}`;

  // Create a recipe to search for
  await page.goto("/recipes/new");
  await page.getByText("Create manually").click();
  await page.fill("#recipe-name", recipeName);
  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/\d+/);

  // Go to recipes list
  await page.goto("/recipes");

  // Fill in the always-visible search input
  await page.getByRole("textbox", { name: "Search recipes" }).fill(recipeName);

  // The recipe should be visible
  await expect(page.getByText(recipeName)).toBeVisible();

  // Type something that doesn't match
  await page.getByRole("textbox", { name: "Search recipes" }).fill("xyznonexistent123");
  await expect(
    page.getByText("No recipes match your search.")
  ).toBeVisible();

  // Clear search
  await page.getByRole("button", { name: "Clear search" }).click();
});

test("new recipe page shows import-from-url option", async ({ page }) => {
  await page.goto("/recipes/new");

  // Both creation modes should be visible
  await expect(page.getByText("Import from URL")).toBeVisible();
  await expect(page.getByText("Create manually")).toBeVisible();

  // Choosing URL mode shows the URL input
  await page.getByText("Import from URL").click();
  await expect(page.locator("#parse-url")).toBeVisible();

  // Back button returns to mode selection
  await page.getByText("← Back").click();
  await expect(page.getByText("Import from URL")).toBeVisible();
  await expect(page.getByText("Create manually")).toBeVisible();
});
