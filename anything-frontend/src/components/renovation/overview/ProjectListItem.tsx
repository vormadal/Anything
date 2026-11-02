"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { RenovationProjectSummaryResponse } from "@/lib/api-client/models/index";
import { formatKr } from "@/lib/renovation";
import { MiniBar } from "@/components/renovation/overview/MiniBar";
import { pluralize, percentSpent } from "@/components/renovation/overview/overviewMath";

/** One project on the `/renovation` list: forecast against budget, plus its room count. */
export function ProjectListItem({ project }: { project: RenovationProjectSummaryResponse }) {
  const id = project.id ?? 0;
  const forecast = project.forecast ?? 0;
  const actual = project.actual ?? 0;
  const budget = project.budget ?? null;
  const roomCount = project.roomCount ?? 0;

  return (
    <li>
      <Link
        href={`/renovation/${id}`}
        className="flex min-h-11 flex-col gap-2 p-4 text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {pluralize(roomCount, "room")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold">{formatKr(forecast)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {budget !== null ? `of ${formatKr(budget)} budget` : "No budget set"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
        </div>
        {budget !== null && budget > 0 && <MiniBar percent={percentSpent(actual, budget)} />}
      </Link>
    </li>
  );
}
