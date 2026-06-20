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
  { path: "/admin/suggestions", title: "Suggestions" },
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

test("back button closes hamburger menu instead of navigating away", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: /open menu/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.evaluate(() => window.history.back());
  await page.waitForTimeout(300);

  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).toHaveURL("/");
});

test("back button shows exit prompt on root page", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => window.history.back());

  await expect(page.getByText(/press back again to exit/i)).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("pressing back twice within 2s on root page allows exit", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => window.history.back());
  await expect(page.getByText(/press back again to exit/i)).toBeVisible();

  await page.evaluate(() => window.history.back());
  await page.waitForTimeout(300);

  await expect(page.getByText(/press back again to exit/i)).not.toBeVisible({ timeout: 500 });
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
