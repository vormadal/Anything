"use client";

import Link from "next/link";
import type { RenovationRoomResponse } from "@/lib/api-client/models/index";
import { formatKr, formatQty } from "@/lib/renovation";
import { MiniBar } from "@/components/renovation/overview/MiniBar";
import {
  boughtVsEstimate,
  formatMetres,
  linesBought,
  percentSpent,
  varianceTextClass,
  formatSignedKr,
} from "@/components/renovation/overview/overviewMath";

const NOT_STARTED = "Not started";
const ESTIMATE_ONLY = "estimate only";

/** Rooms of one project, each linking to its room detail. */
export function ProjectRoomList({
  projectId,
  rooms,
}: {
  projectId: number;
  rooms: readonly RenovationRoomResponse[];
}) {
  return (
    <ul className="space-y-2.5">
      {rooms.map((room) => (
        <li key={room.id}>
          <RoomRow projectId={projectId} room={room} />
        </li>
      ))}
    </ul>
  );
}

function RoomRow({ projectId, room }: { projectId: number; room: RenovationRoomResponse }) {
  const roomId = room.id ?? 0;
  const lines = room.lines ?? [];
  const bought = boughtVsEstimate(lines);
  const forecast = room.forecast ?? 0;
  const actual = room.actual ?? 0;
  const floorArea = room.floorArea ?? 0;
  const dimensions = `${formatMetres(room.length ?? 0)} × ${formatMetres(room.width ?? 0)} m`;
  const boughtCount = linesBought(lines);

  const progressText = bought.hasPurchases
    ? `${boughtCount} of ${lines.length} bought`
    : ESTIMATE_ONLY;

  return (
    <Link
      href={`/renovation/${projectId}/rooms/${roomId}`}
      className="flex flex-col gap-2.5 rounded-lg border border-gray-200 bg-white p-3.5 text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700/50"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{room.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {`${dimensions} · ${formatQty(floorArea, "m²")} · ${progressText}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <p className="text-sm font-semibold">{formatKr(forecast)}</p>
          {bought.hasPurchases ? (
            <p className={`text-xs font-medium ${varianceTextClass(bought.delta)}`}>
              {`${formatSignedKr(bought.delta)} vs est.`}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">{NOT_STARTED}</p>
          )}
        </div>
      </div>
      <MiniBar percent={percentSpent(actual, forecast)} />
    </Link>
  );
}
