import { expect, type Page } from "@playwright/test";

/**
 * The floating action button in the bottom-right corner. A page with one
 * action shows it directly as a labelled button/link; a page with several
 * hides them behind a "Page actions" + button that has to be expanded first.
 *
 * The shape can change while a page loads — a list shows a lone "Edit items"
 * until its items arrive, then gains "Complete list" and collapses into the
 * dial — so every step retries instead of deciding once.
 */
export class PageActions {
  constructor(private readonly page: Page) {}

  /** The action control itself, whether it renders as a button or a link. */
  action(name: string) {
    return this.page
      .getByRole("button", { name, exact: true })
      .or(this.page.getByRole("link", { name, exact: true }));
  }

  get trigger() {
    return this.page.getByRole("button", { name: "Page actions" });
  }

  private async expandOnce() {
    if (
      (await this.trigger.isVisible()) &&
      (await this.trigger.getAttribute("aria-expanded", { timeout: 1000 })) === "false"
    ) {
      await this.trigger.click({ timeout: 1000 });
    }
  }

  /** Makes `name` visible, expanding the dial if the page has one. */
  async expand(name: string) {
    await expect(async () => {
      await this.expandOnce();
      await expect(this.action(name)).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
  }

  async click(name: string) {
    await expect(async () => {
      await this.expandOnce();
      await this.action(name).click({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
  }
}
