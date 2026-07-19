"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EditListNameDialog } from "@/components/EditListNameDialog";
import { useHeaderActions } from "@/context/PageActionsContext";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { useCurrentUser } from "@/hooks/useAuth";
import { canManageHousehold } from "@/lib/roles";
import {
  useShoppingListTemplates,
  useUpdateShoppingList,
  useDeleteShoppingList,
} from "@/hooks/useShoppingLists";
import {
  ChevronRight,
  LayoutTemplate,
  ListChecks,
  Pencil,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import type { ShoppingListTemplateResponse } from "@/lib/api-client/models/index";

const SHOPPING_TYPE = 1;

export default function TemplatesPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const params = useParams();
  const householdId = typeof params.id === "string" ? params.id : "";
  const { getHouseholdRole, isLoading: householdsLoading } = useHouseholdContext();
  const { setLeftAction } = useHeaderActions();

  const { data: templates, isLoading } = useShoppingListTemplates();
  const updateList = useUpdateShoppingList();
  const deleteList = useDeleteShoppingList();

  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ShoppingListTemplateResponse | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (householdId) {
      setLeftAction({ type: "back", href: `/households/${householdId}` });
    }
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction, householdId]);

  if (
    user &&
    !householdsLoading &&
    !canManageHousehold(getHouseholdRole(Number(householdId)))
  ) {
    router.push("/");
    return null;
  }

  const openRename = (template: ShoppingListTemplateResponse) => {
    setRenameTarget({ id: template.id!, name: template.name ?? "" });
    setRenameValue(template.name ?? "");
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    try {
      await updateList.mutateAsync({ id: renameTarget.id, name: trimmed });
      setRenameTarget(null);
      toast.success("Template renamed.");
    } catch {
      toast.error("Failed to rename template.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteList.mutateAsync(deleteTarget.id!);
      setDeleteTarget(null);
      toast.success("Template deleted.");
    } catch {
      toast.error("Failed to delete template.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Templates</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Reusable templates for creating new lists. Rename or delete a template, or open one to
          edit its items.
        </p>

        {isLoading ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Loading...</p>
        ) : !templates || templates.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center gap-2">
            <LayoutTemplate className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              No templates yet. Open a list and choose &ldquo;Save as template&rdquo; to create one.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md"
              >
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/households/${householdId}/lists/templates/${template.id}`)
                  }
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  aria-label={`Edit template ${template.name}`}
                >
                  <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    {template.type === SHOPPING_TYPE ? (
                      <ShoppingCart className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ListChecks className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {template.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {template.itemCount} {template.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openRename(template)}
                  aria-label={`Rename template ${template.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(template)}
                  aria-label={`Delete template ${template.name}`}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditListNameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        value={renameValue}
        onChange={setRenameValue}
        onSave={handleRename}
        isPending={updateList.isPending}
        inputRef={renameInputRef}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Delete &ldquo;{deleteTarget?.name}&rdquo;? This can&rsquo;t be undone. Lists already
            created from it are not affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteList.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              aria-label="Confirm delete template"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
