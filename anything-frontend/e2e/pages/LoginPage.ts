import { Page } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.page.fill("#email", email);
    await this.page.fill("#password", password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL("/", { waitUntil: "commit" });
  }
}
