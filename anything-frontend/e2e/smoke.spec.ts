import { test, expect } from "@playwright/test";
import { getEnv } from "./env";
import { LoginPage } from "./pages/LoginPage";

const env = getEnv();

test("app loads successfully", async ({ page }) => {
  await page.goto("/");
  await expect(page).not.toHaveTitle(/error/i);
  await expect(page.locator("body")).toBeVisible();
});

test("admin can log in", async ({ page }) => {
  // Navigate first so we have a document context that allows localStorage access
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Clear any existing auth from storageState so we can test the login flow from scratch
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await loginPage.login(env.adminEmail, env.adminPassword);
  await expect(page).toHaveURL("/");
});
