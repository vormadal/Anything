export function getEnv() {
  const baseUrl = process.env.E2E_BASE_URL;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  // API URL for direct API calls in tests (e.g. test setup/teardown).
  // Defaults to port 5238, which matches the Aspire local development default.
  // Override with E2E_API_URL when the API runs on a different port.
  const apiUrl = process.env.E2E_API_URL ?? "http://localhost:5238";

  if (!baseUrl || !adminEmail || !adminPassword) {
    throw new Error(
      "E2E_BASE_URL, E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD environment variables are required"
    );
  }

  return { baseUrl, adminEmail, adminPassword, apiUrl };
}
