import { test, expect } from "@playwright/test";
import { apiRequest } from "./apiRequest";

/**
 * Shopping list full flow:
 * create list → add items → check items → complete list
 */

test("create shopping list, add items, and complete it", async ({ page }) => {
  const listName = `E2E List ${Date.now()}`;
  let listId: number | null = null;

  try {
    // Navigate to shopping lists
    await page.goto("/lists");
    await expect(
      page.getByRole("heading", { name: "Lists", level: 1 })
    ).toBeVisible();

    // Open the create form via the "+" button in the header
    await page.getByRole("button", { name: "New list" }).click();
    await page.getByRole("button", { name: "Shopping list" }).click();
    await page.getByPlaceholder("List name...").fill(listName);
    await page.getByRole("button", { name: "Create" }).click();

    // Should navigate to the new list's detail page
    await expect(page).toHaveURL(/\/lists\/\d+/);
    listId = Number(page.url().match(/\/lists\/(\d+)/)?.[1]);

    // Enter edit mode to add items
    await page.getByRole("button", { name: "Edit list" }).click();

    // Add first item and wait for the form to clear (confirms the API call completed)
    await page.getByPlaceholder("Add an item...").fill("Milk");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByPlaceholder("Add an item...")).toHaveValue("");

    // Add second item with amount and unit
    await page.getByPlaceholder("Add an item...").fill("Bread");
    await page.getByPlaceholder("Qty").fill("2");
    await page.getByPlaceholder("Unit").fill("loaves");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByPlaceholder("Add an item...")).toHaveValue("");

    // Add third item
    await page.getByPlaceholder("Add an item...").fill("Eggs");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByPlaceholder("Add an item...")).toHaveValue("");

    // Navigate to the same URL without ?edit=true to return to view mode
    await page.goto(page.url().split("?")[0]);

    // Items should be visible. Leaving edit mode does a full reload, so the
    // list is served by a fresh fetch. In the deploy environment a just-written
    // item can occasionally be missing from that first fetch (read-after-write
    // lag), and React Query won't refetch on its own — so a plain toBeVisible
    // retry can't recover. Reload-and-recheck so the assertion self-heals.
    await expect(async () => {
      await page.reload();
      await expect(page.getByText("Milk")).toBeVisible({ timeout: 8000 });
      await expect(page.getByText("Bread")).toBeVisible({ timeout: 8000 });
      await expect(page.getByText("Eggs")).toBeVisible({ timeout: 8000 });
    }).toPass({ timeout: 40000 });

    // Check two items off
    const checkButtons = page.getByRole("button", { name: "Check item" });
    await checkButtons.nth(0).click();
    await checkButtons.nth(1).click();

    // The "Complete List" button appears when few unchecked items remain (≤3)
    await expect(page.getByRole("button", { name: "Complete List" })).toBeVisible();
    await page.getByRole("button", { name: "Complete List" }).click();

    // After completion the app navigates to the new carry-over list or back to lists
    await expect(page).toHaveURL(/\/lists/);
  } finally {
    // Clean up so lists don't accumulate in the persistent deploy household.
    if (listId != null) {
      await apiRequest(page, "DELETE", `/api/checklists/${listId}`);
    }
  }
});

test("shopping list can be renamed and deleted", async ({ page }) => {
  const listName = `Delete Me ${Date.now()}`;

  // Create a list
  await page.goto("/lists");
  await page.getByRole("button", { name: "New list" }).click();
  await page.getByRole("button", { name: "Shopping list" }).click();
  await page.getByPlaceholder("List name...").fill(listName);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/lists\/\d+/);

  // Open More options to rename the list (Rename is now always visible, no need to enter edit mode first)
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  const newName = `${listName} Renamed`;
  await page.getByRole("textbox", { name: "Edit list name" }).fill(newName);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: newName, level: 1 })).toBeVisible();
  // Reload to clear Radix Dialog / react-remove-scroll pointer-event locks before next click
  await page.goto(page.url().split("?")[0]);

  // Delete the list via the dropdown menu
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByText("Delete list").click();

  // Should navigate back to lists
  await expect(page).toHaveURL("/lists");
  // Scoped to the heading role rather than a page-wide text search: Next's
  // accessibility route announcer (#__next-route-announcer__, role="alert")
  // retains the last-announced heading text after navigation, so a plain
  // getByText(newName) false-matches it even once the list itself is gone.
  await expect(page.getByRole("heading", { name: newName, level: 1 })).not.toBeVisible();
});
