import { test, expect } from "@playwright/test";

/**
 * Bills full flow:
 * create bill → view detail → navigate back to list
 */

test("create bill and view its detail page", async ({ page }) => {
  const billName = `E2E Bill ${Date.now()}`;

  await page.goto("/bills");
  await expect(
    page.getByRole("heading", { name: "Bills", level: 1 })
  ).toBeVisible();

  // Navigate to the new bill form
  await page.getByRole("button", { name: "Add bill" }).click();
  await expect(page).toHaveURL("/bills/new");

  // Fill in the required name field
  await page
    .getByPlaceholder("e.g. Netflix, Electricity")
    .fill(billName);

  // Set a category
  await page.getByPlaceholder("e.g. Utilities").fill("Entertainment");

  // Set an initial price
  await page.getByPlaceholder("0.00").fill("99");

  // Submit
  await page.getByRole("button", { name: "Add bill" }).click();

  // Should navigate back to the bills list
  await expect(page).toHaveURL("/bills");

  // The new bill should appear in the list
  await expect(page.getByText(billName)).toBeVisible();

  // Click through to the bill detail page
  await page.getByText(billName).click();
  await expect(page).toHaveURL(/\/bills\/\d+/);
  await expect(page.getByRole("heading", { name: billName, level: 1 })).toBeVisible();
});

test("bill creation form validates required name", async ({ page }) => {
  await page.goto("/bills/new");

  // The submit button should be disabled when name is empty
  const submitButton = page.getByRole("button", { name: "Add bill" });
  await expect(submitButton).toBeDisabled();

  // Filling in a name enables the button
  await page.getByPlaceholder("e.g. Netflix, Electricity").fill("Test Bill");
  await expect(submitButton).toBeEnabled();
});

