import { test, expect } from "@playwright/test";

/**
 * Shopping list full flow:
 * create list → add items → check items → complete list
 */

test("create shopping list, add items, and complete it", async ({ page }) => {
  const listName = `E2E List ${Date.now()}`;

  // Navigate to shopping lists
  await page.goto("/lists");
  await expect(
    page.getByRole("heading", { name: "Lists", level: 1 })
  ).toBeVisible();

  // Open the create form via the "+" button in the header
  await page.getByRole("button", { name: "New list" }).click();
  await page.getByPlaceholder("List name...").fill(listName);
  await page.getByRole("button", { name: "Create list" }).click();

  // Should navigate to the new list's detail page
  await expect(page).toHaveURL(/\/lists\/\d+/);

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

  // Items should be visible
  await expect(page.getByText("Milk")).toBeVisible();
  await expect(page.getByText("Bread")).toBeVisible();
  await expect(page.getByText("Eggs")).toBeVisible();

  // Check two items off
  const checkButtons = page.getByRole("button", { name: "Check item" });
  await checkButtons.nth(0).click();
  await checkButtons.nth(1).click();

  // The "Complete List" button appears when few unchecked items remain (≤3)
  await expect(page.getByRole("button", { name: "Complete List" })).toBeVisible();
  await page.getByRole("button", { name: "Complete List" }).click();

  // After completion the app navigates to the new carry-over list or back to lists
  await expect(page).toHaveURL(/\/lists/);
});

test("shopping list can be renamed and deleted", async ({ page }) => {
  const listName = `Delete Me ${Date.now()}`;

  // Create a list
  await page.goto("/lists");
  await page.getByRole("button", { name: "New list" }).click();
  await page.getByPlaceholder("List name...").fill(listName);
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page).toHaveURL(/\/lists\/\d+/);

  // Enter edit mode, then open More options to rename the list
  await page.getByRole("button", { name: "Edit list" }).click();
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Edit list name" }).click();
  const newName = `${listName} Renamed`;
  await page.getByRole("textbox", { name: "Edit list name" }).fill(newName);
  await page.getByRole("button", { name: "Save" }).click();
  // Wait for the rename dialog to fully close before interacting with the page again.
  // Radix UI Dialog applies pointer-event locks during its exit animation that block clicks.
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await expect(page.getByRole("heading", { name: newName, level: 1 })).toBeVisible();

  // Delete the list via the dropdown menu
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByText("Delete list").click();

  // Should navigate back to lists
  await expect(page).toHaveURL("/lists");
  await expect(page.getByText(newName)).not.toBeVisible();
});
