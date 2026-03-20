export function getEnv() {
  const baseUrl = process.env.E2E_BASE_URL;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  if (!baseUrl || !adminEmail || !adminPassword) {
    throw new Error(
      "E2E_BASE_URL, E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD environment variables are required"
    );
  }

  return { baseUrl, adminEmail, adminPassword };
}
