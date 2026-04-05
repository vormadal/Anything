import type { Page, Locator } from "@playwright/test";

/**
 * Page-object helpers for the /food-plans route.
 *
 * The food plan page renders each day as a clickable <button> card containing
 * an <h3> heading with the localised weekday name.  Clicking one opens the
 * DayManagementDialog where meals can be added/removed.
 */
export class FoodPlanPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/food-plans");
  }

  /**
   * Returns all day-row cards (each <button> that contains an <h3> heading).
   */
  dayRows(): Locator {
    return this.page.locator("button").filter({ has: this.page.locator("h3") });
  }

  /**
   * Returns the day-row card marked as today (data-today="true").
   */
  todayRow(): Locator {
    return this.page.locator('button[data-today="true"]');
  }

  /**
   * Opens the DayManagementDialog for the first visible day row.
   */
  async openFirstDayDialog() {
    await this.dayRows().first().click();
  }
}
