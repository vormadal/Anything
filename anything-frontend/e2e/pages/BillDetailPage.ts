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
