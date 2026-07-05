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
   * Returns the day-row card whose aria-label contains the given relative
   * label ("i dag", "i morgen", "i går").
   */
  dayRowByRelative(label: string): Locator {
    return this.page.locator(`button[aria-label*="${label}"]`);
  }

  /**
   * Opens the DayManagementDialog for the first visible day row.
   *
   * Clicks the h3 weekday heading rather than the button centre so that the
   * click lands on the header area even when the day row contains entry-chip
   * links (<a> elements) from previous test runs.  Clicking the button centre
   * can inadvertently activate one of those links, navigating away from the
   * food-plan page instead of opening the dialog.
   */
  async openFirstDayDialog() {
    await this.dayRows().first().locator("h3").first().click();
  }

  /**
   * Opens the DayManagementDialog for today's row (see openFirstDayDialog for
   * why the h3 heading is clicked).
   */
  async openTodayDialog() {
    await this.todayRow().locator("h3").first().click();
  }
}
