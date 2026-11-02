"use client";

import { useParams } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import { LoadErrorState } from "@/components/LoadErrorState";
import { RoomWizard } from "@/components/renovation/wizard/RoomWizard";
import { useRenovationMaterials, useRenovationRoomTemplates } from "@/hooks/useRenovation";
import { loadFailure } from "@/lib/queryState";

export default function NewRenovationRoomPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const templates = useRenovationRoomTemplates();
  const materials = useRenovationMaterials();
  const failure = loadFailure(templates, materials);
  const loading = templates.isLoading || materials.isLoading;

  return (
    <div className="mx-auto flex max-w-lg flex-col">
      <PageTitle>Add room</PageTitle>
      {loading ? (
        <div aria-busy="true" aria-label="Loading room types" className="flex flex-col gap-4 px-4 py-6">
          <div className="h-1 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      ) : failure.failed ? (
        <div className="px-4 py-6">
          <LoadErrorState
            what="room types and prices"
            onRetry={failure.retry}
            isRetrying={failure.isRetrying}
          />
        </div>
      ) : (
        <RoomWizard
          projectId={projectId}
          templates={templates.data ?? []}
          materials={materials.data ?? []}
        />
      )}
    </div>
  );
}
