import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for visual snapshot tests.
 *
 * This config is self-contained for CI: it starts a local Next.js server
 * automatically via webServer so no live backend or external secrets are
 * required. All API calls are intercepted by page.route() inside the visual
 * spec itself.
 *
 * Usage:
 *   npm run test:e2e:visual          # compare against stored baselines
 *   npm run test:e2e:visual:update   # regenerate baselines after UI changes
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /visual\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  webServer: {
    command: "npx next start -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:5238",
    },
  },
  use: {
    baseURL: "http://localhost:3001",
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
      // Pixel 5 (393×851) is used because the app is primarily a mobile PWA.
      name: "visual",
      use: {
        ...devices["Pixel 5"],
        storageState: "e2e/fixtures/visual-auth.json",
        // Block service workers so the browser always fetches the latest
        // built JS chunks from the server rather than a cached previous build.
        serviceWorkers: "block",
      },
    },
  ],
});
