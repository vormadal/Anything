import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { existsSync, mkdirSync, writeFileSync } from "fs";

config({ path: ".env.e2e", override: false });

// Ensure the auth state file exists before any project starts.
// Without this, the chromium project fails with ENOENT on the first run
// (before the setup project has had a chance to write the real session).
const authFile = "playwright/.auth/user.json";
if (!existsSync(authFile)) {
  mkdirSync("playwright/.auth", { recursive: true });
  writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: "on-first-retry",
  },
  expect: {
    toHaveScreenshot: {
      // Allow up to 2 % pixel difference to tolerate minor antialiasing and
      // font-rendering variations across environments.
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
      testIgnore: /visual\.spec\.ts/,
    },
    {
      // Visual snapshot project uses a static auth fixture instead of the
      // real login flow so that snapshots can be generated without a live
      // backend.  All API calls are intercepted by page.route() inside the
      // visual spec itself.
      name: "visual",
      testMatch: /visual\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/fixtures/visual-auth.json",
      },
    },
  ],
});
