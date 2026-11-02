"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { RenovationProjectResponse } from "@/lib/api-client/models/index";
import { Button } from "@/components/ui/button";
import { formatKr, formatOneDecimal } from "@/lib/renovation";
import {
  allLines,
  boughtVsEstimate,
  budgetBarWidths,
  formatSignedKr,
  linesStillToBuy,
  varianceTextClass,
} from "@/components/renovation/overview/overviewMath";

interface ProjectBudgetCardProps {
  project: RenovationProjectResponse;
  onSetBudget: () => void;
}

const STATUS_ON_TRACK = "On track";
const STATUS_OVER = "Over budget";

/** Budget headline for a project: forecast against budget, spend split, and bought vs estimate. */
export function ProjectBudgetCard({ project, onSetBudget }: ProjectBudgetCardProps) {
  const projectId = project.id ?? 0;
  const forecast = project.forecast ?? 0;
  const actual = project.actual ?? 0;
  const estimate = project.estimate ?? 0;
  const budget = project.budget ?? null;
  const lines = allLines(project);
  const bought = boughtVsEstimate(lines);
  const toBuyCount = linesStillToBuy(lines);
  const hasBudget = budget !== null;
  const over = hasBudget && forecast > budget;
  const headroom = hasBudget ? budget - forecast : 0;
  const widths = hasBudget ? budgetBarWidths(actual, forecast, budget) : null;

  return (
    <section
      aria-label="Budget status"
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Budget</h2>
        {hasBudget && (
          <span
            className={
              over
                ? "rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                : "rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            }
          >
            {over ? STATUS_OVER : STATUS_ON_TRACK}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">Forecast</span>
        <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {formatKr(forecast)}
        </span>
        {hasBudget ? (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {`of ${formatKr(budget)} budget · ${over ? `${formatKr(Math.abs(headroom))} over` : `${formatKr(headroom)} headroom`}`}
          </span>
        ) : (
          <Button variant="outline" className="mt-2 h-11 self-start" onClick={onSetBudget}>
            Set a budget
          </Button>
        )}
      </div>

      {widths && (
        <div className="space-y-2">
          <div
            role="img"
            aria-label={`Spent ${formatKr(actual)}, still to buy ${formatKr(Math.max(0, forecast - actual))}, headroom ${formatKr(Math.max(0, headroom))}`}
            className="flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
          >
            <div className="h-full bg-gray-900 dark:bg-gray-100" style={{ width: `${widths.spentPercent}%` }} />
            <div className="h-full bg-blue-300 dark:bg-blue-500" style={{ width: `${widths.toBuyPercent}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gray-900 dark:bg-gray-100" aria-hidden="true" />
              Spent {formatKr(actual)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-300 dark:bg-blue-500" aria-hidden="true" />
              Still to buy {formatKr(Math.max(0, forecast - actual))}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700" aria-hidden="true" />
              Headroom
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/40">
          <span className="text-xs text-gray-500 dark:text-gray-400">Estimated</span>
          <span className="text-base font-semibold text-gray-900 dark:text-white">{formatKr(estimate)}</span>
        </div>
        <div
          className={
            bought.delta > 0
              ? "flex flex-col gap-0.5 rounded-lg bg-orange-50 px-3 py-2.5 dark:bg-orange-900/20"
              : "flex flex-col gap-0.5 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/40"
          }
        >
          <span className="text-xs text-gray-500 dark:text-gray-400">Bought vs estimate</span>
          <span className={`text-base font-semibold ${varianceTextClass(bought.delta)}`}>
            {formatSignedKr(bought.delta)}
            {bought.percent !== null && ` (${formatOneDecimal(Math.abs(bought.percent))}%)`}
          </span>
        </div>
      </div>

      <Link
        href={`/renovation/${projectId}/shopping`}
        className="-mx-4 -mb-4 flex min-h-11 items-center justify-between border-t border-gray-200 px-4 text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700/50"
      >
        <span className="text-sm font-medium">Shopping list &amp; purchases</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          {`${toBuyCount} ${toBuyCount === 1 ? "line" : "lines"} to buy`}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}
