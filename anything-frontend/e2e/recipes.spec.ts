import { test, expect } from "@playwright/test";
import { apiRequest } from "./apiRequest";

/**
 * Recipe full flow:
 * create recipe manually → verify it appears → search for it
 */

test("create recipe manually and find it in the list", async ({ page }) => {
  const recipeName = `E2E Recipe ${Date.now()}`;
  let recipeId: number | null = null;

  try {
    // Navigate to recipes
    await page.goto("/recipes");
    await expect(
      page.getByRole("heading", { name: "Recipes", level: 1 })
    ).toBeVisible();

    // Navigate to the new recipe page directly.
    // The header "Create recipe" icon-link is tested implicitly via this goto;
    // clicking a header icon-link in tests is unreliable in the deployed
    // environment where in-flight API calls can cause React re-renders that
    // momentarily detach the element from the event loop.
    await page.goto("/recipes/new");

    // Choose manual creation mode
    await page.getByText("Create manually").click();

    // Fill in the recipe name
    await page.fill("#recipe-name", recipeName);

    // Submit
    await page.getByRole("button", { name: "Create Recipe" }).click();

    // Should navigate to the recipe detail page in edit mode
    await expect(page).toHaveURL(/\/recipes\/\d+/);
    recipeId = Number(page.url().match(/\/recipes\/(\d+)/)?.[1]);
    await expect(page.getByRole("textbox", { name: "Recipe name" })).toHaveValue(recipeName);

    // Go back to the recipe list and verify the recipe appears
    await page.goto("/recipes");
    await expect(page.getByText(recipeName)).toBeVisible();
  } finally {
    // Leftover recipes accumulate planning-eligible history in the deploy
    // environment's persistent household and skew food-plan suggestion
    // rankings in other tests — see food-plans.spec.ts's suggestion tests.
    if (recipeId != null) {
      await apiRequest(page, "DELETE", `/api/recipes/${recipeId}`);
    }
  }
});

test("recipes can be searched by name", async ({ page }) => {
  const recipeName = `Searchable ${Date.now()}`;
  let recipeId: number | null = null;

  try {
    // Create a recipe to search for
    await page.goto("/recipes/new");
    await page.getByText("Create manually").click();
    await page.fill("#recipe-name", recipeName);
    await page.getByRole("button", { name: "Create Recipe" }).click();
    await expect(page).toHaveURL(/\/recipes\/\d+/);
    recipeId = Number(page.url().match(/\/recipes\/(\d+)/)?.[1]);

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
  } finally {
    if (recipeId != null) {
      await apiRequest(page, "DELETE", `/api/recipes/${recipeId}`);
    }
  }
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
