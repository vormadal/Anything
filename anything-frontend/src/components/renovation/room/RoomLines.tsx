"use client";

import type { RenovationLineResponse } from "@/lib/api-client/models/index";
import { formatKr } from "@/lib/renovation";
import {
  groupLines,
  lineAmount,
  lineStatusLabel,
  lineVariance,
  formatSignedAmount,
  varianceClass,
} from "./roomDisplay";

interface RoomLinesProps {
  lines: RenovationLineResponse[];
  onSelect: (line: RenovationLineResponse) => void;
}

const ROW_CLASS =
  "flex w-full min-h-[60px] items-center gap-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-left text-gray-900 dark:text-white first:border-t-0 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/** Budget lines grouped by Surfaces / Fixtures / Labour; each row opens the line's actions. */
export function RoomLines({ lines, onSelect }: RoomLinesProps) {
  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        No budget lines yet. Add one to start estimating this room.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groupLines(lines).map((group) => (
        <section key={group.name} aria-label={group.name} className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {group.name}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {group.boughtCount} of {group.lines.length} bought
            </span>
          </div>
          <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            {group.lines.map((line) => (
              <LineRow key={line.id} line={line} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LineRow({
  line,
  onSelect,
}: {
  line: RenovationLineResponse;
  onSelect: (line: RenovationLineResponse) => void;
}) {
  const variance = lineVariance(line);
  return (
    <button type="button" className={ROW_CLASS} onClick={() => onSelect(line)}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold">{line.label}</span>
        {line.description && (
          <span className="truncate text-xs text-gray-500 dark:text-gray-400">{line.description}</span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">{lineStatusLabel(line)}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 whitespace-nowrap">
        <span className="text-sm font-semibold">{formatKr(lineAmount(line))}</span>
        {variance !== null && (
          <span className={`text-xs font-medium ${varianceClass(variance)}`}>
            {formatSignedAmount(variance)} vs est.
          </span>
        )}
      </span>
    </button>
  );
}
