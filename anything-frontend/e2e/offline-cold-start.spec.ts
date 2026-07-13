import { test, expect } from "@playwright/test";
import { apiRequest } from "./apiRequest";

/**
 * Regression test for issue #622: opening the app with no connection used to
 * render empty (no household, no data) because offline read-caching was
 * scoped to shopping-list/checklist queries only. The persister now caches
 * every domain's reads by default, and AuthGuard holds its loading state
 * until the persisted cache has rehydrated (useIsRestoring()) — this
 * verifies a cold, offline reload of a page outside that original scope
 * (recipes) still renders from the cache instead of an empty state.
 */

interface RecipeResponse {
  id: number;
}

test("recipe list renders from cache on a cold, offline reload", async ({ page }) => {
  const recipeName = `E2E Offline Cache Recipe ${Date.now()}`;
  let recipeId: number | null = null;

  try {
    // Visit a page that doesn't fetch recipes first, purely to get onto the
    // app's origin so the authenticated apiRequest helper can read the saved
    // tokens from localStorage.
    await page.goto("/households");

    const created = await apiRequest<RecipeResponse>(page, "POST", "/api/recipes", {
      name: recipeName,
    });
    recipeId = created.id;

    // First-ever fetch of the recipes list in this browsing context — includes
    // the new recipe and, once it settles, gets written to the offline
    // persister's IndexedDB store (throttled, so give it a moment to flush).
    await page.goto("/recipes");
    await expect(page.getByText(recipeName)).toBeVisible();
    await page.waitForTimeout(1500);

    await page.context().setOffline(true);
    try {
      // A cold reload while offline should render the persisted recipe list
      // instead of a blank/empty state — the actual symptom reported in #622.
      await page.reload();
      await expect(page.getByText(recipeName)).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
  } finally {
    await page.context().setOffline(false);
    if (recipeId != null) {
      await apiRequest(page, "DELETE", `/api/recipes/${recipeId}`);
    }
  }
});
