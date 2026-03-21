import { test, expect } from "@playwright/test";
import { BillDetailPage } from "./pages/BillDetailPage";

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

test("can upload, view, and delete a bill attachment", async ({ page }) => {
  const billName = `Attachment Bill ${Date.now()}`;

  // 1. Create a bill
  await page.goto("/bills/new");
  await page.getByPlaceholder("e.g. Netflix, Electricity").fill(billName);
  await page.getByRole("button", { name: "Add bill" }).click();
  await expect(page).toHaveURL("/bills");

  // 2. Navigate to the bill detail page
  await page.getByText(billName).click();
  await expect(page).toHaveURL(/\/bills\/\d+/);

  const detailPage = new BillDetailPage(page);

  // 3. Upload a PDF attachment
  await detailPage.uploadAttachment({
    name: "invoice.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test invoice"),
  });

  // 4. Verify the attachment appears with the correct name (filename without extension)
  await expect(detailPage.attachmentLink("invoice")).toBeVisible();

  // 5. Delete the attachment
  await detailPage.deleteAttachment("invoice");
  await expect(detailPage.attachmentLink("invoice")).not.toBeVisible();

  // 6. Clean up: delete the bill
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete bill" }).click();
  await expect(page).toHaveURL("/bills");
});
