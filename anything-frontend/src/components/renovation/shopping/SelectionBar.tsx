"use client";

import { Button } from "@/components/ui/button";
import { formatKr } from "@/lib/renovation";
import type { SelectionSummary } from "./shoppingView";

interface SelectionBarProps {
  summary: SelectionSummary;
  onRecord: () => void;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function SelectionBar({ summary, onRecord }: SelectionBarProps) {
  const headline = [
    plural(summary.groupCount, "material", "materials"),
    plural(summary.lineCount, "line", "lines") + " in " + plural(summary.roomCount, "room", "rooms"),
  ].join(" · ");

  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{headline}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Estimated {formatKr(summary.estimate)}
        </span>
      </div>
      <Button onClick={onRecord} className="h-11 shrink-0 px-4">
        Record purchase
      </Button>
    </div>
  );
}
