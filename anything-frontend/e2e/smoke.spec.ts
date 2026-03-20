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
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(env.adminEmail, env.adminPassword);
  await expect(page).toHaveURL("/");
});
