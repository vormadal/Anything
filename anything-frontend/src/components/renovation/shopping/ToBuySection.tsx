"use client";

import type { RenovationMaterialResponse } from "@/lib/api-client/models/index";
import { formatKr, formatQty, type ToBuyGroup } from "@/lib/renovation";
import { packHint } from "./shoppingView";

interface ToBuySectionProps {
  title: string;
  groups: readonly ToBuyGroup[];
  selected: ReadonlySet<string>;
  materialsById: ReadonlyMap<number, RenovationMaterialResponse>;
  onToggle: (key: string) => void;
}

function roomBreakdown(group: ToBuyGroup): string {
  return group.lines
    .map((line) => `${line.roomName} ${formatQty(line.remainingQuantity, group.unit)}`)
    .join(" · ");
}

export function ToBuySection({ title, groups, selected, materialsById, onToggle }: ToBuySectionProps) {
  if (groups.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h2>
      <ul className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        {groups.map((group) => {
          const isOn = selected.has(group.key);
          const hint = packHint(group, materialsById);
          return (
            <li key={group.key} className="border-t border-gray-100 first:border-t-0 dark:border-gray-700">
              <label
                className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${
                  isOn ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => onToggle(group.key)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-gray-900 dark:accent-white"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{group.description}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{roomBreakdown(group)}</span>
                  {hint && <span className="text-xs text-blue-800 dark:text-blue-300">{hint}</span>}
                </span>
                <span className="flex flex-col items-end gap-0.5 whitespace-nowrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatKr(group.totalEstimate)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatQty(group.totalQuantity, group.unit)}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
