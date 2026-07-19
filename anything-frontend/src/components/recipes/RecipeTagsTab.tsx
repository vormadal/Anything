"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useRecipeTagCatalog,
  useRenameRecipeTag,
  useDeleteRecipeTagByName,
} from "@/hooks/useRecipes";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function RecipeTagsTab() {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; count: number } | null>(null);

  const { data: tags = [], isLoading } = useRecipeTagCatalog();
  const renameTag = useRenameRecipeTag();
  const deleteTag = useDeleteRecipeTagByName();
  const isOnline = useOnlineStatus();

  const handleStartEdit = (name: string) => {
    setEditingName(name);
    setEditValue(name);
  };

  const handleSaveEdit = async () => {
    if (!editingName || !editValue.trim() || editValue.trim() === editingName) {
      setEditingName(null);
      return;
    }
    try {
      await renameTag.mutateAsync({ name: editingName, newName: editValue.trim() });
      setEditingName(null);
      toast.success("Tag renamed.");
    } catch {
      toast.error("Failed to rename tag.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTag.mutateAsync(deleteTarget.name);
      setDeleteTarget(null);
      toast.success("Tag deleted.");
    } catch {
      toast.error("Failed to delete tag.");
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Rename or delete a tag everywhere it&apos;s used across your recipes.
      </p>

      {editingName !== null && (
        <div className="mb-4 p-3 border border-green-200 dark:border-green-700 rounded-md bg-green-50 dark:bg-green-900/20 flex flex-col gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Tag name"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditingName(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={!editValue.trim() || renameTag.isPending || !isOnline}
              title={isOnline ? undefined : "Renaming a tag requires an internet connection"}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Loading...</p>
      ) : tags.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
          No tags yet. Add tags to your recipes to see them here.
        </p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.name}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <span className="text-gray-900 dark:text-white font-medium text-sm">
                {tag.name} <span className="text-gray-400 dark:text-gray-500 font-normal">({tag.count})</span>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartEdit(tag.name)}
                  disabled={!isOnline}
                  title={isOnline ? undefined : "Renaming a tag requires an internet connection"}
                  aria-label="Rename tag"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget({ name: tag.name, count: tag.count })}
                  disabled={!isOnline}
                  title={isOnline ? undefined : "Deleting a tag requires an internet connection"}
                  aria-label="Delete tag"
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent aria-describedby="delete-tag-description">
          <DialogHeader>
            <DialogTitle>Delete tag &ldquo;{deleteTarget?.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p id="delete-tag-description" className="text-sm text-gray-600 dark:text-gray-400">
            This removes the tag from {deleteTarget?.count} recipe{deleteTarget?.count === 1 ? "" : "s"}. This
            can&apos;t be undone.
          </p>
          <DialogFooter className="flex gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteTag.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteTag.isPending}
              aria-label="Confirm delete tag"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
