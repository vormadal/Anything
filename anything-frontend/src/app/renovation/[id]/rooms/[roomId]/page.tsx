"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import { LoadErrorState } from "@/components/LoadErrorState";
import { Button } from "@/components/ui/button";
import { RoomLines } from "@/components/renovation/room/RoomLines";
import { RoomMenu } from "@/components/renovation/room/RoomMenu";
import { RoomStats } from "@/components/renovation/room/RoomStats";
import { RoomDialogs } from "@/components/renovation/room/RoomDialogs";
import type { RoomDialogState } from "@/components/renovation/room/roomDisplay";
import { useRenovationProject } from "@/hooks/useRenovation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { loadFailure } from "@/lib/queryState";
import { formatOneDecimal, formatQty } from "@/lib/renovation";

const SKELETON_CLASS = "rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse";
const PAGE_CLASS = "container mx-auto max-w-2xl px-4 py-4";
const EMPTY_CLASS = "container mx-auto max-w-2xl px-4 py-8 text-center";

function dimension(value: number | null | undefined): string {
  return formatOneDecimal(value ?? 0);
}

export default function RenovationRoomPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const roomId = Number(params.roomId);
  const { setLeftAction } = useHeaderActions();
  const projectQuery = useRenovationProject(projectId);
  const load = loadFailure(projectQuery);
  const [dialog, setDialog] = useState<RoomDialogState | null>(null);

  useEffect(() => {
    setLeftAction({ type: "back", href: `/renovation/${projectId}` });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction, projectId]);

  const room = projectQuery.data?.rooms?.find((candidate) => candidate.id === roomId);

  if (load.failed) {
    return (
      <div className={PAGE_CLASS}>
        <LoadErrorState what="this room" onRetry={load.retry} isRetrying={load.isRetrying} />
      </div>
    );
  }

  if (projectQuery.isLoading) {
    return (
      <div className={`${PAGE_CLASS} space-y-4`} aria-busy="true" aria-label="Loading room">
        <div className={`${SKELETON_CLASS} h-5 w-2/3`} />
        <div className="grid grid-cols-3 gap-2">
          <div className={`${SKELETON_CLASS} h-16`} />
          <div className={`${SKELETON_CLASS} h-16`} />
          <div className={`${SKELETON_CLASS} h-16`} />
        </div>
        <div className={`${SKELETON_CLASS} h-48`} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className={EMPTY_CLASS}>
        <p className="text-gray-500 dark:text-gray-400">Room not found.</p>
        <Link href={`/renovation/${projectId}`} className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Back to project
        </Link>
      </div>
    );
  }

  const lines = room.lines ?? [];

  return (
    <div className={`${PAGE_CLASS} space-y-4`}>
      <PageTitle>{room.name ?? "Room"}</PageTitle>

      <div className="flex items-start justify-between gap-2">
        <p className="pt-2 text-sm text-gray-500 dark:text-gray-400">
          {dimension(room.length)} × {dimension(room.width)} × {dimension(room.height)} m · floor{" "}
          {formatQty(room.floorArea ?? 0, "m²")} · walls {formatQty(room.wallArea ?? 0, "m²")}
        </p>
        <RoomMenu
          onEditSize={() => setDialog({ kind: "editRoom" })}
          onDelete={() => setDialog({ kind: "deleteRoom" })}
        />
      </div>

      <RoomStats
        estimate={room.estimate ?? 0}
        actual={room.actual ?? 0}
        forecast={room.forecast ?? 0}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Budget lines ({lines.length})</h2>
        <Button variant="outline" className="min-h-[44px]" onClick={() => setDialog({ kind: "addLine" })}>
          Add line
        </Button>
      </div>

      <RoomLines
        lines={lines}
        onSelect={(line) => setDialog({ kind: "line", lineId: line.id ?? 0 })}
      />

      <RoomDialogs
        projectId={projectId}
        room={room}
        dialog={dialog}
        onOpen={setDialog}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
