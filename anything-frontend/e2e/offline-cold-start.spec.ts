import { test, expect, type Page } from "@playwright/test";
import { apiRequest } from "./apiRequest";

/**
 * Regression test for issue #622: opening the app with no connection used to
 * render empty (no household, no data) because offline read-caching was
 * scoped to shopping-list/checklist queries only (src/lib/offline/persister.ts's
 * shouldPersistQuery). The persister now caches every domain's reads by
 * default (denylisting only `auth`-prefixed keys).
 *
 * A true "reload a deep route while offline" test isn't viable here: the
 * service worker (public/sw.js) only precaches "/" and "/login" and falls
 * back to the cached "/" document for ANY failed navigation, so reloading
 * e.g. "/recipes" while offline actually re-renders the home route's
 * embedded RSC payload, not the recipes page — a pre-existing SW limitation
 * unrelated to this fix (the PWA's start_url is "/", so a real cold app
 * open always lands there anyway). Instead, this verifies the underlying
 * mechanism directly: a domain outside the old shopping-list-only scope
 * (recipes) actually gets written to the persister's IndexedDB store after
 * loading online, which is what makes a cold, offline reload of "/" show
 * cached data instead of an empty state.
 */

interface RecipeResponse {
  id: number;
}

interface PersistedQuery {
  queryKey?: unknown[];
  state?: { data?: unknown };
}

interface PersistedClientState {
  clientState?: { queries?: PersistedQuery[] };
}

async function readPersistedCache(page: Page): Promise<PersistedClientState | null> {
  const raw = await page.evaluate(() => {
    return new Promise<string | null>((resolve, reject) => {
      // No explicit version, matching idb-keyval's own createStore() call —
      // if this request happens to be the one that creates "keyval-store"
      // (e.g. it races ahead of the app's own first get/set), it must also
      // create the "keyval" object store itself, otherwise idb-keyval's own
      // later opens (which don't request a version bump) would never get an
      // onupgradeneeded event and the app's real persistence would break.
      const req = indexedDB.open("keyval-store");
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("keyval")) {
          req.result.createObjectStore("keyval");
        }
      };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("keyval")) {
          resolve(null);
          return;
        }
        const tx = db.transaction("keyval", "readonly");
        const getReq = tx.objectStore("keyval").get("anything:query-cache:v1");
        getReq.onsuccess = () => resolve((getReq.result as string | undefined) ?? null);
        getReq.onerror = () => reject(getReq.error);
      };
    });
  });
  return raw ? (JSON.parse(raw) as PersistedClientState) : null;
}

test("recipes are written to the offline cache so a cold reload can show them", async ({
  page,
}) => {
  const recipeName = `E2E Offline Cache Recipe ${Date.now()}`;
  let recipeId: number | null = null;

  try {
    // Visit a page that doesn't fetch recipes first, purely to get onto the
    // app's origin so the authenticated apiRequest helper can read the saved
    // tokens from localStorage.
    await page.goto("/households");

    const created = await apiRequest<RecipeResponse>(page, "POST", "/api/recipes", {
      name: recipeName,
    });
    recipeId = created.id;

    await page.goto("/recipes");
    await expect(page.getByText(recipeName)).toBeVisible();

    // The persister throttles writes (see createAsyncStoragePersister's
    // default throttleTime), so poll until the recipes query — including
    // our new recipe — actually lands in IndexedDB.
    await expect
      .poll(
        async () => {
          const cache = await readPersistedCache(page);
          const queries = cache?.clientState?.queries ?? [];
          return queries.some(
            (q) =>
              q.queryKey?.[0] === "recipes" &&
              JSON.stringify(q.state?.data ?? "").includes(recipeName)
          );
        },
        { timeout: 10000 }
      )
      .toBe(true);
  } finally {
    if (recipeId != null) {
      await apiRequest(page, "DELETE", `/api/recipes/${recipeId}`);
    }
  }
});
