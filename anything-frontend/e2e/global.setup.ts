import { test as setup } from "@playwright/test";
import { getEnv } from "./env";
import { LoginPage } from "./pages/LoginPage";

const env = getEnv();

setup("authenticate as admin", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(env.adminEmail, env.adminPassword);

  // Wait for the HouseholdProvider to fetch the user's households and persist
  // the selected household ID to localStorage. Without this, subsequent tests
  // will make API calls without the X-Household-Id header, causing 400 errors
  // from the backend HouseholdMiddleware and keeping pages in a loading state.
  await page.waitForFunction(
    () => !!localStorage.getItem("householdId"),
    { timeout: 10000 }
  );

  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
