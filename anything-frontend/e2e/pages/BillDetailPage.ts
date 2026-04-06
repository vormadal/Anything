import { Page } from "@playwright/test";

type FileInput = string | { name: string; mimeType: string; buffer: Buffer };

export class BillDetailPage {
  constructor(private page: Page) {}

  async goto(billId: number) {
    await this.page.goto(`/bills/${billId}`);
  }

  async uploadAttachment(file: FileInput) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(file);

    // The upload runs asynchronously after setInputFiles triggers the onChange
    // handler.  Wait for it to complete: while the upload is in progress the
    // "Add file" button shows "Uploading..." and is disabled; when it returns to
    // "Add file" (enabled) the mutation has settled.
    const uploadingButton = this.page.getByRole("button", {
      name: "Uploading...",
    });
    try {
      // Wait up to 2 s for the uploading state to appear (it may be very brief)
      await uploadingButton.waitFor({ state: "visible", timeout: 2_000 });
    } catch {
      // Upload may have been instantaneous; continue to the completion wait
    }
    // Wait for the button to return to its idle state (upload done or failed)
    await this.page
      .getByRole("button", { name: "Add file" })
      .waitFor({ state: "visible", timeout: 30_000 });
  }

  attachmentLink(name: string) {
    return this.page
      .getByRole("link", { name, exact: true })
      .or(this.page.getByRole("button", { name, exact: true }));
  }

  async deleteAttachment(name: string) {
    const row = this.page
      .locator("div.px-4.py-3")
      .filter({
        has: this.page
          .getByRole("link", { name, exact: true })
          .or(this.page.getByRole("button", { name, exact: true })),
      });
    await row.getByRole("button", { name: "Attachment options" }).click();
    await this.page.getByRole("button", { name: "Delete attachment" }).click();
  }
}
