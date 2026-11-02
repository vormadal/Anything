import type {
  RenovationLineResponse,
  RenovationProjectResponse,
  RenovationRoomResponse,
} from "@/lib/api-client/models/index";
import { formatKr, formatOneDecimal, round2 } from "@/lib/renovation";

/**
 * Display arithmetic for the project overview and its room rows. Estimate,
 * actual and forecast come from the server; the only figure computed here is
 * "bought vs estimate", which the API does not return.
 */

export interface BoughtVsEstimate {
  /** Actual spend on the lines that have something bought. */
  actual: number;
  /** The estimate for only the quantity bought on those lines. */
  estimateShare: number;
  /** actual − estimateShare: positive is over estimate, negative under. */
  delta: number;
  /** delta as a share of estimateShare, or null when nothing was estimated. */
  percent: number | null;
  /** True when at least one line has a purchased quantity. */
  hasPurchases: boolean;
}

/**
 * Sums "actual − estimate share for the quantity bought" over every line with
 * a purchased quantity, where the estimate share is
 * `estimate × purchasedQuantity / requiredQuantity`.
 */
export function boughtVsEstimate(lines: readonly RenovationLineResponse[]): BoughtVsEstimate {
  let actual = 0;
  let estimateShare = 0;
  let hasPurchases = false;

  for (const line of lines) {
    const bought = line.purchasedQuantity ?? 0;
    if (bought <= 0) continue;
    hasPurchases = true;
    const required = line.requiredQuantity ?? 0;
    const share = required > 0 ? (line.estimate ?? 0) * (bought / required) : 0;
    actual += line.actual ?? 0;
    estimateShare += share;
  }

  const actualRounded = round2(actual);
  const shareRounded = round2(estimateShare);
  const delta = round2(actualRounded - shareRounded);
  return {
    actual: actualRounded,
    estimateShare: shareRounded,
    delta,
    percent: shareRounded > 0 ? round2((delta / shareRounded) * 100) : null,
    hasPurchases,
  };
}

export function allLines(project: Pick<RenovationProjectResponse, "rooms">): RenovationLineResponse[] {
  return (project.rooms ?? []).flatMap((room) => room.lines ?? []);
}

/** Lines whose quantity is not yet fully bought. */
export function linesStillToBuy(lines: readonly RenovationLineResponse[]): number {
  return lines.filter((line) => (line.remainingQuantity ?? 0) > 0).length;
}

/** Lines whose required quantity is fully bought. */
export function linesBought(lines: readonly RenovationLineResponse[]): number {
  return lines.filter((line) => line.status === "Complete").length;
}

export function floorAreaOf(rooms: readonly RenovationRoomResponse[]): number {
  return round2(rooms.reduce((sum, room) => sum + (room.floorArea ?? 0), 0));
}

export interface BudgetBarWidths {
  spentPercent: number;
  toBuyPercent: number;
  headroomPercent: number;
}

/**
 * Widths of the stacked budget bar as percentages of the larger of budget and
 * forecast, so an overrun fills the bar rather than spilling out of it.
 */
export function budgetBarWidths(
  spent: number,
  forecast: number,
  budget: number,
): BudgetBarWidths {
  const scale = Math.max(budget, forecast);
  if (scale <= 0) return { spentPercent: 0, toBuyPercent: 0, headroomPercent: 0 };
  const toBuy = Math.max(0, forecast - spent);
  const headroom = Math.max(0, budget - forecast);
  return {
    spentPercent: (Math.max(0, spent) / scale) * 100,
    toBuyPercent: (toBuy / scale) * 100,
    headroomPercent: (headroom / scale) * 100,
  };
}

/** Share of a room's forecast already spent, for its mini progress bar. */
export function percentSpent(actual: number, forecast: number): number {
  if (forecast <= 0) return 0;
  return Math.min(100, Math.max(0, (actual / forecast) * 100));
}

/** Tailwind text colour for a variance: orange over estimate, blue under, neutral at zero. */
export function varianceTextClass(delta: number): string {
  if (delta > 0) return "text-orange-700 dark:text-orange-400";
  if (delta < 0) return "text-blue-700 dark:text-blue-400";
  return "text-gray-500 dark:text-gray-400";
}

/** "+2.593 kr.", "−100 kr." or "0 kr.". */
export function formatSignedKr(amount: number): string {
  if (amount > 0) return `+${formatKr(amount)}`;
  if (amount < 0) return `−${formatKr(Math.abs(amount))}`;
  return formatKr(0);
}

export function formatMetres(value: number): string {
  return formatOneDecimal(value);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
