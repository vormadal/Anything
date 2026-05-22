"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";
import { useExportRecipeTags, useImportRecipeTags } from "@/hooks/useRecipes";
import { isAdmin } from "@/lib/roles";

type RecipeTagImportData = {
  recipes: Array<{
    recipeName: string;
    tags: string[];
  }>;
};

export default function RecipeTagsAdminPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRecipeTags = useExportRecipeTags();
  const importRecipeTags = useImportRecipeTags();

  if (user && !isAdmin(user.role)) {
    router.push("/");
    return null;
  }

  const handleExport = async () => {
    try {
      await exportRecipeTags.mutateAsync();
      toast.success("Recipe tags exported.");
    } catch {
      toast.error("Failed to export recipe tags.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as RecipeTagImportData;
      await importRecipeTags.mutateAsync(data);
      toast.success("Recipe tags imported.");
    } catch {
      toast.error("Failed to import recipe tags.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Recipe Tags</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Export includes recipe name, ingredients, and tags. Import uses recipe name as key and fully replaces each recipe’s tag list.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={exportRecipeTags.isPending}
            aria-label="Export recipe tags"
          >
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleImportClick}
            disabled={importRecipeTags.isPending}
            aria-label="Import recipe tags"
          >
            <Upload className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Import</span>
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    </div>
  );
}
