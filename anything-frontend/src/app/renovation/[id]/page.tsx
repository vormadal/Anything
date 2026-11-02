"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { LoadErrorState } from "@/components/LoadErrorState";
import { DetailActionsMenu } from "@/components/inventory/DetailActionsMenu";
import { ConfirmDeleteDialog } from "@/components/inventory/ConfirmDeleteDialog";
import { useHeaderActions } from "@/context/PageActionsContext";
import { loadFailure } from "@/lib/queryState";
import {
  useDeleteRenovationProject,
  useRenovationProject,
  useUpdateRenovationProject,
} from "@/hooks/useRenovation";
import { ProjectFormDialog, type ProjectFormValues } from "@/components/renovation/overview/ProjectFormDialog";
import { ProjectBudgetCard } from "@/components/renovation/overview/ProjectBudgetCard";
import { ProjectRoomList } from "@/components/renovation/overview/ProjectRoomList";
import { floorAreaOf, pluralize } from "@/components/renovation/overview/overviewMath";
import { formatQty } from "@/lib/renovation";

const PROJECTS_HREF = "/renovation";

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { responseStatusCode?: number }).responseStatusCode === 404
  );
}

export default function RenovationProjectPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  const projectQuery = useRenovationProject(projectId);
  const { data: project, isLoading, error } = projectQuery;
  const projectLoad = loadFailure(projectQuery);
  const updateProject = useUpdateRenovationProject();
  const deleteProject = useDeleteRenovationProject();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasProject = project !== undefined;

  useEffect(() => {
    if (!hasProject) return;
    setHeaderActions(
      <DetailActionsMenu
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        deleteLabel="Delete project"
      />,
      false,
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, hasProject]);

  const handleSave = async (values: ProjectFormValues) => {
    try {
      // The update is a full PUT, so the notes are sent back unchanged.
      await updateProject.mutateAsync({
        id: projectId,
        name: values.name,
        budget: values.budget,
        notes: project?.notes ?? undefined,
      });
      setEditOpen(false);
    } catch {
      toast.error("Couldn't save the project");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(projectId);
      setDeleteOpen(false);
      // Terminal action that navigates away, so the outcome is confirmed out of band.
      toast.success("Project deleted");
      router.push(PROJECTS_HREF);
    } catch {
      toast.error("Couldn't delete the project");
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading...</div>
    );
  }

  if (!project) {
    if (projectLoad.failed && !isNotFoundError(error)) {
      return (
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <PageTitle>Renovation</PageTitle>
          <LoadErrorState what="this project" onRetry={projectLoad.retry} isRetrying={projectLoad.isRetrying} />
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <PageTitle>Renovation</PageTitle>
        <p className="text-gray-500 dark:text-gray-400">Project not found.</p>
      </div>
    );
  }

  const rooms = project.rooms ?? [];
  const floorArea = floorAreaOf(rooms);

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-5">
      <PageTitle>{project.name ?? "Renovation project"}</PageTitle>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {`${pluralize(rooms.length, "room")} · ${formatQty(floorArea, "m²")} floor`}
      </p>

      <ProjectBudgetCard project={project} onSetBudget={() => setEditOpen(true)} />

      <section aria-labelledby="renovation-rooms-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="renovation-rooms-heading" className="text-base font-semibold text-gray-900 dark:text-white">
            Rooms
          </h2>
          <Button asChild className="h-11">
            <Link href={`/renovation/${projectId}/rooms/new`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add room
            </Link>
          </Button>
        </div>
        {rooms.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No rooms yet. Add a room to start budgeting.
          </p>
        ) : (
          <ProjectRoomList projectId={projectId} rooms={rooms} />
        )}
      </section>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit project"
        submitLabel="Save"
        initial={{ name: project.name ?? "", budget: project.budget }}
        isPending={updateProject.isPending}
        onSubmit={(values) => void handleSave(values)}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this project?"
        message="This removes the project and everything in it. This can't be undone."
        isPending={deleteProject.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
