"use client";

import Link from "next/link";
import { ChevronRight, Hammer } from "lucide-react";
import { LoadErrorState } from "@/components/LoadErrorState";
import { MiniBar } from "@/components/renovation/overview/MiniBar";
import { percentSpent, pluralize } from "@/components/renovation/overview/overviewMath";
import { useRenovationProjects } from "@/hooks/useRenovation";
import type { RenovationProjectSummaryResponse } from "@/lib/api-client/models/index";
import { formatKr } from "@/lib/renovation";
import { loadFailure } from "@/lib/queryState";

const MUTED_CLASS = "text-gray-500 dark:text-gray-400";

/** The project worth showing on the home page: whichever was touched most recently. */
export function mostRecentProject(
  projects: readonly RenovationProjectSummaryResponse[],
): RenovationProjectSummaryResponse | undefined {
  const timestamp = (project: RenovationProjectSummaryResponse) =>
    new Date(project.modifiedOn ?? project.createdOn ?? 0).getTime() || 0;
  return projects.reduce<RenovationProjectSummaryResponse | undefined>(
    (latest, project) => (!latest || timestamp(project) > timestamp(latest) ? project : latest),
    undefined,
  );
}

/** On track while the forecast fits the budget, over budget once it doesn't; null with no budget to compare. */
export function budgetStatus(
  forecast: number,
  budget: number | null | undefined,
): { label: string; className: string } | null {
  if (budget === null || budget === undefined || budget <= 0) return null;
  return forecast > budget
    ? { label: "Over budget", className: "text-orange-700 dark:text-orange-400" }
    : { label: "On track", className: "text-green-700 dark:text-green-400" };
}

function CardHeader() {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Hammer className="h-5 w-5 text-orange-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Renovation</h2>
      </div>
    </div>
  );
}

/** Home card: the most recently updated renovation project, its forecast against budget. */
export function RenovationHomeCard() {
  const projectsQuery = useRenovationProjects();
  const { data: projects, isLoading } = projectsQuery;
  const load = loadFailure(projectsQuery);

  if (load.failed) {
    return (
      <section>
        <CardHeader />
        <LoadErrorState what="renovation projects" onRetry={load.retry} isRetrying={load.isRetrying} />
      </section>
    );
  }

  if (isLoading || !projects) {
    return (
      <section>
        <CardHeader />
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section>
        <CardHeader />
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className={`text-sm mb-2 ${MUTED_CLASS}`}>No renovation projects yet</p>
          <Link
            href="/renovation"
            className="inline-flex min-h-11 items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Start a renovation project
          </Link>
        </div>
      </section>
    );
  }

  const project = mostRecentProject(projects)!;
  const id = project.id ?? 0;
  const forecast = project.forecast ?? 0;
  const budget = project.budget ?? null;
  const status = budgetStatus(forecast, budget);

  return (
    <section>
      <CardHeader />
      <Link
        href={`/renovation/${id}`}
        className="flex w-full flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{project.name}</p>
            <p className={`text-xs ${MUTED_CLASS}`}>{pluralize(project.roomCount ?? 0, "room")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <p className="text-base font-bold text-gray-900 dark:text-white">{formatKr(forecast)}</p>
              <p className={`text-xs ${MUTED_CLASS}`}>
                {budget !== null && budget > 0 ? `of ${formatKr(budget)} budget` : "No budget set"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
        </div>
        {status && budget !== null && (
          <>
            <MiniBar percent={percentSpent(forecast, budget)} />
            <p className={`text-xs font-medium ${status.className}`}>{status.label}</p>
          </>
        )}
      </Link>
      <div className="pt-2 text-right">
        <Link
          href="/renovation"
          className="inline-flex min-h-11 items-center text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          All projects →
        </Link>
      </div>
    </section>
  );
}
