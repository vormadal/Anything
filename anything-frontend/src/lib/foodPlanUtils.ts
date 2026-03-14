export const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const DEFAULT_ACTIVE_DAYS = 31;

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function bitmaskToDaySet(bitmask: number): Set<number> {
  const days = new Set<number>();
  for (let i = 0; i < 7; i++) {
    if ((bitmask >> i) & 1) days.add(i);
  }
  return days;
}

export function daySetToBitmask(days: Set<number>): number {
  let bitmask = 0;
  for (const d of days) bitmask |= 1 << d;
  return bitmask;
}
