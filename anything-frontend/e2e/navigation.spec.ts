import { test, expect } from "@playwright/test";

/**
 * Visits every page in the app and verifies it loads without errors.
 * These tests use the admin user session (storageState from global setup).
 */

const PAGES = [
  { path: "/", title: "Anything" },
  { path: "/lists", title: "Lists" },
  { path: "/recipes", title: "Recipes" },
  { path: "/food-plans", title: "Food Plan" },
  { path: "/bills", title: "Bills" },
  { path: "/profile", title: "Profile" },
  { path: "/admin/invite", title: "Invite Users" },
];

for (const { path, title } of PAGES) {
  test(`${title} page loads without errors`, async ({ page }) => {
    await page.goto(path);

    // Page must not redirect to an error page
    await expect(page).not.toHaveURL(/\/error/);

    // The app header must show the correct page title
    await expect(
      page.getByRole("heading", { name: title, level: 1 })
    ).toBeVisible();
  });
}

const HOUSEHOLD_CONFIG_PAGES = [
  { subPath: "/lists/suggestions", title: "Suggestions" },
  { subPath: "/lists/suggestions/categories", title: "Suggestion Categories" },
  { subPath: "/recipes/tags", title: "Recipe Tags" },
];

for (const { subPath, title } of HOUSEHOLD_CONFIG_PAGES) {
  test(`${title} page loads without errors`, async ({ page }) => {
    // Navigate to root first to establish the origin so localStorage is readable.
    await page.goto("/");
    const householdId = await page.evaluate(() => localStorage.getItem("householdId"));
    await page.goto(`/households/${householdId}${subPath}`);
    await expect(page).not.toHaveURL(/\/error/);
    await expect(
      page.getByRole("heading", { name: title, level: 1 })
    ).toBeVisible();
  });
}

test("back button closes hamburger menu instead of navigating away", async ({ page }) => {
  await page.goto("/");
  // Wait for the back-interceptor sentinel to be pushed — proves the hook is
  // mounted and ready. Cannot use waitForLoadState("networkidle") here because
  // the home page makes continuous React Query polling calls.
  await page.waitForFunction(() => window.history.length > 1);

  await page.getByRole("button", { name: /open menu/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.evaluate(() => window.history.back());
  await page.waitForTimeout(300);

  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).toHaveURL("/");
});

test("back button shows exit prompt on root page", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.history.length > 1);

  await page.evaluate(() => window.history.back());

  await expect(page.getByText(/press back again to exit/i)).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("pressing back twice within 2s on root page allows exit", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.history.length > 1);

  await page.evaluate(() => window.history.back());
  await expect(page.getByText(/press back again to exit/i)).toBeVisible();

  await page.evaluate(() => window.history.back());
  await page.waitForTimeout(300);

  await expect(page.getByText(/press back again to exit/i)).not.toBeVisible({ timeout: 500 });
});

test("back from an in-app page navigates back without the exit prompt", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.history.length > 1);

  // Navigate within the app (client-side) so there is in-app history behind us.
  await page.getByRole("button", { name: /open menu/i }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Lists" }).click();
  await page.waitForURL("**/lists");

  // Pressing back must return to the previous in-app page, NOT show the
  // "press back again to exit" prompt (the reported bug).
  await page.evaluate(() => window.history.back());
  await page.waitForURL((url) => url.pathname === "/");

  await expect(page.getByText(/press back again to exit/i)).not.toBeVisible();
});

test("back on a directly-opened deep link still shows the exit prompt", async ({ page }) => {
  // Opening a shared link straight to a sub-page makes that page the app's entry
  // point, so the first back press would exit the app and must be guarded.
  await page.goto("/recipes/new");
  await page.waitForFunction(() => window.history.length > 1);

  await page.evaluate(() => window.history.back());

  await expect(page.getByText(/press back again to exit/i)).toBeVisible();
  await expect(page).toHaveURL(/\/recipes\/new/);
});

test("unauthenticated access redirects to login", async ({ browser }) => {
  // Explicitly pass an empty storageState to override the project-level storageState
  // (which contains auth tokens). Without this, browser.newContext() would inherit
  // the authenticated session and the redirect would never fire.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();

  await page.goto("/shopping-lists");
  // The redirect is client-side (AuthGuard), so wait for the navigation to complete
  await page.waitForURL(/\/login/, { waitUntil: "commit", timeout: 15000 });

  await context.close();
});
