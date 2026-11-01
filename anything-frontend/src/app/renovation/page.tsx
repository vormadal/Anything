"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { LoadErrorState } from "@/components/LoadErrorState";
import { loadFailure } from "@/lib/queryState";
import { useCreateRenovationProject, useRenovationProjects } from "@/hooks/useRenovation";
import { ProjectFormDialog, type ProjectFormValues } from "@/components/renovation/overview/ProjectFormDialog";
import { ProjectListItem } from "@/components/renovation/overview/ProjectListItem";

const MATERIALS_HREF = "/renovation/materials";

export default function RenovationPage() {
  const router = useRouter();
  const projectsQuery = useRenovationProjects();
  const { data: projects, isLoading } = projectsQuery;
  const projectsLoad = loadFailure(projectsQuery);
  const createProject = useCreateRenovationProject();
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreate = async (values: ProjectFormValues) => {
    try {
      const created = await createProject.mutateAsync(values);
      if (created?.id == null) {
        toast.error("Couldn't create the project");
        return;
      }
      setCreateOpen(false);
      router.push(`/renovation/${created.id}`);
    } catch {
      toast.error("Couldn't create the project");
    }
  };

  const hasProjects = (projects ?? []).length > 0;

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <PageTitle>Renovation</PageTitle>

      <div className="flex items-center justify-between gap-3">
        <Link
          href={MATERIALS_HREF}
          className="flex min-h-11 items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Materials library
        </Link>
        <Button className="h-11" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New project
        </Button>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading...</div>
      )}

      {projectsLoad.failed && (
        <LoadErrorState
          what="renovation projects"
          onRetry={projectsLoad.retry}
          isRetrying={projectsLoad.isRetrying}
        />
      )}

      {!isLoading && !projectsLoad.failed && !hasProjects && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No renovation projects yet</p>
          <Button className="h-11" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create your first project
          </Button>
        </div>
      )}

      {!isLoading && !projectsLoad.failed && hasProjects && (
        <ul className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {(projects ?? []).map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
        </ul>
      )}

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New renovation project"
        submitLabel="Create project"
        isPending={createProject.isPending}
        onSubmit={(values) => void handleCreate(values)}
      />
    </div>
  );
}
