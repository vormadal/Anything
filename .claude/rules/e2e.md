---
paths: 
    - "**/e2e/**/*.ts"
---
- use Page Object Model for Playwright tests (see `anything-frontend/e2e/pages/`).
- use a global setup file (`anything-frontend/e2e/global.setup.ts`) for common test setup like authentication.
- values that are passed as environment variables to the tests (e.g. API base URL) should be defined in the Playwright config (`anything-frontend/playwright.config.ts`) and accessed via `process.env` in the tests.
- ensure that all tests are independent and can be run in any order (no shared state between tests).
- ensure that tests clean up after themselves (e.g. delete any test data they create) to avoid polluting the test environment and causing flaky tests.
