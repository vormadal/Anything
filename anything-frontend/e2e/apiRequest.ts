import type { Page } from "@playwright/test";
import { getEnv } from "./env";

const env = getEnv();

/**
 * Performs an authenticated JSON request against the API from inside the page
 * (so it works in the deploy environment where the API is proxied at the app
 * origin). Returns the parsed JSON body, or null for 204 responses.
 */
export async function apiRequest<T>(
  page: Page,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  const householdId = await page.evaluate(() => localStorage.getItem("householdId"));
  return page.evaluate(
    async ([apiUrl, token, hid, m, p, b]) => {
      const res = await fetch(`${apiUrl}${p}`, {
        method: m as string,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Household-Id": (hid as string) ?? "",
        },
        body: b === null ? undefined : JSON.stringify(b),
      });
      if (!res.ok) {
        throw new Error(`${m} ${p} failed with status ${res.status}`);
      }
      if (res.status === 204) return null;
      return res.json();
    },
    [env.apiUrl, accessToken, householdId, method, path, body ?? null] as [
      string,
      string | null,
      string | null,
      string,
      string,
      unknown,
    ]
  ) as Promise<T>;
}
