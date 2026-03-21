import { test, expect } from "@playwright/test";

/**
 * Visits every page in the app and verifies it loads without errors.
 * These tests use the admin user session (storageState from global setup).
 */

const PAGES = [
  { path: "/", title: "Anything" },
  { path: "/shopping-lists", title: "Shopping Lists" },
  { path: "/recipes", title: "Recipes" },
  { path: "/food-plans", title: "Food Plan" },
  { path: "/bills", title: "Bills" },
  { path: "/profile", title: "Profile" },
  { path: "/admin/invite", title: "Invite Users" },
  { path: "/admin/recommendations", title: "Recommendations" },
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

test("unauthenticated access redirects to login", async ({ browser }) => {
  // Explicitly pass an empty storageState to override the project-level storageState
  // (which contains auth tokens). Without this, browser.newContext() would inherit
  // the authenticated session and the redirect would never fire.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();

  await page.goto("/shopping-lists");
  // The redirect is client-side (AuthGuard), so wait for the navigation to complete
  await page.waitForURL(/\/login/, { timeout: 15000 });

  await context.close();
});
