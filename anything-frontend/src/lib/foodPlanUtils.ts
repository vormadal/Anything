export const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
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

function bitmaskToIndexSet(bitmask: number, size: number): Set<number> {
  const indexes = new Set<number>();
  for (let i = 0; i < size; i++) {
    if ((bitmask >> i) & 1) indexes.add(i);
  }
  return indexes;
}

function indexSetToBitmask(indexes: Set<number>): number {
  let bitmask = 0;
  for (const i of indexes) bitmask |= 1 << i;
  return bitmask;
}

export function bitmaskToDaySet(bitmask: number): Set<number> {
  return bitmaskToIndexSet(bitmask, ALL_DAYS.length);
}

export function daySetToBitmask(days: Set<number>): number {
  return indexSetToBitmask(days);
}

export function bitmaskToMonthSet(bitmask: number): Set<number> {
  return bitmaskToIndexSet(bitmask, ALL_MONTHS.length);
}

export function monthSetToBitmask(months: Set<number>): number {
  return indexSetToBitmask(months);
}
