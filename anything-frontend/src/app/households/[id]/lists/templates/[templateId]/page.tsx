"use client";

import { useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageTitle } from "@/components/PageTitle";
import { EditListNameDialog } from "@/components/EditListNameDialog";
import { useHeaderActions } from "@/context/PageActionsContext";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { useCurrentUser } from "@/hooks/useAuth";
import { canManageHousehold } from "@/lib/roles";
import { useShoppingList, useDeleteShoppingList } from "@/hooks/useShoppingLists";
import { useEditListNameDialog } from "@/hooks/useEditListNameDialog";
import { MoreVertical, SquarePen, Trash2 } from "lucide-react";
import { GeneralChecklistEditMode } from "@/app/lists/[id]/GeneralChecklistEditMode";
import { ShoppingListEditMode } from "@/app/shopping-lists/[id]/ShoppingListEditMode";

export default function TemplateDetailPage() {
  const { data: user } = useCurrentUser();
  const params = useParams();
  const router = useRouter();
  const householdId = typeof params.id === "string" ? params.id : "";
  const templateId = Number(params.templateId);
  const { getHouseholdRole, isLoading: householdsLoading } = useHouseholdContext();
  const { setHeaderActions, setLeftAction } = useHeaderActions();

  const { data: template } = useShoppingList(templateId);
  const deleteList = useDeleteShoppingList();

  const openEditNameDialogRef = useRef<() => void>(() => undefined);
  const handleDeleteRef = useRef<() => void>(() => undefined);
  const editNameDialog = useEditListNameDialog(templateId, template?.name, openEditNameDialogRef);

  const templatesHref = `/households/${householdId}/lists/templates`;
  const isGeneral = template?.type === 0;

  // No dependency array: keeps the closure fresh without adding unstable refs to the header effect deps.
  useEffect(() => {
    handleDeleteRef.current = async () => {
      try {
        await deleteList.mutateAsync(templateId);
        toast.success("Template deleted.");
        router.push(templatesHref);
      } catch {
        toast.error("Failed to delete template.");
      }
    };
  });

  useEffect(() => {
    setLeftAction({ type: "back", href: templatesHref });
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openEditNameDialogRef.current()}>
              <SquarePen className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
              onSelect={() => handleDeleteRef.current()}
            >
              <Trash2 className="h-4 w-4" />
              Delete template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [setHeaderActions, setLeftAction, templatesHref]);

  if (
    user &&
    !householdsLoading &&
    !canManageHousehold(getHouseholdRole(Number(householdId)))
  ) {
    router.push("/");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <EditListNameDialog
        open={editNameDialog.open}
        onOpenChange={editNameDialog.setOpen}
        value={editNameDialog.value}
        onChange={editNameDialog.setValue}
        onSave={editNameDialog.handleSave}
        isPending={editNameDialog.isPending}
        inputRef={editNameDialog.inputRef}
      />
      <PageTitle>{template?.name ?? "Template"}</PageTitle>
      {template &&
        (isGeneral ? (
          <GeneralChecklistEditMode listId={templateId} />
        ) : (
          <ShoppingListEditMode listId={templateId} />
        ))}
    </div>
  );
}
