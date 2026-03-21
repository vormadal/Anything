import { test as setup } from "@playwright/test";
import { getEnv } from "./env";
import { LoginPage } from "./pages/LoginPage";

const env = getEnv();

setup("authenticate as admin", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(env.adminEmail, env.adminPassword);

  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
