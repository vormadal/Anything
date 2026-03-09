export const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const DEFAULT_ACTIVE_DAYS = 31;

export function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
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
