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
    // indicator clears once it resolves to a real server-assigned id.
    await expect(page.locator('[aria-label="Pending sync"]')).not.toBeVisible();

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

    // Return to view mode to check it off.
    await page.goto(page.url().split("?")[0]);
    await expect(page.getByText(itemName)).toBeVisible();

    await page.context().setOffline(true);

    await page.getByRole("button", { name: "Check item" }).click();

    // Checking it off queues an update; the pending indicator shows on the
    // checked (line-through) item even before it reaches the server.
    await expect(page.locator('[aria-label="Pending sync"]')).toBeVisible();

    await page.context().setOffline(false);
    await expect(page.locator('[aria-label="Pending sync"]')).not.toBeVisible();
  } finally {
    await page.context().setOffline(false);
    if (listId != null) {
      await apiRequest(page, "DELETE", `/api/checklists/${listId}`);
    }
  }
});
