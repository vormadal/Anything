"use client";

import { formatKr } from "@/lib/renovation";

interface RoomStatsProps {
  estimate: number;
  actual: number;
  forecast: number;
}

const TILE_CLASS = "flex flex-col gap-0.5 rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5";
const TILE_LABEL_CLASS = "text-xs text-gray-500 dark:text-gray-400";
const TILE_VALUE_CLASS = "text-sm font-semibold text-gray-900 dark:text-white";
const OVER_TILE_CLASS = "flex flex-col gap-0.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 p-2.5";
const OVER_TEXT_CLASS = "text-orange-700 dark:text-orange-400";

/** Estimate, spent and forecast for one room. Forecast turns orange once it passes the estimate. */
export function RoomStats({ estimate, actual, forecast }: RoomStatsProps) {
  const over = forecast > estimate;
  return (
    <section aria-label="Room budget" className="grid grid-cols-3 gap-2">
      <div className={TILE_CLASS}>
        <span className={TILE_LABEL_CLASS}>Estimate</span>
        <span className={TILE_VALUE_CLASS}>{formatKr(estimate)}</span>
      </div>
      <div className={TILE_CLASS}>
        <span className={TILE_LABEL_CLASS}>Spent</span>
        <span className={TILE_VALUE_CLASS}>{formatKr(actual)}</span>
      </div>
      <div className={over ? OVER_TILE_CLASS : TILE_CLASS}>
        <span className={over ? OVER_TEXT_CLASS : TILE_LABEL_CLASS}>Forecast</span>
        <span className={over ? `text-sm font-semibold ${OVER_TEXT_CLASS}` : TILE_VALUE_CLASS}>
          {formatKr(forecast)}
        </span>
      </div>
    </section>
  );
}
