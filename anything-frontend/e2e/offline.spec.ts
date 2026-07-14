import { test, expect } from "@playwright/test";
import { apiRequest } from "./apiRequest";

/**
 * Offline shopping-list items: adding an item while offline queues it in the
 * outbox and shows it immediately (optimistic update) with a pending-sync
 * indicator; once back online, useOfflineSync replays the queue and the item
 * persists server-side.
 */

test("shopping list item added while offline syncs once back online", async ({
  page,
}) => {
  const listName = `E2E Offline List ${Date.now()}`;
  const itemName = `Offline Item ${Date.now()}`;
  let listId: number | null = null;

  try {
    await page.goto("/lists");
    await page.getByRole("button", { name: "New list" }).click();
    await page.getByRole("button", { name: "Shopping list" }).click();
    await page.getByPlaceholder("List name...").fill(listName);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/lists\/\d+/);
    listId = Number(page.url().match(/\/lists\/(\d+)/)?.[1]);

    await page.getByRole("button", { name: "Edit list" }).click();

    await page.context().setOffline(true);
    await expect(page.getByText(/you're offline/i)).toBeVisible();

    await page.getByPlaceholder("Add an item...").fill(itemName);
    await page.getByRole("button", { name: "Add item" }).click();

    // Optimistic update renders the item immediately, with a pending-sync
    // indicator, even while offline (no network request was made).
    await expect(page.getByText(itemName)).toBeVisible();
    await expect(page.locator('[aria-label="Pending sync"]')).toBeVisible();

    await page.context().setOffline(false);

    // Back online, useOfflineSync replays the queued add and the pending
    // indicator clears once it resolves to a real server-assigned id. Allow
    // extra time: the replay is a full POST round-trip plus refetch, which can
    // exceed the default 10s under real deploy-environment latency.
    await expect(page.locator('[aria-label="Pending sync"]')).not.toBeVisible({
      timeout: 20000,
    });

    // Reload to confirm the item was actually persisted server-side, not just
    // held in the local optimistic cache.
    await page.reload();
    await expect(page.getByText(itemName)).toBeVisible();
    await expect(page.locator('[aria-label="Pending sync"]')).not.toBeVisible();
  } finally {
    await page.context().setOffline(false);
    if (listId != null) {
      await apiRequest(page, "DELETE", `/api/checklists/${listId}`);
    }
  }
});

test("shopping list item checked off while offline syncs once back online", async ({
  page,
}) => {
  const listName = `E2E Offline Check List ${Date.now()}`;
  const itemName = `Item To Check ${Date.now()}`;
  let listId: number | null = null;

  try {
    await page.goto("/lists");
    await page.getByRole("button", { name: "New list" }).click();
    await page.getByRole("button", { name: "Shopping list" }).click();
    await page.getByPlaceholder("List name...").fill(listName);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/lists\/\d+/);
    listId = Number(page.url().match(/\/lists\/(\d+)/)?.[1]);

    // Add the item while online so it has a real server-assigned id.
    await page.getByRole("button", { name: "Edit list" }).click();
    await page.getByPlaceholder("Add an item...").fill(itemName);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByPlaceholder("Add an item...")).toHaveValue("");

    // Return to view mode to check it off. Leaving edit mode is a full-page
    // reload served by a fresh fetch, which can lag behind the just-completed
    // add under deploy read-after-write latency (React Query won't refetch on
    // its own), so reload-and-recheck until the item shows.
    const viewUrl = page.url().split("?")[0];
    await expect(async () => {
      await page.goto(viewUrl);
      await expect(page.getByText(itemName)).toBeVisible({ timeout: 8000 });
    }).toPass({ timeout: 40000 });

    await page.context().setOffline(true);
    // Wait for the app to register the offline transition before acting, so the
    // check mutation takes the clean enqueue path (isOffline() true) instead of
    // racing a real request that has to fail before it can be queued.
    await expect(page.getByText(/you're offline/i)).toBeVisible();

    await page.getByRole("button", { name: "Check item" }).click();

    // Checking it off queues an update; the pending indicator shows on the
    // checked (line-through) item even before it reaches the server.
    await expect(page.locator('[aria-label="Pending sync"]')).toBeVisible();

    await page.context().setOffline(false);
    // Back online, the queued check-off replays and the pending indicator
    // clears. The automatic replay is a single-shot triggered by the browser
    // 'online' event, so a transient first-attempt PUT failure would leave the
    // mutation queued with no further trigger, and a plain timeout can't
    // recover. Reloading re-mounts useOfflineSync (retriggering the replay,
    // which is an idempotent PUT) and re-fetches from the server, so a
    // reload-and-recheck toPass self-heals against both that and deploy latency.
    await expect(async () => {
      await page.reload();
      await expect(page.getByText(itemName)).toBeVisible({ timeout: 8000 });
      await expect(
        page.locator('[aria-label="Pending sync"]')
      ).not.toBeVisible({ timeout: 8000 });
    }).toPass({ timeout: 40000 });
  } finally {
    await page.context().setOffline(false);
    if (listId != null) {
      await apiRequest(page, "DELETE", `/api/checklists/${listId}`);
    }
  }
});
