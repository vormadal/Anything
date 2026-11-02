import { Page } from "@playwright/test";

type FileInput = string | { name: string; mimeType: string; buffer: Buffer };

export class BillDetailPage {
  constructor(private page: Page) {}

  async goto(billId: number) {
    await this.page.goto(`/bills/${billId}`);
  }

  async uploadAttachment(file: FileInput) {
    const fileInput = this.page.locator('input[type="file"]');
    const addFileButton = this.page.getByRole("button", { name: "Add file" });

    // Capture the upload response so a server-side failure (e.g. the deployed
    // environment's object storage being unreachable) fails here with the real
    // status and body, instead of later as "attachment link not found".
    const uploadResponse = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        /\/api\/bills\/\d+\/attachments$/.test(new URL(res.url()).pathname),
      { timeout: 30_000 }
    );

    await fileInput.setInputFiles(file);

    const response = await uploadResponse;
    if (!response.ok()) {
      const body = await response.text().catch(() => "<unreadable body>");
      throw new Error(
        `Attachment upload failed: HTTP ${response.status()} ${body.slice(0, 500)}`
      );
    }

    // The upload runs asynchronously after setInputFiles triggers the onChange
    // handler.  Wait for it to complete:
    //   1. Wait for "Add file" to disappear (button text changes to "Uploading...")
    //   2. Wait for "Add file" to reappear (upload settled)
    // Using state:"hidden" on the "Add file" locator is reliable because the
    // locator resolves to 0 elements (hidden) while the text reads "Uploading...",
    // avoiding the race where "Add file" is already visible before the upload starts.
    try {
      // Wait up to 5 s for the uploading state to start
      await addFileButton.waitFor({ state: "hidden", timeout: 5_000 });
    } catch {
      // Upload may have been instantaneous; continue to the completion wait
    }
    // Wait for the button to return to its idle state (upload done or failed)
    await addFileButton.waitFor({ state: "visible", timeout: 30_000 });
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
